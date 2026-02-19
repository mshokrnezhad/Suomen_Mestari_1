## DuoCards automation (add cards fast)

This repo contains course materials plus automation tools.  
This tool automates adding cards through the DuoCards web UI (click “+”, fill **word / meaning / sentence**, click Save) and exporting your existing cards.

### What it supports
- **Login once manually**, then reuse the saved session (no passwords stored in code).
- **Import from your CSV export** with columns:
  - `front` = word
  - `back` = meaning
  - `hint` = example sentence
- **Add one card** from the command line.

### Setup (one-time)
From this folder:

```bash
cd "tools/duocards"
npm install
npm run install:browsers
```

### 1) Login (manual, one time)

```bash
npm run login
```

A Chromium window opens. Log in normally. Then return to the terminal and press Enter.

If you’re on a machine **without a GUI** (no X server / `$DISPLAY`), run:

```bash
xvfb-run -a npm run login
```

This saves session data to `tools/duocards/.state/storage.json`.

If you can’t see a browser window (common over SSH), do the login on a machine with a GUI and copy `tools/duocards/.state/storage.json` to the same path on the server (or use X11 forwarding / remote desktop).

### 2) Import cards from a CSV

Example using your export in the repo root:

```bash
npm run add:csv -- --csv "../../duo_cards_fi_export.csv"
```

Optional flags:
- `--limit 50` (only add first 50)
- `--skipExisting` (skip if the exact same word+meaning already exists in the CSV import run)
- `--slowMs 600` (delay between cards)

### 3) Add one card

```bash
npm run add:one -- --word "merkki" --meaning "sign" --sentence "Se on hyvä merkki."
```

### 4) Export (download) your cards as CSV

```bash
# headless/SSH-friendly:
xvfb-run -a npm run export:csv
```

Optional:
- Default output is **project root** `latest_vocab.csv`
- `--out /path/to/file.csv` (choose output path)
- `--debug` (save step screenshots/HTML under `tools/duocards/.state/debug/`)

### Notes
- DuoCards UI can change. If the script can’t find buttons/inputs, run with `--debug` and share the console output; we’ll adjust selectors.
- This tool is meant for **your own account/content**. Go slowly to avoid triggering anti-bot protections.

If you don’t have `xvfb-run`, install it on Ubuntu/Debian with:

```bash
sudo apt-get update && sudo apt-get install -y xvfb
```

### Runbook (Notion → DuoCards pipeline)
See: `tools/duocards/RUNBOOK.md`

