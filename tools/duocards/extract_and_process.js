#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read Notion content (will be passed as argument)
const notionContent = process.argv[2];
const vocabCsvPath = process.argv[3];
const outputDir = process.argv[4];
const lessonId = process.argv[5];

if (!notionContent || !vocabCsvPath || !outputDir || !lessonId) {
  console.error('Usage: node extract_and_process.js <notion_content_file> <vocab_csv> <output_dir> <lesson_id>');
  process.exit(1);
}

// Read files
const content = fs.readFileSync(notionContent, 'utf8');
const vocabCsv = fs.readFileSync(vocabCsvPath, 'utf8');

// Extract red-bg words using regex
const redBgRegex = /color="red_bg">([^<]+)</g;
const matches = [...content.matchAll(redBgRegex)];
const extractedWords = matches.map(m => m[1].trim());

// De-duplicate
const uniqueWords = [...new Set(extractedWords)];
console.log(`Extracted ${uniqueWords.length} unique red-background words`);

// Parse existing vocab CSV
const vocabLines = vocabCsv.split('\n').slice(1); // skip header
const existingWords = new Set();
const existingData = new Map();

vocabLines.forEach(line => {
  if (!line.trim()) return;
  const match = line.match(/^"([^"]+)"/);
  if (match) {
    const word = match[1].toLowerCase().trim();
    existingWords.add(word);
    
    // Parse full line for reuse
    const parts = line.match(/"([^"]*)"/g);
    if (parts && parts.length >= 3) {
      const front = parts[0].replace(/"/g, '');
      const back = parts[1].replace(/"/g, '');
      const hint = parts[2].replace(/"/g, '');
      existingData.set(word, { front, back, hint });
    }
  }
});

console.log(`Found ${existingWords.size} words in existing vocabulary`);

// Split into KNOWN vs NEW
const knownWords = [];
const newWords = [];

uniqueWords.forEach(word => {
  const normalized = word.toLowerCase().trim();
  if (existingWords.has(normalized)) {
    knownWords.push(word);
  } else {
    newWords.push(word);
  }
});

console.log(`KNOWN: ${knownWords.length}, NEW: ${newWords.length}`);

// Build CSV rows
function buildCsvRow(word) {
  const normalized = word.toLowerCase().trim();
  const existing = existingData.get(normalized);
  
  if (existing) {
    return `"${existing.front}","${existing.back}","${existing.hint}"`;
  }
  
  // For new words, we'll need to add meaning and example
  // For now, placeholder (agent will fill these in)
  return `"${word}","[MEANING]","[EXAMPLE]"`;
}

// Generate ALL CSV
const allCsvHeader = 'front,back,hint\n';
const allCsvRows = uniqueWords.map(buildCsvRow).join('\n');
const allCsvPath = path.join(outputDir, `${lessonId}__notion_red_bg_cards_all.csv`);
fs.writeFileSync(allCsvPath, allCsvHeader + allCsvRows);
console.log(`Written: ${allCsvPath}`);

// Generate NEW CSV
const newCsvRows = newWords.map(buildCsvRow).join('\n');
const newCsvPath = path.join(outputDir, `${lessonId}__notion_red_bg_cards_new.csv`);
fs.writeFileSync(newCsvPath, allCsvHeader + newCsvRows);
console.log(`Written: ${newCsvPath}`);

// Output summary
console.log('\n=== SUMMARY ===');
console.log(`Total extracted: ${uniqueWords.length}`);
console.log(`Known words: ${knownWords.length}`);
console.log(`New words: ${newWords.length}`);
console.log('\nNew words to import:');
newWords.forEach((w, i) => console.log(`  ${i+1}. ${w}`));
