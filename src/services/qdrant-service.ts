import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import { SearchResult } from '../types';

// Load environment variables
dotenv.config();

// Collection constants
const COLLECTION_NAME = 'pensieve_memories';  // Changed from portfolio_knowledge
const VECTOR_SIZE = 1536; // Using OpenAI ada-002 embedding dimensions
const SPARSE_VECTOR_NAME = 'text';

interface QdrantPoint {
    id: number;
    vector: number[];
    sparse_vectors: {
        [key: string]: {
            indices: number[];
            values: number[];
        };
    };
    payload: {
        content_type: string;
        full_text: string;
        source?: string;
        metadata?: Record<string, any>;
    };
}

export class QdrantService {
    private client: QdrantClient;

    constructor() {
        // Get connection details from environment
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
     * Initialize collection for knowledge storage. Creates if doesn't exist.
     */
    async initializeCollection(): Promise<void> {
        try {
            // Check if collection exists
            const collections = await this.client.getCollections();
            const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

            if (!exists) {
                // Create new collection with both dense and sparse vectors
                await this.client.createCollection(COLLECTION_NAME, {
                    vectors: {
                        size: VECTOR_SIZE,
                        distance: 'Cosine'
                    },
                    sparse_vectors: {
                        [SPARSE_VECTOR_NAME]: {} // Default config for sparse vector
                    }
                });

                // Add payload schema for metadata
                await this.client.updateCollection(COLLECTION_NAME, {
                    params: {
                        payload_schema: {
                            content_type: { type: 'keyword' },
                            full_text: { type: 'text' },
                            source: { type: 'keyword' },
                            metadata: { type: 'object' }
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
     * Add a new knowledge item to the collection
     */
    async storeMemory(
        vector: number[],
        sparseVector: { indices: number[]; values: number[] },
        payload: QdrantPoint['payload']
    ): Promise<void> {
        try {
            const point: QdrantPoint = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                vector,
                sparse_vectors: {
                    [SPARSE_VECTOR_NAME]: sparseVector
                },
                payload
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
     * Search for similar memories
     */
    async findSimilarMemories(
        queryVector: number[],
        filter: Record<string, any> = {},
        limit: number = 5
    ): Promise<SearchResult[]> {
        try {
            const results = await this.client.search(COLLECTION_NAME, {
                vector: queryVector,
                filter,
                limit,
                score_threshold: 0.3,
                with_payload: true,
                with_vectors: false
            });
            
            return results
                .filter(result => result.score > 0.3)
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
     * Remove a memory
     */
    async removeMemory(memoryId: number): Promise<void> {
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
     * Update an existing memory's metadata
     */
    async updateMemory(memoryId: number, metadata: Record<string, any>): Promise<void> {
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