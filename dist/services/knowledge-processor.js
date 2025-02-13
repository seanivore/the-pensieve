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
   * @param {string} text - Input text to encode
   * @returns {Promise<{indices: number[], values: number[]}>} Sparse vector representation
   */
  async generateSparseVector(text) {
    // Tokenize and clean text
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')    // Remove punctuation
      .split(/\s+/)               // Split on whitespace
      .filter(word => word.length > 2);  // Remove very short words

    // Calculate word frequencies (term frequency component of BM25)
    const wordCounts = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Convert to sparse vector format with TF-IDF style weighting
    const indices = [];
    const values = [];
    Object.entries(wordCounts).forEach(([word, count], idx) => {
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
   * @param {string} text - Text to generate embedding for
   * @returns {Promise<number[]>} Dense vector embedding
   * @throws {Error} If embedding generation fails
   */
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Process a knowledge item into vector formats with metadata.
   * Generates both dense and sparse vector representations for hybrid search.
   * 
   * @param {Object} item - Knowledge item to process
   * @param {string} item.type - Type of knowledge (e.g., 'skill', 'experience')
   * @param {string} item.content - Text content to process
   * @param {string} [item.source] - Source of the knowledge item
   * @param {Object} [item.metadata] - Additional metadata
   * @returns {Promise<{
   *   vector: number[],
   *   sparseVector: {indices: number[], values: number[]},
   *   payload: {
   *     content_type: string,
   *     full_text: string,
   *     source?: string,
   *     metadata?: Object
   *   }
   * }>}
   */
  async processKnowledgeItem(item) {
    console.log(`Processing item of type: ${item.type}`);

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
}
