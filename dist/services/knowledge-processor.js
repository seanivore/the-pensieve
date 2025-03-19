// =============================================================================
// Knowledge Processor Implementation
// =============================================================================
// This service handles the processing of knowledge items into vector representations
// for semantic search. It generates both dense vectors (using OpenAI embeddings) and
// sparse vectors (using a BM25-style encoding) to support hybrid search capabilities.
// The combination allows for both semantic similarity and keyword-based matching.
import OpenAI from 'openai';
export class KnowledgeProcessor {
    /**
     * Initialize the knowledge processor with OpenAI credentials.
     * @throws {Error} If OPENAI_API_KEY is not set in environment
     */
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY must be set in environment');
        }
        this.openai = new OpenAI({
            apiKey: apiKey
        });
    }
    /**
     * Generate sparse vector representation of text using BM25-style encoding.
     * This provides keyword-based search capabilities complementing dense embeddings.
     *
     * @param text - Input text to encode
     * @returns Sparse vector representation
     */
    async generateSparseVector(text) {
        // Tokenize and clean text
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/) // Split on whitespace
            .filter(word => word.length > 2); // Remove very short words
        // Calculate word frequencies (term frequency component of BM25)
        const wordCounts = {};
        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
        // Convert to sparse vector format with TF-IDF style weighting
        const indices = [];
        const values = [];
        Object.entries(wordCounts).forEach(([_word, count], idx) => {
            indices.push(idx);
            // Log-normalized term frequency (1 + ln(tf))
            values.push(1 + Math.log(count));
        });
        return {
            indices,
            values
        };
    }
    /**
     * Generate an embedding vector using OpenAI's text-embedding-ada-002 model.
     *
     * @param text - Text to generate embedding for
     * @returns Dense vector embedding
     * @throws {Error} If embedding generation fails
     */
    async generateEmbedding(text) {
        try {
            const response = await this.openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: text
            });
            return response.data[0].embedding;
        }
        catch (error) {
            console.error('Error generating embedding:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }
    /**
     * Process a knowledge item into vector formats with metadata.
     * Generates both dense and sparse vector representations for hybrid search.
     *
     * @param item - Knowledge item to process
     * @returns Processed knowledge with vector representations and metadata
     * @throws {Error} If processing fails
     */
    async processKnowledgeItem(item) {
        console.log(`Processing item of type: ${item.type}`);
        try {
            // Generate both vector representations in parallel
            const [embedding, sparseVec] = await Promise.all([
                this.generateEmbedding(item.content),
                this.generateSparseVector(item.content)
            ]);
            // Return processed item with all vector representations and metadata
            return {
                vector: embedding,
                sparseVector: sparseVec,
                payload: {
                    content_type: item.type,
                    full_text: item.content,
                    source: item.source,
                    metadata: item.metadata
                }
            };
        }
        catch (error) {
            console.error('Error processing knowledge item:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }
}
