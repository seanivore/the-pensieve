// =============================================================================
// Memory Inventory Parser
// =============================================================================
// This utility parses the memory inventory, a structured markdown file that acts
// as an index for our knowledge base. It extracts:
// - Core memory files (markdown documents)
// - Topics and categories
// - Metadata using frontmatter
// This is used by the MCP server to expose memories as resources.

import { readFile } from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

/**
 * Read and parse a markdown file, extracting content and metadata.
 * 
 * @param {string} filePath - Path to markdown file
 * @returns {Promise<{content: string, metadata: Object}|null>} Parsed file content and metadata
 */
async function readFileContent(filePath) {
  try {
    // Clean the path of brackets and normalize for OS
    const cleanPath = filePath.replace(/[\[\]]/g, '').trim();
    
    // Handle both absolute and relative paths
    const resolvedPath = path.isAbsolute(cleanPath)
      ? cleanPath
      : path.join(process.cwd(), cleanPath);
    
    console.log(`Reading file: ${resolvedPath}`);
    const fileContent = await readFile(resolvedPath, 'utf8');
    
    // Parse frontmatter for metadata
    const { data: metadata, content } = matter(fileContent);
    
    return { 
      content: content.trim(), 
      metadata 
    };
  } catch (err) {
    console.error(`Failed to read file ${filePath}:`, err);
    return null;
  }
}

/**
 * Extract a section from markdown content by its heading.
 * 
 * @param {string} content - Markdown content
 * @param {string} sectionName - Name of section to extract
 * @returns {string} Extracted section content
 */
function extractSection(content, sectionName) {
  const sectionRegex = new RegExp(`### ${sectionName}[\\s\\S]*?(?=###|$)`);
  const match = content.match(sectionRegex);
  return match ? match[0] : '';
}

/**
 * Parse the memory inventory file and extract all knowledge items.
 * 
 * @returns {Promise<Array<{
 *   type: string,
 *   content: string,
 *   source?: string,
 *   metadata?: Object
 * }>>} Array of parsed memory items
 */
export async function parseKnowledgeInventory() {
  const inventoryPath = path.join(process.cwd(), 'memories/INVENTORY.md');
  console.log('Reading memory inventory from:', inventoryPath);
  
  const content = await readFile(inventoryPath, 'utf8');
  console.log('Successfully read inventory file');

  const memories = [];

  // Process Core Memories section
  const coreSection = extractSection(content, 'Core Memories');

  // Extract and process markdown files
  const markdownFiles = coreSection.match(/\[.*?\.md\]/g) || [];
  for (const filePath of markdownFiles) {
    const result = await readFileContent(filePath);
    if (result) {
      console.log(`Successfully processed: ${filePath}`);
      memories.push({
        type: 'memory',
        content: result.content,
        source: filePath.replace(/[\[\]]/g, ''),
        metadata: result.metadata
      });
    } else {
      console.warn(`Failed to process: ${filePath}`);
    }
  }

  // Extract and process topics
  const topics = (coreSection.match(/> ([^\n]+)/g) || [])
    .map(topic => topic.replace('> ', '').trim())
    .filter(topic => !topic.match(/\[.*\.md\]/));

  if (topics.length > 0) {
    memories.push({
      type: 'topics',
      content: topics.join('\n'),
      metadata: { 
        topics,
        title: 'Memory Topics',
        description: 'Core topics and themes in our knowledge base'
      }
    });
  }

  // Extract and process categories
  const categories = content.match(/- [A-Za-z]+/g) || [];
  const memoryCategories = categories
    .map(cat => cat.replace('- ', ''))
    .filter(cat => cat.length > 0);

  if (memoryCategories.length > 0) {
    memories.push({
      type: 'categories',
      content: memoryCategories.join('\n'),
      metadata: {
        categories: memoryCategories,
        title: 'Memory Categories',
        description: 'Classification system for our knowledge base'
      }
    });
  }

  return memories;
}
