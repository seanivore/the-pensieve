// =============================================================================
// Knowledge File Loader
// =============================================================================
// This utility handles loading and parsing of markdown knowledge files from the
// knowledge directory. It provides:
// - MCP resource listing of knowledge files
// - File content loading with metadata extraction
// - Consistent naming and formatting
// This complements the inventory parser by handling direct file access.
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
export class KnowledgeLoader {
    /**
     * Initialize loader with root directory path.
     * @param rootPath - Root directory containing knowledge files
     */
    constructor(rootPath) {
        this.knowledgeDir = path.join(rootPath, 'knowledge');
    }
    /**
     * List all knowledge files as MCP resources.
     *
     * @returns Array of MCP resource descriptions
     */
    async listKnowledgeResources() {
        try {
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
        catch (error) {
            console.error('Error listing knowledge resources:', error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }
    /**
     * Read and parse a specific knowledge file.
     *
     * @param uri - URI of the knowledge file to read
     * @returns Parsed file content and metadata
     * @throws {Error} If file cannot be read or parsed
     */
    async readKnowledgeFile(uri) {
        try {
            // Extract filename from URI
            const filename = uri.replace('memory://knowledge/', '');
            const filepath = path.join(this.knowledgeDir, filename);
            // Read and parse file with frontmatter
            const fileContent = await readFile(filepath, 'utf8');
            const { data: metadata, content } = matter(fileContent);
            return {
                uri,
                name: this.formatName(filename),
                description: metadata.description ||
                    `Knowledge about ${this.formatName(filename)}`,
                content: content.trim(),
                metadata: metadata
            };
        }
        catch (error) {
            console.error(`Error reading knowledge file ${uri}:`, error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }
    /**
     * Convert a loaded knowledge file to a KnowledgeItem format.
     *
     * @param loaded - Loaded knowledge file data
     * @returns Formatted knowledge item
     */
    toKnowledgeItem(loaded) {
        return {
            type: 'knowledge',
            content: loaded.content,
            source: loaded.uri.replace('memory://knowledge/', ''),
            metadata: {
                ...loaded.metadata,
                title: loaded.name,
                description: loaded.description
            }
        };
    }
    /**
     * Format a filename into a readable name.
     * Example: "skills-javascript.md" -> "JavaScript Skills"
     *
     * @param filename - Filename to format
     * @returns Formatted name
     */
    formatName(filename) {
        return filename
            .replace('.md', '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .reverse() // Reverse to handle category-name format
            .join(' ');
    }
    /**
     * Load and convert all knowledge files to KnowledgeItems.
     *
     * @returns Array of knowledge items
     */
    async loadAllKnowledge() {
        try {
            const resources = await this.listKnowledgeResources();
            const items = await Promise.all(resources.map(async (resource) => {
                const loaded = await this.readKnowledgeFile(resource.uri);
                return this.toKnowledgeItem(loaded);
            }));
            return items;
        }
        catch (error) {
            console.error('Error loading all knowledge:', error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }
}
// Export singleton instance for consistent access
export const knowledgeLoader = new KnowledgeLoader(process.cwd());
