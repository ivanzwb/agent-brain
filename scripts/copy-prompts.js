'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcPrompts = path.join(root, 'src', 'prompts');
const distPrompts = path.join(root, 'dist', 'prompts');

function copyMarkdownFiles(fromDir, toDir) {
  if (!fs.existsSync(fromDir)) return;
  for (const ent of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const srcPath = path.join(fromDir, ent.name);
    const destPath = path.join(toDir, ent.name);
    if (ent.isDirectory()) {
      copyMarkdownFiles(srcPath, destPath);
    } else if (ent.name.endsWith('.md')) {
      fs.mkdirSync(toDir, { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyMarkdownFiles(srcPrompts, distPrompts);
