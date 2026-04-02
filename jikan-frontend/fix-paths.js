import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildDir = path.join(__dirname, 'build');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

console.log('🛠️ Fixing paths for native build...');

walk(buildDir, (filePath) => {
  if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace absolute paths with relative ones
    let newContent = content
      .replace(/src="\//g, 'src="./')
      .replace(/href="\//g, 'href="./')
      .replace(/url\(\//g, 'url(./')
      .replace(/"\/_app\//g, '"./_app/')
      .replace(/'\/_app\//g, '\'./_app/')
      .replace(/from"\/_app\//g, 'from"./_app/')
      .replace(/import\("\/_app\//g, 'import("./_app/');
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Fixed: ${path.relative(buildDir, filePath)}`);
    }
  }
});

console.log('✨ All paths converted to relative!');
