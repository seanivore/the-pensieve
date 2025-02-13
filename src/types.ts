export interface ProcessedData {
    vector: number[];
    sparseVector: {
        indices: number[];
        values: number[];
    };
    payload: {
        content_type: string;
        full_text: string;
        source?: string;
        metadata?: Record<string, any>;
    };
}

export interface KnowledgeItem {
    type: string;
    content: string;
    source?: string;
    metadata?: Record<string, any>;
}

export interface SearchResult {
    score: number;
    payload: {
        full_text: string;
        content_type: string;
        source?: string;
    };
} 