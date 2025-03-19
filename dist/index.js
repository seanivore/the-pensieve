#!/usr/bin/env node
// =============================================================================
// Main MCP Server Implementation - The Pensieve
// =============================================================================
// This is the primary server implementation combining our RAG (Retrieval Augmented
// Generation) system with the Model Context Protocol. It provides tools for
// processing, storing, and querying knowledge using vector embeddings and semantic
// search.
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, CreateMessageRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
// Core RAG System Components
import { RAGPipeline } from "./services/rag-pipeline.js";
import { parseKnowledgeInventory } from "./utils/inventory-parser.js";
import { KnowledgeProcessor } from "./services/knowledge-processor.js";
import { QdrantService } from "./services/qdrant-service.js";
// =============================================================================
// Configuration and Environment Setup
// =============================================================================
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
    console.error("Error: OpenAI API key, Qdrant URL and API key must be provided");
    process.exit(1);
}
// Set up environment for RAG system
process.env.OPENAI_API_KEY = openaiKey;
process.env.QDRANT_URL = qdrantUrl;
process.env.QDRANT_API_KEY = qdrantKey;
// Initialize core components
const pipeline = new RAGPipeline();
const knowledgeProcessor = new KnowledgeProcessor();
const qdrantService = new QdrantService();
// =============================================================================
// Server Configuration
// =============================================================================
// Create server with comprehensive capabilities
const server = new Server({
    name: "The Pensieve",
    version: "0.1.0",
}, {
    capabilities: {
        resources: {}, // For accessing memory files
        tools: {}, // For knowledge operations
        sampling: {}, // For LLM interactions
    },
});
// =============================================================================
// Resource Handlers
// =============================================================================
// List available memory resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const memories = await parseKnowledgeInventory();
    return {
        resources: memories.map(memory => ({
            uri: `memory://${memory.type}/${memory.source || 'generated'}`,
            mimeType: "text/markdown",
            name: memory.metadata?.title || memory.type,
            description: memory.metadata?.description || `A ${memory.type} memory`
        }))
    };
});
// Read specific memory resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const url = new URL(request.params.uri);
    const memories = await parseKnowledgeInventory();
    const memory = memories.find(m => `memory://${m.type}/${m.source || 'generated'}` === request.params.uri);
    if (!memory) {
        throw new Error(`Memory ${request.params.uri} not found`);
    }
    return {
        contents: [{
                uri: request.params.uri,
                mimeType: "text/markdown",
                text: memory.content
            }]
    };
});
// =============================================================================
// Tool Handlers
// =============================================================================
// List available tools
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
            {
                name: "use_pensieve",
                description: "Examine your stored memories and knowledge, allowing patterns and connections to emerge",
                inputSchema: {
                    type: "object",
                    properties: {
                        question: {
                            type: "string",
                            description: "What would you like to examine in your stored knowledge?"
                        }
                    },
                    required: ["question"]
                }
            }
        ],
    };
});
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case "process_knowledge": {
            try {
                await pipeline.initialize();
                console.log("Parsing knowledge inventory...");
                const inventoryData = await parseKnowledgeInventory();
                console.log(`Parsed ${inventoryData.length} inventory items`);
                await pipeline.processAndStoreKnowledge(inventoryData);
                return {
                    content: [
                        {
                            type: "text",
                            text: "Successfully processed knowledge base",
                        },
                    ],
                };
            }
            catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Error processing knowledge: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        }
        case "query_knowledge": {
            const query = String(request.params.arguments?.query);
            const maxResults = Number(request.params.arguments?.maxResults) || 5;
            try {
                await pipeline.initialize();
                console.log(`Searching for: "${query}"`);
                const results = await pipeline.semanticSearch(query, {}, maxResults);
                const formattedResults = results
                    .map((result, i) => {
                    const preview = result.payload.full_text.substring(0, 200);
                    return (`Result ${i + 1}:\n` +
                        `Score: ${result.score.toFixed(3)}\n` +
                        `Type: ${result.payload.content_type}\n` +
                        `Preview: ${preview}...\n` +
                        (result.payload.source
                            ? `Source: ${result.payload.source}\n`
                            : "") +
                        "\n");
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
            }
            catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Error executing query: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        }
        case "process_markdown": {
            const content = String(request.params.arguments?.content);
            try {
                await pipeline.initialize();
                const markdownItem = {
                    type: "markdown",
                    content: content,
                    source: "direct-input",
                };
                await pipeline.processAndStoreKnowledge([markdownItem]);
                return {
                    content: [
                        {
                            type: "text",
                            text: "Successfully processed markdown content",
                        },
                    ],
                };
            }
            catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Error processing markdown: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        }
        case "generate_markdown": {
            const { topic, filename } = request.params.arguments;
            const filePath = path.join(rootPath, `${filename}.md`);
            try {
                const topicVector = await knowledgeProcessor.generateEmbedding(topic);
                const related = await qdrantService.findSimilarMemories(topicVector, {}, 3);
                const content = `# ${topic}\n\n` +
                    `Generated content incorporating ${related.length} related concepts...\n\n` +
                    related.map((r) => `Related: ${r.payload.content_type}\n`).join("\n");
                fs.writeFileSync(filePath, content);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Generated markdown saved to ${filename}.md`,
                        },
                    ],
                };
            }
            catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Error generating markdown: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        }
        case "use_pensieve": {
            const question = String(request.params.arguments?.question);
            try {
                const analysis = await server.request(CreateMessageRequestSchema, {
                    messages: [{
                            role: "user",
                            content: {
                                type: "text",
                                text: question
                            }
                        }],
                    systemPrompt: "You are the Pensieve, a magical device for examining memories and knowledge. Analyze this question to determine which memories to retrieve.",
                    includeContext: "none"
                });
                const results = await pipeline.semanticSearch(analysis.content.text);
                const response = await server.request(CreateMessageRequestSchema, {
                    messages: [{
                            role: "user",
                            content: {
                                type: "text",
                                text: `Based on these memories:\n\n${results.map(r => `Memory (${r.score.toFixed(2)} relevance):\n${r.payload.full_text}\n`).join('\n')}\n\nAnswer the original question: "${question}"`
                            }
                        }],
                    systemPrompt: "You are the Pensieve, a magical device for examining memories and knowledge. Provide insights based on the available memories.",
                    includeContext: "none"
                });
                return {
                    content: [{
                            type: "text",
                            text: response.content.text
                        }]
                };
            }
            catch (error) {
                return {
                    isError: true,
                    content: [{
                            type: "text",
                            text: `Error using pensieve: ${error instanceof Error ? error.message : String(error)}`
                        }]
                };
            }
        }
        default:
            throw new Error("Unknown tool");
    }
});
// =============================================================================
// Server Startup
// =============================================================================
// Start server with stdio transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
