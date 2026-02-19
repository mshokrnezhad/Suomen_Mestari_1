import minimist from "minimist";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import path from "node:path";

import { readDuoCardsCsv } from "./csv.js";
import {
  openAppContext,
  gotoApp,
  saveSession,
  hasSavedSession,
  clickPlusToOpenAddDialog,
  exportCardsCsv,
  fillAndSaveCard,
} from "./duocards-ui.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeCard({ word, meaning, sentence }) {
  return {
    word: (word ?? "").toString().trim(),
    meaning: (meaning ?? "").toString().trim(),
    sentence: (sentence ?? "").toString().trim(),
  };
}

function usageAndExit() {
  console.log(`
Usage:
  node src/cli.js login
  node src/cli.js export:csv [--out <path>] [--debug]
  node src/cli.js add:csv --csv <path> [--limit N] [--slowMs 600] [--skipExisting] [--debug]
  node src/cli.js add:one --word <word> --meaning <meaning> [--sentence <sentence>] [--slowMs 600] [--debug]
`);
  process.exit(1);
}

const argv = minimist(process.argv.slice(2), {
  boolean: ["debug", "skipExisting", "headless", "headed"],
  string: ["csv", "word", "meaning", "sentence", "out"],
  default: { slowMs: "600" },
});

const cmd = argv._[0];
if (!cmd) usageAndExit();

const hasDisplay = !!process.env.DISPLAY;
let headless = !hasDisplay; // default: headless if no X server
if (argv.headed) headless = false;
if (argv.headless) headless = true;

const debug = !!argv.debug;
const slowMs = Number(argv.slowMs ?? 600);

if (Number.isNaN(slowMs) || slowMs < 0) {
  console.error("--slowMs must be a non-negative number");
  process.exit(1);
}

async function cmdLogin() {
  if (headless) {
    console.error("Login requires a visible browser window.");
    console.error(
      "No DISPLAY detected. Run under an X server, or use xvfb-run like this:"
    );
    console.error('  xvfb-run -a npm run login');
    console.error("");
    console.error(
      "After you’ve saved the session once, add/import commands can run headless."
    );
    process.exit(1);
  }

  // Common pitfall: running via SSH with xvfb-run means the window exists but is not visible to you.
  const display = process.env.DISPLAY ?? "";
  const isSsh = !!process.env.SSH_CONNECTION || !!process.env.SSH_TTY;
  const looksLikeXvfbDisplay = /^:\d+/.test(display);
  if (isSsh && looksLikeXvfbDisplay) {
    console.error(
      `DISPLAY is set to "${display}" over SSH. This usually means you're on a virtual display (xvfb), so you won't see the browser window.`
    );
    console.error("To actually SEE and interact with the browser, use one of:");
    console.error("- SSH X11 forwarding: ssh -X user@host (needs an X server locally)");
    console.error("- VNC/RDP/desktop session on the remote machine");
    console.error(
      "- Or do the login on a local GUI machine, then copy tools/duocards/.state/storage.json here"
    );
    console.error("");
  }

  const { browser, context, page } = await openAppContext({ headless });
  try {
    await gotoApp(page);

    console.log("A browser window opened.");
    console.log("1) Log in to DuoCards normally.");
    console.log("2) After you see your cards, come back here and press Enter.");

    const rl = readline.createInterface({ input, output });
    await rl.question("Press Enter to save session and exit... ");
    rl.close();

    await saveSession(context);
    console.log("Saved session to tools/duocards/.state/storage.json");
  } finally {
    await browser.close();
  }
}

async function ensureSession() {
  if (!hasSavedSession()) {
    console.error(
      "No saved session found. Run `npm run login` from tools/duocards first."
    );
    process.exit(1);
  }
}

async function addCards(cards) {
  await ensureSession();

  const { browser, page } = await openAppContext({ headless });
  try {
    page.on("console", (m) => {
      if (debug) console.log(`[browser:${m.type()}] ${m.text()}`);
    });

    await gotoApp(page);

    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      console.log(`Adding ${i + 1}/${cards.length}: ${c.word}`);
      // After saving a card, DuoCards stays on the add-card screen (with #addCard visible).
      // Only click the "+" button if we're not already on that screen.
      const onAddScreen = await page
        .locator("#addCard")
        .first()
        .isVisible()
        .catch(() => false);
      if (!onAddScreen) {
        await clickPlusToOpenAddDialog(page, { debug });
      }
      const result = await fillAndSaveCard(page, c, { debug });
      if (result?.status === "skipped") {
        console.log(
          `Skipped: ${c.word} (Save stayed disabled; likely already exists)`
        );
      }
      await sleep(slowMs);
    }
  } finally {
    await browser.close();
  }
}

async function cmdAddCsv() {
  const csvPath = argv.csv;
  if (!csvPath) {
    console.error("Missing --csv <path>");
    process.exit(1);
  }

  const abs = path.resolve(csvPath);
  const rows = readDuoCardsCsv(abs).map(normalizeCard);

  const limit = argv.limit ? Number(argv.limit) : null;
  const limited = limit ? rows.slice(0, limit) : rows;

  const skipExisting = !!argv.skipExisting;
  const seen = new Set();
  const cards = [];
  for (const c of limited) {
    if (!c.word) continue;
    if (!skipExisting) {
      cards.push(c);
      continue;
    }
    const key = `${c.word}||${c.meaning}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(c);
  }

  console.log(`Loaded ${rows.length} rows from CSV, adding ${cards.length}.`);
  await addCards(cards);
}

async function cmdAddOne() {
  const word = argv.word;
  const meaning = argv.meaning;
  const sentence = argv.sentence ?? "";
  if (!word || !meaning) {
    console.error("Missing --word and/or --meaning");
    process.exit(1);
  }

  const card = normalizeCard({ word, meaning, sentence });
  await addCards([card]);
}

async function cmdExportCsv() {
  await ensureSession();
  const { browser, page } = await openAppContext({ headless });
  try {
    page.on("console", (m) => {
      if (debug) console.log(`[browser:${m.type()}] ${m.text()}`);
    });

    await gotoApp(page);
    const savedTo = await exportCardsCsv(page, { debug, outPath: argv.out });
    console.log(`Exported CSV to: ${savedTo}`);
  } finally {
    await browser.close();
  }
}

if (cmd === "login") {
  await cmdLogin();
} else if (cmd === "export:csv") {
  await cmdExportCsv();
} else if (cmd === "add:csv") {
  await cmdAddCsv();
} else if (cmd === "add:one") {
  await cmdAddOne();
} else {
  usageAndExit();
}

