#!/usr/bin/env node
/**
 * OpenAPI Bundler
 * ===============
 * Bundles multiple OpenAPI YAML files into a single file for Swagger UI/Editor
 * 
 * Usage: node bundle-openapi.js
 * Output: openapi-bundled.yaml
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = __dirname;
const MAIN_FILE = path.join(DOCS_DIR, 'openapi-main.yaml');
const OUTPUT_FILE = path.join(DOCS_DIR, 'openapi-bundled.yaml');

/**
 * Resolve $ref pointers in the spec
 */
function resolveRefs(obj, basePath, visited = new Set()) {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => resolveRefs(item, basePath, visited));
  }
  
  // Handle $ref
  if (obj.$ref && typeof obj.$ref === 'string') {
    const refPath = obj.$ref;
    
    // Skip already visited refs to prevent circular references
    if (visited.has(refPath)) {
      console.warn(`⚠️  Circular reference detected: ${refPath}`);
      return obj;
    }
    
    // Handle local references (within same file)
    if (refPath.startsWith('#/')) {
      return obj;
    }
    
    // Handle file references
    const [filePath, jsonPointer] = refPath.split('#');
    const fullPath = path.resolve(basePath, filePath);
    
    try {
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const parsedContent = yaml.load(fileContent);
      
      visited.add(refPath);
      
      // Navigate to the specific pointer
      if (jsonPointer) {
        const parts = jsonPointer.split('/').filter(Boolean);
        let result = parsedContent;
        for (const part of parts) {
          result = result[part];
        }
        return resolveRefs(result, path.dirname(fullPath), visited);
      }
      
      return resolveRefs(parsedContent, path.dirname(fullPath), visited);
    } catch (error) {
      console.error(`❌ Error resolving ref ${refPath}:`, error.message);
      return obj;
    }
  }
  
  // Recursively process object properties
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveRefs(value, basePath, visited);
  }
  
  return result;
}

/**
 * Bundle the OpenAPI specification
 */
function bundleOpenAPI() {
  console.log('🔄 Bundling OpenAPI specification...\n');
  
  try {
    // Read main file
    console.log(`📖 Reading main file: ${path.relative(process.cwd(), MAIN_FILE)}`);
    const mainContent = fs.readFileSync(MAIN_FILE, 'utf8');
    const spec = yaml.load(mainContent);
    
    // Resolve all references
    console.log('🔍 Resolving $ref pointers...');
    const bundled = resolveRefs(spec, DOCS_DIR);
    
    // Write bundled file
    console.log(`💾 Writing bundled file: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
    const yamlOutput = yaml.dump(bundled, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
    
    fs.writeFileSync(OUTPUT_FILE, yamlOutput, 'utf8');
    
    console.log('\n✅ Successfully bundled OpenAPI specification!');
    console.log(`📄 Output: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
    console.log('\n🚀 You can now use this file with Swagger UI/Editor');
    
  } catch (error) {
    console.error('\n❌ Bundling failed:', error.message);
    process.exit(1);
  }
}

// Run bundler
bundleOpenAPI();
