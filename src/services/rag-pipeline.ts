import { KnowledgeProcessor } from './knowledge-processor.js';
import { QdrantService } from './qdrant-service.js';
import { ProcessedData, KnowledgeItem, SearchResult } from '../types.js';

export class RAGPipeline {
  private knowledgeProcessor: KnowledgeProcessor;
  private qdrantService: QdrantService;

  constructor() {
    this.knowledgeProcessor = new KnowledgeProcessor();
    this.qdrantService = new QdrantService();
  }

  async initialize(): Promise<void> {
    await this.qdrantService.initializeCollection();
  }

  async processAndStoreKnowledge(knowledgeItems: KnowledgeItem[]): Promise<void> {
    console.log(`\nProcessing ${knowledgeItems.length} memories...`);
    console.log('Memory types:', knowledgeItems.map(item => item.type));
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of knowledgeItems) {
      try {
        // Process the memory
        const processedData = await this.knowledgeProcessor.processKnowledgeItem(item);
        
        // Store in Qdrant
        await this.qdrantService.storeMemory(
          processedData.vector,
          processedData.sparseVector,
          processedData.payload
        );
        
        successCount++;
        console.log(`✓ Successfully stored ${item.type} memory`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Error processing ${item.type} memory:`, error);
      }
    }
    
    console.log(`\nProcessing complete:`);
    console.log(`- Successfully stored: ${successCount} memories`);
    console.log(`- Failed to process: ${errorCount} memories`);
  }

  async semanticSearch(
    query: string, 
    filters: Record<string, any> = {}, 
    limit: number = 5
  ): Promise<SearchResult[]> {
    const queryVector = await this.knowledgeProcessor.generateEmbedding(query);
    const results = await this.qdrantService.findSimilarMemories(queryVector, filters, limit);
    
    // Filter out duplicates based on content and type
    const seen = new Map<string, number>(); // Use Map to track both content and scores
    const uniqueResults = results.filter(result => {
      const content = result.payload.full_text;
      const type = result.payload.content_type;
      const key = `${type}:${content}`;
      
      if (seen.has(key)) {
        // If we've seen this content before, keep the higher scoring one
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