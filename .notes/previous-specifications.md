}# Technical Specifications

## System Architecture

### Core Components

1. Content Processor
```typescript
interface ContentProcessor {
  chunkContent(content: string): DocumentChunk[]
  extractMetadata(content: string): Metadata
  validateContent(content: string): boolean
}
```

2. Vector Store Manager
```typescript
interface VectorStore {
  addVectors(chunks: DocumentChunk[]): Promise<void>
  searchVectors(query: string): Promise<SearchResult[]>
  updateVectors(updates: VectorUpdate[]): Promise<void>
}
```

3. Memory Manager
```typescript
interface MemoryManager {
  storeMemory(memory: Memory): Promise<void>
  retrieveMemories(context: string): Promise<Memory[]>
  updateMemory(id: string, update: Partial<Memory>): Promise<void>
}
```

### Data Models

1. Document Chunk
```typescript
interface DocumentChunk {
  id: string
  content: string
  metadata: Metadata
  embedding: number[]
  sourceType: string
  timestamp: Date
}
```

2. Memory Record
```typescript
interface Memory {
  id: string
  content: string
  context: string[]
  embedding: number[]
  timestamp: Date
  lastAccessed: Date
  relevanceScore: number
}
```

3. Search Result
```typescript
interface SearchResult {
  chunk: DocumentChunk
  score: number
  context: string[]
}
```

## Vector Storage

### Qdrant Configuration
```yaml
collections:
  documents:
    vectors:
      size: 1536  # OpenAI embedding size
      distance: Cosine
    payload:
      content: Text
      metadata: JSON
      sourceType: Keyword
      timestamp: DateTime
  
  memories:
    vectors:
      size: 1536
      distance: Cosine
    payload:
      content: Text
      context: Array[Text]
      timestamp: DateTime
      lastAccessed: DateTime
```

### Indexing Strategy
1. Document Processing
   - Chunk size: 512 tokens
   - Overlap: 50 tokens
   - Preserve paragraph boundaries
   - Maintain hierarchical context

2. Memory Processing
   - Dynamic chunk size based on content
   - Context preservation
   - Temporal relationship tracking

## API Design

### 1. Content Management
```typescript
async function addContent(content: string, type: string): Promise<void>
async function updateContent(id: string, content: string): Promise<void>
async function removeContent(id: string): Promise<void>
```

### 2. Memory Operations
```typescript
async function storeMemory(content: string, context: string[]): Promise<void>
async function retrieveMemories(query: string): Promise<Memory[]>
async function updateMemoryAccess(id: string): Promise<void>
```

### 3. Search Operations
```typescript
async function semanticSearch(query: string): Promise<SearchResult[]>
async function contextualSearch(query: string, context: string): Promise<SearchResult[]>
async function hybridSearch(query: string, filters: Filter[]): Promise<SearchResult[]>
```

## Integration Points

### 1. Document Processing
```javascript
// Example document processing
const processor = new ContentProcessor({
  chunkSize: 512,
  overlap: 50,
  preserveStructure: true
});

await processor.processDocument(document);
```

### 2. Memory Integration
```javascript
// Example memory storage
const memoryManager = new MemoryManager({
  vectorStore,
  contextWindow: 5
});

await memoryManager.storeMemory({
  content: "Important information",
  context: ["conversation-123", "topic-ai"]
});
```

### 3. Search Implementation
```javascript
// Example semantic search
const searcher = new SemanticSearcher({
  vectorStore,
  maxResults: 10,
  minScore: 0.75
});

const results = await searcher.search("query", {
  contextFilter: "project-x",
  timeRange: "1d"
});
```

## Performance Considerations

1. Embedding Generation
   - Batch size: 20 chunks
   - Rate limiting: 10 RPS
   - Cache frequently used embeddings

2. Vector Search
   - Default limit: 10 results
   - Score threshold: 0.75
   - Response time target: < 100ms

3. Memory Management
   - Cleanup interval: 24h
   - Cache size: 1000 items
   - LRU eviction policyAh, I see! We have two slightly different versions. The one in the root directory has more implementation details, while the one in docs/ has more architectural details. Let me combine them into a single comprehensive specification:View result from write_file from filesystem (local){
  `path`: `/Users/seanivore/Development/claude-remembers-you/SPECIFICATIONS.md`,
  `content`: `# Technical Specifications

## System Architecture

### Core Components

1. Knowledge Manager
```typescript
interface KnowledgeManager {
  addKnowledge(content: string, type: string): Promise<void>
  updateKnowledge(id: string, content: string): Promise<void>
  deleteKnowledge(id: string): Promise<void>
  getKnowledge(id: string): Promise<Knowledge>
}
```

2. Content Processor
```typescript
interface ContentProcessor {
  chunkContent(content: string): DocumentChunk[]
  extractMetadata(content: string): Metadata
  validateContent(content: string): boolean
  processCustomType(item: any): Promise<ProcessedContent>
}
```

3. Vector Store Manager
```typescript
interface VectorStore {
  addVectors(chunks: DocumentChunk[]): Promise<void>
  searchVectors(query: string): Promise<SearchResult[]>
  updateVectors(updates: VectorUpdate[]): Promise<void>
  deleteVectors(ids: string[]): Promise<void>
}
```

4. Memory Manager
```typescript
interface MemoryManager {
  storeMemory(memory: Memory): Promise<void>
  retrieveMemories(context: string): Promise<Memory[]>
  updateMemory(id: string, update: Partial<Memory>): Promise<void>
  deleteMemory(id: string): Promise<void>
}
```

## Data Models

### 1. Knowledge Entry
```typescript
interface Knowledge {
  id: string
  content: string
  type: string
  metadata: {
    created: Date
    updated: Date
    tags: string[]
    source: string
  }
  embedding: number[]
}
```

### 2. Document Chunk
```typescript
interface DocumentChunk {
  id: string
  content: string
  metadata: Metadata
  embedding: number[]
  sourceType: string
  timestamp: Date
}
```

### 3. Memory Record
```typescript
interface Memory {
  id: string
  content: string
  context: string[]
  embedding: number[]
  created: Date
  lastAccessed: Date
  relevanceScore: number
}
```

### 4. Search Result
```typescript
interface SearchResult {
  chunk: DocumentChunk
  score: number
  context: string[]
  metadata: any
}
```

## Knowledge Structure

### 1. Content Format
```markdown
# Knowledge Entry

## Content
[Your content here]

## Metadata
Type: [document/conversation/skill/etc]
Created: [timestamp]
Updated: [timestamp]
Tags: [tag1, tag2, ...]

## Relations
Links: [related-id-1, related-id-2, ...]
Context: [context-information]
```

### 2. Processing Pipeline
```javascript
class KnowledgeProcessor {
  // Core processing
  async processContent(content: string) {
    const chunks = this.chunkContent(content);
    const embeddings = await this.generateEmbeddings(chunks);
    const metadata = this.extractMetadata(content);
    return this.store(chunks, embeddings, metadata);
  }

  // Custom content types
  async processCustomType(item) {
    const parsed = this.parseCustomContent(item);
    return this.processContent(parsed);
  }
}
```

## Vector Storage Configuration

### 1. Qdrant Setup
```yaml
collections:
  knowledge:
    vectors:
      size: 1536  # OpenAI embedding size
      distance: Cosine
    payload:
      content: Text
      metadata: JSON
      type: Keyword
      timestamp: DateTime
  
  memories:
    vectors:
      size: 1536
      distance: Cosine
    payload:
      content: Text
      context: Array[Text]
      timestamp: DateTime
      lastAccessed: DateTime
```

### 2. Indexing Strategy
- Document Processing
  - Chunk size: 512 tokens
  - Overlap: 50 tokens
  - Preserve paragraph boundaries
  - Maintain hierarchical context

- Memory Processing
  - Dynamic chunk size based on content
  - Context preservation
  - Temporal relationship tracking

## API Design

### 1. Knowledge Operations
```typescript
async function addContent(content: string, type: string): Promise<void>
async function updateContent(id: string, content: string): Promise<void>
async function removeContent(id: string): Promise<void>
async function searchContent(query: string): Promise<SearchResult[]>
```

### 2. Memory Operations
```typescript
async function storeMemory(content: string, context: string[]): Promise<void>
async function retrieveMemories(query: string): Promise<Memory[]>
async function updateMemoryAccess(id: string): Promise<void>
```

### 3. Search Operations
```typescript
async function semanticSearch(query: string): Promise<SearchResult[]>
async function contextualSearch(query: string, context: string): Promise<SearchResult[]>
async function hybridSearch(query: string, filters: Filter[]): Promise<SearchResult[]>
```

## Integration Patterns

### 1. Basic Usage
```javascript
const knowledge = new KnowledgeManager({
  vectorStore,
  processor
});

await knowledge.add({
  content: \"Important information\",
  type: \"document\",
  metadata: {
    tags: [\"important\", \"reference\"]
  }
});
```

### 2. Memory Integration
```javascript
const memory = new MemoryManager({
  vectorStore,
  contextWindow: 5
});

await memory.store({
  content: \"User preference\",
  context: [\"settings\", \"user-123\"]
});
```

### 3. Search Implementation
```javascript
const searcher = new Searcher({
  vectorStore,
  maxResults: 10,
  minScore: 0.75
});

const results = await searcher.search(\"query\", {
  type: \"knowledge\",
  timeRange: \"1d\"
});
```

## Performance Considerations

### 1. Content Processing
- Chunk size: 512 tokens
- Overlap: 50 tokens
- Batch size: 20 chunks
- Rate limit: 10 RPS

### 2. Vector Search
- Default limit: 10 results
- Score threshold: 0.75
- Response time: < 100ms

### 3. Memory Management
- Cache size: 1000 items
- Cleanup interval: 24h
- LRU eviction policy

### 4. Resource Usage
- Embedding caching
- Request batching
- Connection pooling

## Environment Setup

Required tools and versions:
- Node.js 18+
- OpenAI API access
- Qdrant instance (local or cloud)

```env
# Required Environment Variables
OPENAI_API_KEY=your_key
QDRANT_URL=your_url
QDRANT_API_KEY=your_key
````
}Successfully wrote to /Users/seanivore/Development/claude-remembers-you/SPECIFICATIONS.mdI've:

Combined the architectural details from docs/SPECIFICATIONS.md
Kept the implementation details from the root SPECIFICATIONS.md
Organized everything in a logical flow from architecture → implementation
Added some missing pieces that were in one but not the other

Now we can delete the docs/SPECIFICATIONS.md since everything is in one place. Would you like me to do that?