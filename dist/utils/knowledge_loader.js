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
   * @param {string} rootPath - Root directory containing knowledge files
   */
  constructor(rootPath) {
    this.knowledgeDir = path.join(rootPath, 'knowledge');
  }

  /**
   * List all knowledge files as MCP resources.
   * 
   * @returns {Promise<Array<{
   *   uri: string,
   *   mimeType: string,
   *   name: string,
   *   description: string
   * }>>} Array of MCP resource descriptions
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
    } catch (error) {
      console.error('Error listing knowledge resources:', error);
      return [];
    }
  }

  /**
   * Read and parse a specific knowledge file.
   * 
   * @param {string} uri - URI of the knowledge file to read
   * @returns {Promise<{
   *   uri: string,
   *   name: string,
   *   description: string,
   *   content: string,
   *   metadata: Object
   * }>} Parsed file content and metadata
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
        metadata
      };
    } catch (error) {
      console.error(`Error reading knowledge file ${uri}:`, error);
      throw error;
    }
  }

  /**
   * Format a filename into a readable name.
   * Example: "skills-javascript.md" -> "JavaScript Skills"
   * 
   * @param {string} filename - Filename to format
   * @returns {string} Formatted name
   */
  formatName(filename) {
    return filename
      .replace('.md', '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .reverse()  // Reverse to handle category-name format
      .join(' ');
  }
}

// Export singleton instance for consistent access
export const knowledgeLoader = new KnowledgeLoader(process.cwd());
