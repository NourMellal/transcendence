#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function findStyles(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      findStyles(full, out);
    } else if (e.isFile() && e.name === 'styles.scss') {
      out.push(full);
    }
  }
  return out;
}

const projectRoot = process.cwd(); // expected to be apps/web
const srcDir = path.join(projectRoot, 'src');
if (!fs.existsSync(srcDir)) {
  console.error('src directory not found at', srcDir);
  process.exit(1);
}

const files = findStyles(srcDir);
if (files.length === 0) {
  console.log('No styles.scss files found under src/');
  process.exit(0);
}

let sass;
try {
  sass = require('sass');
} catch (e) {
  try {
    sass = require('sass-embedded');
  } catch (e2) {
    console.error('No Sass implementation found. Please install `sass` or `sass-embedded`.');
    process.exit(1);
  }
}

const outputs = [];
for (const f of files) {
  try {
    const result = sass.renderSync ? sass.renderSync({ file: f }) : sass.compileString(fs.readFileSync(f, 'utf8'), { loadPaths: [path.dirname(f)] });
    const css = result.css ? result.css.toString() : result.toString();
    outputs.push(`/* Source: ${path.relative(projectRoot, f)} */\n` + css + '\n');
    console.log('Compiled', f);
  } catch (err) {
    console.error('Error compiling', f, err.message || err);
  }
}

const outDir = path.join(srcDir, 'styles');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'global.css');
fs.writeFileSync(outFile, outputs.join('\n'), 'utf8');
console.log('Wrote bundled CSS to', outFile);
