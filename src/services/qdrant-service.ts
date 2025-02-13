// =============================================================================
// Qdrant Vector Database Service
// =============================================================================
// This service manages our interaction with the Qdrant vector database, handling
// both dense embeddings (from OpenAI) and sparse vectors (from our BM25-style
// encoding) to enable hybrid search capabilities. It provides collection
// management, memory storage, and semantic search functionality.

import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import { SearchResult, SparseVector } from './rag-pipeline';

// Load environment variables
dotenv.config();

// =============================================================================
// Types
// =============================================================================

/**
 * Qdrant collection configuration options.
 */
interface CollectionConfig {
  vectors: {
    size: number;
    distance: 'Cosine' | 'Euclid' | 'Dot';
  };
  sparse_vectors: {
    [key: string]: Record<string, never>;
  };
}

/**
 * Qdrant payload schema definition.
 */
interface PayloadSchema {
  content_type: { type: 'keyword' };
  full_text: { type: 'text' };
  source: { type: 'keyword' };
  metadata: { type: 'object' };
}

/**
 * Memory point structure for Qdrant storage.
 */
interface MemoryPoint {
  id: number;
  vector: number[];
  sparse_vectors: {
    [key: string]: SparseVector;
  };
  payload: {
    content_type: string;
    full_text: string;
    source?: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Raw search result from Qdrant before processing.
 */
interface RawSearchResult {
  id: number;
  score: number;
  payload: {
    content_type: string;
    full_text: string;
    source?: string;
    metadata?: Record<string, unknown>;
  };
}

// =============================================================================
// Constants
// =============================================================================

// Collection configuration
const COLLECTION_NAME = 'pensieve_memories';   // Collection for storing knowledge vectors
const VECTOR_SIZE = 1536;                      // OpenAI ada-002 embedding dimensions
const SPARSE_VECTOR_NAME = 'text';             // Name for sparse vector field
const MIN_SCORE_THRESHOLD = 0.3;               // Minimum similarity score for matches

export class QdrantService {
  private client: QdrantClient;

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
  public async initializeCollection(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

      if (!exists) {
        // Create collection with hybrid vector configuration
        const config: CollectionConfig = {
          vectors: {                     // Dense vectors (OpenAI embeddings)
            size: VECTOR_SIZE,
            distance: 'Cosine'
          },
          sparse_vectors: {              // Sparse vectors (BM25-style)
            [SPARSE_VECTOR_NAME]: {}
          }
        };

        await this.client.createCollection(COLLECTION_NAME, config);

        // Set up payload schema for metadata
        const schema: PayloadSchema = {
          content_type: { type: 'keyword' },  // Type of memory
          full_text: { type: 'text' },        // Complete memory content
          source: { type: 'keyword' },        // Origin of memory
          metadata: { type: 'object' }        // Additional attributes
        };

        await this.client.updateCollection(COLLECTION_NAME, {
          params: {
            payload_schema: schema
          }
        });
      }
    } catch (error) {
      console.error('Error initializing collection:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Store a new memory in the vector database.
   * 
   * @param vector - Dense vector embedding
   * @param sparseVector - Sparse vector representation
   * @param payload - Memory metadata and content
   * @throws {Error} If storage operation fails
   */
  public async storeMemory(
    vector: number[],
    sparseVector: SparseVector,
    payload: MemoryPoint['payload']
  ): Promise<void> {
    try {
      const point: MemoryPoint = {
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
    } catch (error) {
      console.error('Error storing memory:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Search for similar memories using vector similarity.
   * 
   * @param queryVector - Query embedding to search with
   * @param filter - Optional filters to apply
   * @param limit - Maximum number of results
   * @returns Matching memories with similarity scores
   * @throws {Error} If search operation fails
   */
  public async findSimilarMemories(
    queryVector: number[],
    filter: Record<string, unknown> = {},
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      const results = await this.client.search<RawSearchResult>(COLLECTION_NAME, {
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
    } catch (error) {
      console.error('Error searching memories:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Remove a memory from the database.
   * 
   * @param memoryId - ID of memory to remove
   * @throws {Error} If deletion fails
   */
  public async removeMemory(memoryId: number | string): Promise<void> {
    try {
      await this.client.delete(COLLECTION_NAME, {
        points: [memoryId]
      });
    } catch (error) {
      console.error('Error removing memory:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Update metadata for an existing memory.
   * 
   * @param memoryId - ID of memory to update
   * @param metadata - New metadata to set
   * @throws {Error} If update fails
   */
  public async updateMemory(
    memoryId: number | string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.client.setPayload(COLLECTION_NAME, {
        payload: metadata,
        points: [memoryId]
      });
    } catch (error) {
      console.error('Error updating memory:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}
