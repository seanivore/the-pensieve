// =============================================================================
// RAG Pipeline Implementation
// =============================================================================
// This is the core orchestrator for our Retrieval Augmented Generation system.
// It coordinates between the knowledge processor (for embedding generation and 
// text processing) and the vector database service (Qdrant) for storing and
// retrieving knowledge embeddings.

import { KnowledgeProcessor } from './knowledge-processor.js';
import { QdrantService } from './qdrant-service.js';

export class RAGPipeline {
  constructor() {
    this.knowledgeProcessor = new KnowledgeProcessor();
    this.qdrantService = new QdrantService();
  }

  /**
   * Initialize the RAG pipeline by setting up the vector database collection.
   * Must be called before any other operations.
   */
  async initialize() {
    await this.qdrantService.initializeCollection();
  }

  /**
   * Process and store multiple knowledge items in the vector database.
   * Each item is processed to generate embeddings and metadata, then stored in Qdrant.
   * 
   * @param {Array<KnowledgeItem>} knowledgeItems - Array of knowledge items to process
   * @returns {Promise<void>}
   */
  async processAndStoreKnowledge(knowledgeItems) {
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
  }

  /**
   * Perform semantic search over stored memories using a natural language query.
   * 
   * @param {string} query - Natural language search query
   * @param {Object} filters - Optional filters to apply to the search
   * @param {number} limit - Maximum number of results to return
   * @returns {Promise<Array<SearchResult>>} Array of matching memories with relevance scores
   */
  async semanticSearch(query, filters = {}, limit = 5) {
    // Generate embedding for the search query
    const queryVector = await this.knowledgeProcessor.generateEmbedding(query);

    // Search for similar memories in Qdrant
    const results = await this.qdrantService.findSimilarMemories(
      queryVector,
      filters,
      limit
    );

    // Deduplicate results while preserving highest scoring versions
    const seen = new Map(); // Tracks unique content by combining type and content
    const uniqueResults = results.filter(result => {
      const content = result.payload.full_text;
      const type = result.payload.content_type;
      const key = `${type}:${content}`;

      if (seen.has(key)) {
        // Keep the higher scoring version if we've seen this content before
        const prevScore = seen.get(key);
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
