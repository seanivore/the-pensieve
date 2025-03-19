The following are documents from our first cursor/rules setup. The test did not go well. Do not use them without reviewing them individually. Also I prefer to only have one README.md file in the root of the project and not have the anywhere else, please. 

Rules: /Users/seanivore/Development/ai-dev/.cursor/rules

===
Document: readme.md
===

# Memory MCP Management Rules

This directory contains templates and guidelines for managing memory state across Claude instances using the Memory Model Context Protocol (MCP).

## Template Usage

1. Copy `memory-management-template.mdc` to your project's `.cursor/rules` directory
2. Replace the following placeholders:
   - ${PROJECT_NAME}: Your project's name
   - ${PROJECT_PATH}: Absolute path to project root
   - ${GIT_BRANCH}: Active git branch name
   - ${GITHUB_REPO}: GitHub repository URL/name

## Rule Structure

The template provides two main rules:

1. `memory_management`: High-level guidelines for memory operations
   - Project context tracking
   - Entity creation standards
   - Checkpoint scheduling
   - Relationship mapping
   - State verification

2. `memory_entity_structure`: Technical specifications for entities
   - Standard entity structure
   - Required fields
   - Common relation types
   - Creation patterns

## Best Practices

1. **Consistent Naming**
   - Use descriptive entity names
   - Follow established type patterns
   - Include context in relations

2. **Regular Updates**
   - Create checkpoints at key moments
   - Document state changes
   - Track dependencies

3. **Graph Organization**
   - Maintain clear hierarchies
   - Document relationships
   - Track impact chains

4. **State Management**
   - Verify current state
   - Check tool access
   - Note blocking issues

## Integration

These rules work with both Claude OS and Claude Cursor through the Memory MCP server, ensuring consistent state management across environments. 

===
Document: rules.md
===

# Cursor Rules for AI Development

This directory contains rule templates and guidelines for AI-assisted development using Cursor.

## Available Rules

### Memory MCP Management (`memory-management-template.mdc`)
Rules for maintaining consistent memory state across Claude instances.

#### Template Usage
1. Copy `memory-management-template.mdc` to your project's `.cursor/rules` directory
2. Replace the following placeholders:
   - ${PROJECT_NAME}: Your project's name
   - ${PROJECT_PATH}: Absolute path to project root
   - ${GIT_BRANCH}: Active git branch name
   - ${GITHUB_REPO}: GitHub repository URL/name

#### Rule Structure

1. `memory_management`: High-level guidelines for memory operations
   - Project context tracking
   - Entity creation standards
   - Checkpoint scheduling
   - Relationship mapping
   - State verification

2. `memory_entity_structure`: Technical specifications for entities
   - Standard entity structure
   - Required fields
   - Common relation types
   - Creation patterns

#### Best Practices

1. **Consistent Naming**
   - Use descriptive entity names
   - Follow established type patterns
   - Include context in relations

2. **Regular Updates**
   - Create checkpoints at key moments
   - Document state changes
   - Track dependencies

3. **Graph Organization**
   - Maintain clear hierarchies
   - Document relationships
   - Track impact chains

4. **State Management**
   - Verify current state
   - Check tool access
   - Note blocking issues

## Creating New Rules

When creating new rule templates:

1. Use the `.mdc` extension for rule files
2. Include a clear description and glob patterns
3. Define specific filters and actions
4. Provide examples of usage
5. Include metadata for versioning

## Rule Types

1. **Project Rules** (`.cursor/rules/*.mdc`)
   - Path-specific configurations
   - Granular control over AI behavior
   - Automatic attachment to matching files
   - Support for semantic descriptions

2. **Global Rules** (`.cursorrules`)
   - Universal project settings
   - General behavioral instructions
   - Legacy support (being phased out)

## Integration

These rules work with both Claude OS and Claude Cursor through the Memory MCP server, ensuring consistent state management across environments. 

===
DOCUMENT: setup.sh
===

#!/bin/bash

# Get project information
echo "Setting up Cursor rules for new project..."
read -p "Project name: " PROJECT_NAME
read -p "Project path: " PROJECT_PATH
read -p "Git branch (default: main): " GIT_BRANCH
GIT_BRANCH=${GIT_BRANCH:-main}
read -p "GitHub repo: " GITHUB_REPO

# Create rules directory if it doesn't exist
mkdir -p .cursor/rules

# Copy and customize rules
for rule in $(dirname "$0")/rules/*.mdc; do
  filename=$(basename "$rule")
  echo "Customizing $filename..."
  
  # Replace placeholders with project-specific values
  sed -e "s|\${PROJECT_NAME}|$PROJECT_NAME|g" \
      -e "s|\${PROJECT_PATH}|$PROJECT_PATH|g" \
      -e "s|\${GIT_BRANCH}|$GIT_BRANCH|g" \
      -e "s|\${GITHUB_REPO}|$GITHUB_REPO|g" \
      "$rule" > ".cursor/rules/$filename"
done

# Copy other configurations
echo "Copying configuration templates..."
cp -r $(dirname "$0")/../templates .
cp -r $(dirname "$0")/../config .

# Customize configurations
echo "Customizing configurations..."
find ./templates ./config -type f -exec sed -i '' \
  -e "s|\${PROJECT_NAME}|$PROJECT_NAME|g" \
  -e "s|\${PROJECT_PATH}|$PROJECT_PATH|g" \
  -e "s|\${GIT_BRANCH}|$GIT_BRANCH|g" \
  -e "s|\${GITHUB_REPO}|$GITHUB_REPO|g" {} +

echo "Setup complete! Rules and configurations have been customized for $PROJECT_NAME" 