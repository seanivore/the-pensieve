import { readFile } from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { KnowledgeItem } from '../types.js';

interface FileContent {
    content: string;
    metadata: Record<string, any>;
}

async function readFileContent(filePath: string): Promise<FileContent | null> {
    try {
        // Clean the path of brackets and normalize for OS
        const cleanPath = filePath.replace(/[\[\]]/g, '').trim();
        // Handle both absolute and relative paths
        const resolvedPath = path.isAbsolute(cleanPath) 
            ? cleanPath 
            : path.join(process.cwd(), cleanPath);
            
        console.log(`Attempting to read: ${resolvedPath}`);
        const fileContent = await readFile(resolvedPath, 'utf8');
        
        // Parse frontmatter
        const { data: metadata, content } = matter(fileContent);
        
        return { content: content.trim(), metadata };
    } catch (err) {
        console.error(`Could not read file ${filePath}:`, err);
        return null;
    }
}

function extractSection(content: string, sectionName: string): string {
    const sectionRegex = new RegExp(`### ${sectionName}[\\s\\S]*?(?=###|$)`);
    const match = content.match(sectionRegex);
    return match ? match[0] : '';
}

export async function parseKnowledgeInventory(): Promise<KnowledgeItem[]> {
    const inventoryPath = path.join(process.cwd(), 'memories/INVENTORY.md');
    console.log('Reading memory inventory from:', inventoryPath);
    
    const content = await readFile(inventoryPath, 'utf8');
    console.log('Successfully read inventory file');
    
    const memories: KnowledgeItem[] = [];

    // Process Core Memories section
    const coreSection = extractSection(content, 'Core Memories');
    
    // Extract markdown files
    const markdownFiles = coreSection.match(/\[.*?\.md\]/g) || [];
    for (const filePath of markdownFiles) {
        const result = await readFileContent(filePath);
        if (result) {
            console.log(`Successfully read memory file: ${filePath}`);
            memories.push({
                type: 'memory',
                content: result.content,
                source: filePath.replace(/[\[\]]/g, ''),
                metadata: result.metadata
            });
        } else {
            console.log(`Failed to read memory file: ${filePath}`);
        }
    }

    // Extract topics
    const topics = (coreSection.match(/> ([^\n]+)/g) || [])
        .map(topic => topic.replace('> ', '').trim())
        .filter(topic => !topic.match(/\[.*\.md\]/));

    if (topics.length > 0) {
        memories.push({
            type: 'topics',
            content: topics.join('\n'),
            metadata: { topics }
        });
    }

    // Extract categories
    const categories = content.match(/- [A-Za-z]+/g) || [];
    const memoryCategories = categories
        .map(cat => cat.replace('- ', ''))
        .filter(cat => cat.length > 0);

    if (memoryCategories.length > 0) {
        memories.push({
            type: 'categories',
            content: memoryCategories.join('\n'),
            metadata: { categories: memoryCategories }
        });
    }

    return memories;
} 