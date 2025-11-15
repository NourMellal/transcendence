#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.log('Usage: node scripts/create-component.cjs <ComponentName> <outputFilePath>');
  console.log('Example: node scripts/create-component.cjs homePage src/modules/auth/Pages/homePage/homePage.ts');
}

const [,, name, outPathArg] = process.argv;
if (!name || !outPathArg) {
  usage();
  process.exit(1);
}

const repoRoot = process.cwd(); // expected to be apps/web
const outPath = path.isAbsolute(outPathArg) ? outPathArg : path.join(repoRoot, outPathArg);
const outDir = path.dirname(outPath);

// ensure directory exists
fs.mkdirSync(outDir, { recursive: true });

// compute relative import path to core
const coreDir = path.join(repoRoot, 'src', 'core');
let rel = path.relative(outDir, coreDir).split(path.sep).join('/');
if (!rel.startsWith('.')) rel = './' + rel;

const className = name;

const template = `import { Component } from "${rel}";
type Props = { start?: number; label?: string };
type State = { count: number };

export default class ${className} extends Component<Props, State> {
  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    return { count: this.props.start ?? 0 };
  }

  render() {
    return [
      '<p>This is a new component: ' + this.props.label + '</p>',
    ];
  }

  protected attachEventListeners(): void {
  }
}
`;

fs.writeFileSync(outPath, template, { encoding: 'utf8' });
console.log('Created component:', outPath);
