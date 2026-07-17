import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(srcDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    
    content = content.replace(importRegex, (match, importPath) => {
        if (importPath.startsWith('.')) {
            const absoluteImportPath = path.resolve(path.dirname(file), importPath);
            
            if (absoluteImportPath.startsWith(srcDir)) {
                let relToSrc = path.relative(srcDir, absoluteImportPath);
                relToSrc = relToSrc.replace(/\\/g, '/');
                
                // Simplification for barrel files
                // If import is @/components/canvas/GameCanvas, it stays @/components/canvas/GameCanvas
                // Actually, let's just map it perfectly:
                return `from '@/${relToSrc}'`;
            }
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated imports in ${path.relative(__dirname, file)}`);
    }
});
