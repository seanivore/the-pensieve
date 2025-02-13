// =============================================================================
// RAG Pipeline Implementation
// =============================================================================
// This is the core orchestrator for our Retrieval Augmented Generation system.
// It coordinates between the knowledge processor (for embedding generation and 
// text processing) and the vector database service (Qdrant) for storing and
// retrieving knowledge embeddings.

import { KnowledgeProcessor } from './knowledge-processor';
import { QdrantService } from './qdrant-service';

// =============================================================================
// Types
// =============================================================================

/**
 * Base structure for all knowledge items.
 */
export interface KnowledgeItem {
  type: string;
  content: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Structure of processed knowledge ready for storage.
 */
export interface ProcessedKnowledge {
  vector: number[];              // Dense embedding vector
  sparseVector: {               // Sparse vector representation
    indices: number[];
    values: number[];
  };
  payload: {
    content_type: string;       // Type of knowledge
    full_text: string;         // Full content
    source?: string;           // Origin source
    metadata?: Record<string, unknown>;  // Additional metadata
  };
}

/**
 * Structure of search results from the vector database.
 */
export interface SearchResult {
  score: number;               // Similarity score
  payload: {
    content_type: string;      // Type of content
    full_text: string;        // Complete content
    source?: string;          // Source reference
  };
}

/**
 * Optional filters for search operations.
 */
export interface SearchFilters {
  content_type?: string[];
  source?: string[];
  [key: string]: unknown;
}

export class RAGPipeline {
  private knowledgeProcessor: KnowledgeProcessor;
  private qdrantService: QdrantService;

  constructor() {
    this.knowledgeProcessor = new KnowledgeProcessor();
    this.qdrantService = new QdrantService();
  }

  /**
   * Initialize the RAG pipeline by setting up the vector database collection.
   * Must be called before any other operations.
   * 
   * @throws {Error} If initialization fails
   */
  public async initialize(): Promise<void> {
    await this.qdrantService.initializeCollection();
  }

  /**
   * Process and store multiple knowledge items in the vector database.
   * Each item is processed to generate embeddings and metadata, then stored in Qdrant.
   * 
   * @param knowledgeItems - Array of knowledge items to process
   * @returns Summary of processing results
   * @throws {Error} If processing completely fails
   */
  public async processAndStoreKnowledge(
    knowledgeItems: KnowledgeItem[]
  ): Promise<{ successCount: number; errorCount: number }> {
    console.log(`\nProcessing ${knowledgeItems.length} memories...`);
    console.log('Memory types:', knowledgeItems.map(item => item.type));

    let successCount = 0;
    let errorCount = 0;

    for (const item of knowledgeItems) {
      try {
        // Generate embeddings and process the memory
        const processedData = await this.knowledgeProcessor.processKnowledgeItem(item);

        // Store the processed data in Qdrant
        await this.qdrantService.storeMemory(
          processedData.vector,         // Dense vector embedding
          processedData.sparseVector,   // Sparse vector for hybrid search
          processedData.payload         // Metadata and content
        );

        successCount++;
        console.log(`✓ Successfully stored ${item.type} memory`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Error processing ${item.type} memory:`, error);
      }
    }

    // Log processing summary
    console.log(`\nProcessing complete:`);
    console.log(`- Successfully stored: ${successCount} memories`);
    console.log(`- Failed to process: ${errorCount} memories`);

    return { successCount, errorCount };
  }

  /**
   * Perform semantic search over stored memories using a natural language query.
   * 
   * @param query - Natural language search query
   * @param filters - Optional filters to apply to the search
   * @param limit - Maximum number of results to return
   * @returns Array of matching memories with relevance scores
   * @throws {Error} If search operation fails
   */
  public async semanticSearch(
    query: string,
    filters: SearchFilters = {},
    limit: number = 5
  ): Promise<SearchResult[]> {
    // Generate embedding for the search query
    const queryVector = await this.knowledgeProcessor.generateEmbedding(query);

    // Search for similar memories in Qdrant
    const results = await this.qdrantService.findSimilarMemories(
      queryVector,
      filters,
      limit
    );

    // Deduplicate results while preserving highest scoring versions
    const seen = new Map<string, number>(); // Tracks unique content by combining type and content
    const uniqueResults = results.filter(result => {
      const content = result.payload.full_text;
      const type = result.payload.content_type;
      const key = `${type}:${content}`;

      if (seen.has(key)) {
        // Keep the higher scoring version if we've seen this content before
        const prevScore = seen.get(key)!;
        if (result.score > prevScore) {
          seen.set(key, result.score);
          return true;
        }
        return false;
      }

      seen.set(key, result.score);
      return true;
    });

    return uniqueResults;
  }
}
