import fs from "node:fs";
import { parse } from "csv-parse/sync";

/**
 * Reads a DuoCards CSV export (front, back, hint, publishedAt) and returns
 * normalized cards: { word, meaning, sentence }.
 */
export function readDuoCardsCsv(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });

  const cards = [];
  for (const r of records) {
    const word = (r.front ?? "").toString().trim();
    const meaning = (r.back ?? "").toString().trim();
    const sentence = (r.hint ?? "").toString().trim();

    if (!word) continue;
    cards.push({ word, meaning, sentence });
  }
  return cards;
}

