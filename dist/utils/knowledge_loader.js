import { readFile, readdir } from 'fs/promises';
import path from 'path';
import matter from 'gray-matter'; // For frontmatter parsing
export class KnowledgeLoader {
    constructor(rootPath) {
        this.knowledgeDir = path.join(rootPath, 'knowledge');
    }
    /**
     * List all knowledge files as MCP resources
     */
    async listKnowledgeResources() {
        const files = await readdir(this.knowledgeDir);
        return files
            .filter(file => file.endsWith('.md'))
            .map(file => ({
            uri: `memory://knowledge/${file}`,
            mimeType: "text/markdown",
            name: this.formatName(file),
            description: `Knowledge about ${this.formatName(file)}`
        }));
    }
    /**
     * Read and parse a specific knowledge file
     */
    async readKnowledgeFile(uri) {
        // Extract filename from URI
        const filename = uri.replace('memory://knowledge/', '');
        const filepath = path.join(this.knowledgeDir, filename);
        // Read and parse file
        const fileContent = await readFile(filepath, 'utf8');
        const { data: metadata, content } = matter(fileContent);
        return {
            uri,
            name: this.formatName(filename),
            description: metadata.description || `Knowledge about ${this.formatName(filename)}`,
            content: content.trim(),
            metadata
        };
    }
    /**
     * Format filename into readable name
     * e.g., "skills-javascript.md" -> "JavaScript Skills"
     */
    formatName(filename) {
        return filename
            .replace('.md', '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
// Export singleton instance
export const knowledgeLoader = new KnowledgeLoader(process.cwd());
