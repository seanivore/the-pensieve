// =============================================================================
// Qdrant Vector Database Service
// =============================================================================
// This service manages our interaction with the Qdrant vector database, handling
// both dense embeddings (from OpenAI) and sparse vectors (from our BM25-style
// encoding) to enable hybrid search capabilities. It provides collection
// management, memory storage, and semantic search functionality.

import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Collection configuration
const COLLECTION_NAME = 'pensieve_memories';   // Collection for storing knowledge vectors
const VECTOR_SIZE = 1536;                      // OpenAI ada-002 embedding dimensions
const SPARSE_VECTOR_NAME = 'text';             // Name for sparse vector field
const MIN_SCORE_THRESHOLD = 0.3;               // Minimum similarity score for matches

export class QdrantService {
  /**
   * Initialize Qdrant service with connection details from environment.
   * @throws {Error} If required environment variables are missing
   */
  constructor() {
    const url = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    if (!url || !apiKey) {
      throw new Error('QDRANT_URL and QDRANT_API_KEY must be set in environment');
    }

    this.client = new QdrantClient({
      url,
      apiKey
    });
  }

  /**
   * Initialize the vector collection for knowledge storage.
   * Creates collection if it doesn't exist, configuring both dense and sparse vectors.
   * 
   * @throws {Error} If collection initialization fails
   */
  async initializeCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

      if (!exists) {
        // Create collection with hybrid vector configuration
        await this.client.createCollection(COLLECTION_NAME, {
          vectors: {                     // Dense vectors (OpenAI embeddings)
            size: VECTOR_SIZE,
            distance: 'Cosine'
          },
          sparse_vectors: {              // Sparse vectors (BM25-style)
            [SPARSE_VECTOR_NAME]: {}
          }
        });

        // Set up payload schema for metadata
        await this.client.updateCollection(COLLECTION_NAME, {
          params: {
            payload_schema: {
              content_type: { type: 'keyword' },  // Type of memory
              full_text: { type: 'text' },        // Complete memory content
              source: { type: 'keyword' },        // Origin of memory
              metadata: { type: 'object' }        // Additional attributes
            }
          }
        });
      }
    } catch (err) {
      console.error('Error initializing collection:', err);
      throw err;
    }
  }

  /**
   * Store a new memory in the vector database.
   * 
   * @param {number[]} vector - Dense vector embedding
   * @param {{indices: number[], values: number[]}} sparseVector - Sparse vector representation
   * @param {Object} payload - Memory metadata and content
   * @throws {Error} If storage operation fails
   */
  async storeMemory(vector, sparseVector, payload) {
    try {
      const point = {
        id: Date.now() + Math.floor(Math.random() * 1000),  // Unique identifier
        vector,                    // Dense embedding
        sparse_vectors: {          // Sparse representation
          [SPARSE_VECTOR_NAME]: sparseVector
        },
        payload                    // Metadata and content
      };

      await this.client.upsert(COLLECTION_NAME, {
        points: [point]
      });

      console.log(`Stored memory with ID ${point.id}`);
    } catch (err) {
      console.error('Error storing memory:', err);
      throw err;
    }
  }

  /**
   * Search for similar memories using vector similarity.
   * 
   * @param {number[]} queryVector - Query embedding to search with
   * @param {Object} filter - Optional filters to apply
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array<{score: number, payload: Object}>>} Matching memories with similarity scores
   * @throws {Error} If search operation fails
   */
  async findSimilarMemories(queryVector, filter = {}, limit = 5) {
    try {
      const results = await this.client.search(COLLECTION_NAME, {
        vector: queryVector,
        filter,
        limit,
        score_threshold: MIN_SCORE_THRESHOLD,
        with_payload: true,           // Include memory content
        with_vectors: false           // Exclude vector data from results
      });

      // Process and format results
      return results
        .filter(result => result.score > MIN_SCORE_THRESHOLD)
        .map(result => ({
          score: result.score,
          payload: {
            full_text: result.payload.full_text,
            content_type: result.payload.content_type,
            source: result.payload.source
          }
        }));
    } catch (err) {
      console.error('Error searching memories:', err);
      throw err;
    }
  }

  /**
   * Remove a memory from the database.
   * 
   * @param {number|string} memoryId - ID of memory to remove
   * @throws {Error} If deletion fails
   */
  async removeMemory(memoryId) {
    try {
      await this.client.delete(COLLECTION_NAME, {
        points: [memoryId]
      });
    } catch (err) {
      console.error('Error removing memory:', err);
      throw err;
    }
  }

  /**
   * Update metadata for an existing memory.
   * 
   * @param {number|string} memoryId - ID of memory to update
   * @param {Object} metadata - New metadata to set
   * @throws {Error} If update fails
   */
  async updateMemory(memoryId, metadata) {
    try {
      await this.client.setPayload(COLLECTION_NAME, {
        payload: metadata,
        points: [memoryId]
      });
    } catch (err) {
      console.error('Error updating memory:', err);
      throw err;
    }
  }
}
