import OpenAI from 'openai';
export class KnowledgeProcessor {
    constructor() {
        // Get API key from environment
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY must be set in environment');
        }
        this.openai = new OpenAI({
            apiKey: apiKey
        });
    }
    /**
     * Generate sparse vector representation of text using BM25-style encoding
     */
    async generateSparseVector(text) {
        // Basic BM25-style sparse encoding
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2);
        // Count word frequencies
        const wordCounts = {};
        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
        // Convert to sparse vector format
        const indices = [];
        const values = [];
        Object.entries(wordCounts).forEach(([word, count], idx) => {
            indices.push(idx);
            // TF-IDF style weighting
            values.push(1 + Math.log(count));
        });
        return {
            indices,
            values
        };
    }
    /**
     * Process a knowledge item into vector format with metadata
     */
    async processKnowledgeItem(item) {
        console.log(`Processing item of type: ${item.type}`);
        // Generate both dense and sparse vectors
        const [embedding, sparseVec] = await Promise.all([
            this.generateEmbedding(item.content),
            this.generateSparseVector(item.content)
        ]);
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
    /**
     * Generate OpenAI embedding for text
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
            console.error('Error generating embedding:', error);
            throw error;
        }
    }
}
