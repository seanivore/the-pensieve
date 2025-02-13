#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

// Import RAG system
import RAGPipeline from "./services/rag-pipeline.js";
import { parseKnowledgeInventory } from "./utils/inventory-parser.js";
import KnowledgeProcessor from "./services/knowledge-processor.js";
import QdrantService from "./services/qdrant-service.js";

// Get root path from args like filesystem MCP
const rootPath = process.argv[2];
if (!rootPath) {
  console.error("Error: Must provide root path for knowledge files");
  process.exit(1);
}

// Get API keys from args
const openaiKey = process.argv[3];
const qdrantUrl = process.argv[4];
const qdrantKey = process.argv[5];

if (!openaiKey || !qdrantUrl || !qdrantKey) {
  console.error(
    "Error: OpenAI API key, Qdrant URL and API key must be provided"
  );
  process.exit(1);
}

// Set up environment for RAG system
process.env.OPENAI_API_KEY = openaiKey;
process.env.QDRANT_URL = qdrantUrl;
process.env.QDRANT_API_KEY = qdrantKey;

// Initialize RAG pipeline
const pipeline = new RAGPipeline();
const knowledgeProcessor = new KnowledgeProcessor();
const qdrantService = new QdrantService();

// Create server with tools capability
const server = new Server(
  {
    name: "The Pensieve",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Expose our tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "process_knowledge",
        description: "Process knowledge files from root directory",
        inputSchema: {
          type: "object",
          properties: {
            force: {
              type: "boolean",
              description: "Force reprocessing of already processed files",
            },
          },
        },
      },
      {
        name: "query_knowledge",
        description: "Query the processed knowledge using RAG",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The query to run against the knowledge base",
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "process_markdown",
        description: "Process a single markdown file directly",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "Markdown content to process",
            },
          },
          required: ["content"],
        },
      },
      {
        name: "generate_markdown",
        description: "Generate a new markdown document",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Topic to write about",
            },
            filename: {
              type: "string",
              description: "Name for the generated file (without .md)",
            },
          },
          required: ["topic", "filename"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "process_knowledge": {
      try {
        // Initialize pipeline
        await pipeline.initialize();

        // Parse knowledge inventory
        console.log("Parsing knowledge inventory...");
        const inventoryData = await parseKnowledgeInventory();
        console.log(`Parsed ${inventoryData.length} inventory items`);

        // Process and store all knowledge
        console.log("Processing and storing knowledge...");
        await pipeline.processAndStoreKnowledge(inventoryData);

        return {
          content: [
            {
              type: "text",
              text: "Successfully processed knowledge base",
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error processing knowledge: ${error.message}`,
            },
          ],
        };
      }
    }

    case "query_knowledge": {
      const query = String(request.params.arguments?.query);
      const maxResults = Number(request.params.arguments?.maxResults) || 5;

      try {
        // Initialize if needed
        await pipeline.initialize();

        // Run semantic search
        console.log(`Searching for: "${query}"`);
        const results = await pipeline.semanticSearch(query, {}, maxResults);

        // Format results like test-search.js
        const formattedResults = results
          .map((result, i) => {
            const preview = result.payload.full_text.substring(0, 200);
            return (
              `Result ${i + 1}:\n` +
              `Score: ${result.score.toFixed(3)}\n` +
              `Type: ${result.payload.content_type}\n` +
              `Preview: ${preview}...\n` +
              (result.payload.source
                ? `Source: ${result.payload.source}\n`
                : "") +
              "\n"
            );
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: formattedResults,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error executing query: ${error.message}`,
            },
          ],
        };
      }
    }

    case "process_markdown": {
      const content = String(request.params.arguments?.content);

      try {
        // Initialize if needed
        await pipeline.initialize();

        // Create a knowledge item for processing
        const markdownItem = {
          type: "markdown",
          content: content,
          source: "direct-input",
        };

        // Process using the pipeline
        await pipeline.processAndStoreKnowledge([markdownItem]);

        return {
          content: [
            {
              type: "text",
              text: "Successfully processed markdown content",
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error processing markdown: ${error.message}`,
            },
          ],
        };
      }
    }

    case "generate_markdown": {
      const { topic, filename } = request.params.arguments;
      const filePath = path.join(rootPath, `${filename}.md`);

      try {
        // Get topic vector using knowledge processor
        const topicVector = await knowledgeProcessor.generateEmbedding(topic);

        // Find related knowledge
        const related = await qdrantService.searchSimilar(topicVector, {}, 3);

        // Generate content using related knowledge
        const content =
          `# ${topic}\n\n` +
          `Generated content incorporating ${related.length} related concepts...\n\n` +
          related.map((r) => `Related: ${r.payload.content_type}\n`).join("\n");

        // Save to file
        fs.writeFileSync(filePath, content);

        return {
          content: [
            {
              type: "text",
              text: `Generated markdown saved to ${filename}.md`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error generating markdown: ${error.message}`,
            },
          ],
        };
      }
    }

    default:
      throw new Error("Unknown tool");
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});