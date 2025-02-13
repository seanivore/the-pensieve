#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, CreateMessageRequestSchema } from "@modelcontextprotocol/sdk";
import { parseKnowledgeInventory } from '../utils/inventory-parser.js';
import { RAGPipeline } from '../services/rag-pipeline.js';
import { KnowledgeProcessor } from '../services/knowledge-processor.js';
import { QdrantService } from '../services/qdrant-service.js';
// Get root path from args like filesystem MCP
const rootPath = process.argv[2];
if (!rootPath) {
    console.error("Error: Must provide root path for memory files");
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
// Initialize RAG pipeline and services
const pipeline = new RAGPipeline();
const knowledgeProcessor = new KnowledgeProcessor();
const qdrantService = new QdrantService();
// Create server with all needed capabilities
const server = new Server({
    name: "the-pensieve",
    version: "0.1.0",
}, {
    capabilities: {
        resources: {}, // For accessing memory files
        tools: {}, // For natural language interface
        sampling: {} // For LLM interactions
    },
});
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
// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
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
        ]
    };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "use_pensieve") {
        const question = String(request.params.arguments?.question);
        // 1. Use sampling to analyze the question
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
        // 2. Use analysis to query memories
        const results = await pipeline.semanticSearch(analysis.content.text);
        // 3. Use sampling to compose response
        const response = await server.request(CreateMessageRequestSchema, {
            messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Based on these memories:\n\n${results.map(r => `Memory (${r.score.toFixed(2)} relevance):\n${r.payload.full_text}\n`).join('\n')}\n\nAnswer the original question: "${question}"`
                    }
                }],
            systemPrompt: "You are the Pensieve, a magical device for examining memories and knowledge. Analyze this question to determine which memories to retrieve.",
            includeContext: "none"
        });
        return {
            response: response.content.text
        };
    }
});
