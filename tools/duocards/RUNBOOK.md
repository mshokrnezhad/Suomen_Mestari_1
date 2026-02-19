## DuoCards + Notion automation runbook (repeatable)

This runbook documents the repeatable workflow to:
- Export the latest DuoCards vocabulary to the project root (`latest_vocab.csv`)
- Extract **red background** words from a Notion page you provide
- Split extracted words into **KNOWN** vs **NEW** by checking `latest_vocab.csv` (match by word only)
- Build lesson CSVs in the Notion “Save directory”:
  - `...__notion_red_bg_cards_all.csv` (optional audit)
  - `...__notion_red_bg_cards_new.csv` (required for import; includes meaning + example)
- Import **only the NEW words** into DuoCards via UI automation

### Safety + constraints (read first)
- **Never paste passwords** into chat/tools/scripts. The DuoCards automation uses a saved browser session file: `tools/duocards/.state/storage.json`.
- The DuoCards app is at `https://app.duocards.com/#email` (login page).  
- UI automation can break if DuoCards changes their UI. Use `--debug` to capture screenshots/HTML.

---

## A) Step 1 — Export latest DuoCards vocab (automated)

This downloads your vocab CSV from DuoCards, writes it to the project root as `latest_vocab.csv`,
and **cleans up** temp downloads automatically.

### Command (SSH/headless-friendly)

```bash
cd "tools/duocards"
xvfb-run -a npm run export:csv
```

### Output
- Project root: `latest_vocab.csv`
- Debug (optional): `tools/duocards/.state/debug/` (screenshots + HTML)

### Troubleshooting
- If it fails to download, rerun with debug:

```bash
xvfb-run -a npm run export:csv -- --debug
```

---

## B) Step 2 — Extract red-background words from a Notion page (provided by you)

### What “red background” means in Notion export
The Notion MCP fetch returns enhanced markdown where red-highlighted words look like:

```text
<span color="red_bg">tiistaina</span>
```

### Inputs to give the agent
- **NOTION_PAGE**: the Notion page URL or page ID (the page that contains the red-highlighted words)

### How to fetch the page using Notion MCP (for a “smart agent”)

1) Fetch the page content using the provided NOTION_PAGE:
```json
{ "id": "<NOTION_PAGE>" }
```

2) Extract all matches of the pattern:
- Regex: `color="red_bg">([^<]+)<`
- Normalize (trim) and de-duplicate.

### Output of this step
- A de-duplicated list of words highlighted with red background on that page.

---

## C) Step 3 — Split extracted words into (already in DuoCards) vs (new)

This step prevents re-adding words you already have.

### Input
- Extracted red-bg words from Step B
- `latest_vocab.csv` (created in Step A)

### Rule (IMPORTANT)
Match **by the word only** (DuoCards `front` column), not by meaning/sentence.

Recommended normalization for matching:
- trim whitespace
- compare case-insensitively (optional)

### Output
- **KNOWN_WORDS**: words found in `latest_vocab.csv` (front matches)
- **NEW_WORDS**: words NOT found in `latest_vocab.csv`

Only **NEW_WORDS** should be turned into new cards and imported.

---

## D) Step 4 — Build CSVs (known vs new)

### CSV format (required by our importer)
Create a CSV with these columns:

```csv
front,back,hint
"tiistaina","on Tuesday","Kurssi on tiistaina."
```

- `front` = word (Finnish)
- `back` = meaning (English)
- `hint` = example sentence (Finnish)

### Where to save the CSV (IMPORTANT)
Always save the generated CSV **in the lesson’s folder**, not in the repo root:

1) From the Notion page content, find the line:
   - `Save directory: /.../01/processed_data` (example)
2) Choose a `lesson_id` label (recommended format):
   - `01__lesson1` (chapter + lesson name)
3) Write the CSV into that directory, using these naming conventions:
   - `<lesson_id>__notion_red_bg_cards_all.csv`
   - `<lesson_id>__notion_red_bg_cards_new.csv`

Example for Lesson 1:
- `01/processed_data/01__lesson1__notion_red_bg_cards_all.csv`
- `01/processed_data/01__lesson1__notion_red_bg_cards_new.csv`

### Files to generate (recommended)
Create **two** CSVs:

1) **Full extracted set (optional, for auditing)**
   - Contains *all* extracted red-bg words, even if already known.
   - Filename:
     - `<lesson_id>__notion_red_bg_cards_all.csv`

2) **New words only (required for import)**
   - Contains only **NEW_WORDS** (those missing from `latest_vocab.csv`)
   - Filename:
     - `<lesson_id>__notion_red_bg_cards_new.csv`

### How to find meanings/sentences
Recommended logic:
1) **Try to reuse existing DuoCards content** from `latest_vocab.csv`:
   - Match by `front` equals the word (exact match).
   - If found, reuse `back` and `hint`.
2) If not found:
   - Use a dictionary/source you trust, or generate with an LLM.
   - Keep example sentences short and natural.

---

## E) Step 5 — Import into DuoCards (automated)

### Import from a CSV
From project root, import the **new-words-only** CSV you created in Step D (example for Lesson 1):

```bash
cd "tools/duocards"
xvfb-run -a npm run add:csv -- --csv "../../01/processed_data/01__lesson1__notion_red_bg_cards_new.csv" --slowMs 700 --debug
```

Notes:
- `--slowMs 700` is a polite delay between cards.
- `--debug` saves step screenshots/HTML under `tools/duocards/.state/debug/`.

### Import a single card (manual values)

```bash
cd "tools/duocards"
xvfb-run -a npm run add:one -- --word "xxx" --meaning "yyy" --sentence "zzz" --debug
```

### Common failure modes
- **“Save” stays disabled**: usually means the script filled the wrong inputs or the form changed.
  - Re-run with `--debug` and inspect screenshots.
- **Can’t find “+” button**: DuoCards UI changed or you are on a different page state.
  - Re-run with `--debug`.

---

## F) Recommended “full pipeline” sequence (repeatable)

1) Export latest vocab:
```bash
cd "tools/duocards"
xvfb-run -a npm run export:csv
```

2) Fetch the provided Notion page and extract red-bg words (Step B).

3) Split extracted words into known vs new using `latest_vocab.csv` (Step C).

4) Build the lesson CSVs **inside the Notion “Save directory”** (Step D), including a **new-words-only** file.

5) Import the **new-words-only** CSV into DuoCards:
```bash
cd "tools/duocards"
xvfb-run -a npm run add:csv -- --csv "../../<SAVE_DIRECTORY>/<lesson_id>__notion_red_bg_cards_new.csv" --slowMs 700
```

### Don’t import twice by default
Run the import **once**. Only re-run with `--debug` when you’re troubleshooting UI changes or failures.

