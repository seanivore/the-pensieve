# The Pensieve MCP Server

One simply siphons the excess thoughts from one's mind, pours them into the basin, and examines them at one's leisure. It becomes easier to spot patterns and links, you understand, when they are in this form.

This is a TypeScript-based MCP server that implements a RAG-based knowledge management system. It demonstrates core MCP concepts by providing:

- Resources representing stored knowledge with URIs and metadata
- Natural language interface for querying knowledge
- LLM-powered analysis and response synthesis

## Features

### Resources
- Access knowledge via `memory://` URIs
- Markdown files containing structured knowledge
- Metadata for categorization and retrieval

### Tools
- `ask_pensieve` - Query your stored knowledge
  - Takes natural language questions
  - Uses LLM to analyze and retrieve relevant information
  - Provides contextual answers based on stored knowledge

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Knowledge Organization

Store your knowledge as markdown files in the root directory:
1. Use clear categories in filenames (e.g., `skills-javascript.md`)
2. One topic per file
3. Include relevant metadata (dates, sources, etc.)
4. Use clear, well-structured content

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "The Pensieve": {
      "command": "/path/to/The Pensieve/build/index.js"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

async function handleQuestion(question: string) {
  // 1. Analyze question
  const analysis = await server.request(SamplingCreateMessageRequestSchema, {
    messages: [{
      role: "user",
      content: { type: "text", text: question }
    }],
    systemPrompt: "You are the Pensieve. Analyze questions to determine what knowledge to retrieve.",
    includeContext: "none"
  });

  // 2. Use existing RAG query (from our working code)
  const results = await ragPipeline.semanticSearch(analysis.content.text);

  // 3. Compose response
  const response = await server.request(SamplingCreateMessageRequestSchema, {
    messages: [{
      role: "user",
      content: { 
        type: "text", 
        text: `Answer using this knowledge: ${results.map(r => r.payload.full_text).join('\n')}`
      }
    }],
    systemPrompt: "You are the Pensieve. Provide clear answers based on stored knowledge.",
    includeContext: "none"
  });

  return response.content.text;
}

const documentGuide = `To prepare documents for the Pensieve:
1. Place files in the root directory
2. Use clear categories in filenames (e.g., skills-javascript.md)
3. One topic per file
4. Clear, well-structured content
5. Include relevant metadata (dates, sources, etc.)`;

{
  uri: "memory://knowledge/skills-javascript.md",
  mimeType: "text/markdown",  // Since we're using markdown files
  name: "JavaScript Skills",
  description: "Knowledge about JavaScript development"
}
