const fs = require('fs');
const path = require('path');

function removeTypes(content) {
  // Remove type imports
  content = content.replace(/import\s+type\s+[^;]+;/g, '');
  // Remove interface declarations
  content = content.replace(/interface\s+\w+\s*\{[^}]*\}/gs, '');
  // Remove type alias declarations
  content = content.replace(/type\s+\w+\s*=[^;]+;/g, '');
  // Remove inline type annotations from function params
  content = content.replace(/:\s*(?:string|number|boolean|Date|void|any|unknown|never|undefined|null|Array<[^>]+>|Record<[^>]+>|[^<>\s]+(?:\[\])?)\s*(?=[,;=)])/g, '');
  // Remove type annotations from destructured params
  content = content.replace(/:\s*\{[^}]+\}\s*(?=[,;=)])/g, '');
  // Remove generic type params from function calls
  content = content.replace(/<[^<>]+>(?=[\s]*\()/g, '');
  // Remove `as` type assertions
  content = content.replace(/\s+as\s+(?:string|number|boolean|any|unknown|never|undefined|null|[^\s;]+)(?=[;,\n)])/g, '');
  // Remove `: JSX.Element` etc
  content = content.replace(/:\s*JSX\.(?:Element|IntrinsicElements)?/g, '');
  // Remove `// @ts-...` comments
  content = content.replace(/\/\/\s*@ts-[^\n]+/g, '');
  // Remove `// @ts-expect-error` etc
  content = content.replace(/\/\/\s*@ts-expect-error\s*\n?/g, '');
  // Clean up empty lines
  content = content.replace(/^\s*$/gm, '').replace(/\n{3,}/g, '\n\n');
  return content;
}

function renameExtension(filepath) {
  if (filepath.endsWith('.tsx')) return filepath.replace(/\.tsx$/, '.jsx');
  if (filepath.endsWith('.ts')) return filepath.replace(/\.ts$/, '.js');
  return filepath;
}

function processDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      processDir(fullPath);
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      const newPath = renameExtension(fullPath);
      let content = fs.readFileSync(fullPath, 'utf-8');
      content = removeTypes(content);
      fs.writeFileSync(newPath, content);
      fs.unlinkSync(fullPath);
      console.log(`Converted: ${fullPath} -> ${newPath}`);
    }
  }
}

processDir('src');

if (fs.existsSync('vite.config.ts')) {
  let content = fs.readFileSync('vite.config.ts', 'utf-8');
  content = removeTypes(content);
  fs.writeFileSync('vite.config.js', content);
  fs.unlinkSync('vite.config.ts');
  console.log('Converted: vite.config.ts -> vite.config.js');
}

if (fs.existsSync('tsconfig.json')) {
  fs.unlinkSync('tsconfig.json');
  console.log('Removed: tsconfig.json');
}

console.log('\nDone!');
