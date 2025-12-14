const fs = require('fs');
const path = require('path');

// Config: What to ignore and what to keep
const IGNORE_DIRS = ['node_modules', '.git', 'dist', '.cache', '.upm', 'public'];
const INCLUDE_EXTS = ['.ts', '.tsx', '.css', '.json', '.js'];
const OUTPUT_FILE = 'codebase.txt';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (INCLUDE_EXTS.includes(path.extname(file)) && file !== 'export_code.js' && file !== 'package-lock.json') {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

console.log("Scanning files...");
const files = getAllFiles(__dirname, []);
console.log(`Found ${files.length} source files.`);

let output = "";

files.forEach(file => {
  const relativePath = path.relative(__dirname, file);
  const content = fs.readFileSync(file, 'utf8');

  output += `\n\n--- START OF FILE: ${relativePath} ---\n`;
  output += content;
  output += `\n--- END OF FILE: ${relativePath} ---\n`;
});

fs.writeFileSync(OUTPUT_FILE, output);
console.log(`Done! All code saved to ${OUTPUT_FILE}.`);
console.log("Download this file and upload it to the chat.");