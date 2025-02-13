# MCP TypeScript SDK TOC
[/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/README.md]
[/Users/seanivore/Development/the-pensieve/docs/TOC-TYPESCRIPT-MCP-SDK.md]
[/Users/seanivore/Development/the-pensieve/docs/TYPESCRIPT-MCP-SDK-README.md]

typescript-sdk/
├── [eslint.config.mjs](#eslintconfigmjs)
├── [jest.config.js](#jestconfigjs)
├── [package-lock.json] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/package-lock.json`
├── [package.json](#packagejson)
├── [tsconfig.cjs.json](#tsconfigcjsjson)
├── [tsconfig.json](#tsconfigjson)
├── [tsconfig.prod.json](#tsconfigprodjson)
└── src/
     ├── [types.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/types.ts`
     ├── [inMemory.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/inMemory.ts` 
     ├── [inMemory.test.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/inMemory.test.ts` 
     ├── integration-tests/
     │   └── [process-cleanup.test.ts](#process-cleanuptestts)
     ├── server/
     │   ├── [stdio.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/server/stdio.ts`
     │   ├── [stdio.test.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/server/stdio.test.ts` 
     │   ├── [sse.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/server/sse.ts` 
     │   ├── [mcp.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/server/mcp.ts` 
     │   ├── [mcp.test.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/server/mcp.test.ts` 
     │   ├── [index.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/server/index.ts` 
     │   ├── [index.test.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/server/index.test.ts`
     │   ├── [completable.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/server/completable.ts` 
     │   └── [completable.test.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/server/completable.test.ts`
     └── shared/
          ├── [uriTemplate.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/shared/uriTemplate.ts` 
          ├── [uriTemplate.test.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/shared/uriTemplate.test.ts` 
          ├── [transport.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/shared/transport.ts` 
          ├── [stdio.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/shared/stdio.ts` 
          ├── [stdio.test.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/shared/stdio.test.ts` 
          ├── [protocol.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/shared/protocol.ts` 
          └── [protocol.test.ts] `/Users/seanivore/Development/mcp-guides-docs-framework/typescript-sdk/src/shared/protocol.test.ts` 


## `eslint.config.mjs`
```typescript
// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        linterOptions: {
            reportUnusedDisableDirectives: false,
        },
        rules: {
            "@typescript-eslint/no-unused-vars": ["error",
                { "argsIgnorePattern": "^_" }
            ]
        }
    }
);
```

## `jest.config.js`
```typescript
import { createDefaultEsmPreset } from "ts-jest";

const defaultEsmPreset = createDefaultEsmPreset();

/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  ...defaultEsmPreset,
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
```

## `package.json`
```json
{
  "name": "@modelcontextprotocol/sdk",
  "version": "1.5.0",
  "description": "Model Context Protocol implementation for TypeScript",
  "license": "MIT",
  "author": "Anthropic, PBC (https://anthropic.com)",
  "homepage": "https://modelcontextprotocol.io",
  "bugs": "https://github.com/modelcontextprotocol/typescript-sdk/issues",
  "type": "module",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/modelcontextprotocol/typescript-sdk.git"
  },
  "engines": {
    "node": ">=18"
  },
  "keywords": [
    "modelcontextprotocol",
    "mcp"
  ],
  "exports": {
    "./*": {
      "import": "./dist/esm/*",
      "require": "./dist/cjs/*"
    }
  },
  "typesVersions": {
    "*": {
      "*": [
        "./dist/esm/*"
      ]
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "npm run build:esm && npm run build:cjs",
    "build:esm": "tsc -p tsconfig.prod.json && echo '{\"type\": \"module\"}' > dist/esm/package.json",
    "build:cjs": "tsc -p tsconfig.cjs.json && echo '{\"type\": \"commonjs\"}' > dist/cjs/package.json",
    "prepack": "npm run build:esm && npm run build:cjs",
    "lint": "eslint src/",
    "test": "jest",
    "start": "npm run server",
    "server": "tsx watch --clear-screen=false src/cli.ts server",
    "client": "tsx src/cli.ts client"
  },
  "dependencies": {
    "content-type": "^1.0.5",
    "eventsource": "^3.0.2",
    "raw-body": "^3.0.0",
    "zod": "^3.23.8",
    "zod-to-json-schema": "^3.24.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.8.0",
    "@types/content-type": "^1.1.8",
    "@types/eslint__js": "^8.42.3",
    "@types/eventsource": "^1.1.15",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.0.2",
    "@types/ws": "^8.5.12",
    "eslint": "^9.8.0",
    "express": "^4.19.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.4",
    "tsx": "^4.16.5",
    "typescript": "^5.5.4",
    "typescript-eslint": "^8.0.0",
    "ws": "^8.18.0"
  },
  "resolutions": {
    "strip-ansi": "6.0.1"
  }
}
```

## `tsconfig.cjs.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./dist/cjs"
  },
  "exclude": ["**/*.test.ts"]
}
```

## `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "es2018",
    "module": "Node16",
    "moduleResolution": "Node16",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## `tsconfig.prod.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/esm"
  },
  "exclude": ["**/*.test.ts"]
}
```

## `process-cleanup.test.ts`
```typescript
import { Server } from "../server/index.js";
import { StdioServerTransport } from "../server/stdio.js";

describe("Process cleanup", () => {
  jest.setTimeout(5000); // 5 second timeout

  it("should exit cleanly after closing transport", async () => {
    const server = new Server(
      {
        name: "test-server",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Close the transport
    await transport.close();

    // If we reach here without hanging, the test passes
    // The test runner will fail if the process hangs
    expect(true).toBe(true);
  });
});
```
