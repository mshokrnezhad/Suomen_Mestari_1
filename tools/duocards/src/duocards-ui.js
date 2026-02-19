import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = "https://app.duocards.com/";

function stateDir() {
  return path.resolve(".state");
}

function storageStatePath() {
  return path.join(stateDir(), "storage.json");
}

export function hasSavedSession() {
  return fs.existsSync(storageStatePath());
}

export async function openAppContext({ headless = false } = {}) {
  fs.mkdirSync(stateDir(), { recursive: true });

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    ...(hasSavedSession() ? { storageState: storageStatePath() } : {}),
    acceptDownloads: true,
  });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function gotoApp(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  // DuoCards is a SPA; wait a bit for UI to render.
  try {
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  } catch {
    // ignore; some apps keep network busy
  }
}

export async function saveSession(context) {
  fs.mkdirSync(stateDir(), { recursive: true });
  await context.storageState({ path: storageStatePath() });
}

/**
 * Heuristic locators for the DuoCards "Add card" UI.
 * These may need tweaks depending on DuoCards UI changes / language.
 */
function getLocators(page) {
  const addButtonCandidates = [
    // DuoCards "+" is a MUI Floating Action Button without accessible name.
    page.locator('button[class*="AddButton__SFab"]'),
    page.locator("button.MuiFab-root"),
    page.locator("button.MuiFab-root.MuiFab-primary"),
    page.locator('button.MuiFab-root svg[viewBox="0 0 24 24"]').locator("xpath=ancestor::button[1]"),
    page.getByRole("button", { name: /^\+$/ }),
    page.getByRole("button", { name: /add/i }),
    page.getByRole("button", { name: /lisää/i }),
    page.locator('button:has-text("+")'),
    // Icon-only buttons often use aria-label/title.
    page.locator('[aria-label*="Add" i]'),
    page.locator('[aria-label*="Lisää" i]'),
    page.locator('[title*="Add" i]'),
    page.locator('[title*="Lisää" i]'),
    // Common testid patterns (best-effort).
    page.locator('[data-testid*="add" i]'),
    page.locator('[data-testid*="plus" i]'),
  ];

  const wordInputCandidates = [
    page.getByRole("textbox", { name: /word/i }),
    page.getByRole("textbox", { name: /sana/i }),
    page.locator('input[placeholder*="word" i]'),
    page.locator('input[placeholder*="sana" i]'),
    page.locator("input").first(),
  ];

  const meaningInputCandidates = [
    page.getByRole("textbox", { name: /meaning/i }),
    page.getByRole("textbox", { name: /käännös/i }),
    page.getByRole("textbox", { name: /translation/i }),
    page.locator('textarea[placeholder*="meaning" i]'),
    page.locator('input[placeholder*="meaning" i]'),
    page.locator("textarea").first(),
  ];

  const sentenceInputCandidates = [
    page.getByRole("textbox", { name: /sentence/i }),
    page.getByRole("textbox", { name: /esimerk/i }),
    page.locator('textarea[placeholder*="sentence" i]'),
    page.locator("textarea").nth(1),
  ];

  const saveButtonCandidates = [
    page.locator('#addCard'), // DuoCards submit button id
    page.getByRole("button", { name: /^save$/i }),
    page.getByRole("button", { name: /tallenna/i }),
    page.getByRole("button", { name: /done/i }),
    page.locator('button:has-text("Save")'),
    page.locator('button:has-text("Tallenna")'),
    page.locator('button:has-text("Done")'),
  ];

  return {
    addButtonCandidates,
    wordInputCandidates,
    meaningInputCandidates,
    sentenceInputCandidates,
    saveButtonCandidates,
  };
}

async function firstVisible(locatorCandidates, { timeoutMs = 1500 } = {}) {
  for (const loc of locatorCandidates) {
    try {
      await loc.first().waitFor({ state: "visible", timeout: timeoutMs });
      return loc.first();
    } catch {
      // try next
    }
  }
  return null;
}

function debugDir() {
  return path.resolve(".state", "debug");
}

async function writeDebugArtifacts(page, label) {
  try {
    fs.mkdirSync(debugDir(), { recursive: true });
    const ts = new Date().toISOString().replaceAll(":", "-");
    const base = path.join(debugDir(), `${ts}__${label}`);
    await page.screenshot({ path: `${base}.png`, fullPage: true });
    const html = await page.content();
    fs.writeFileSync(`${base}.html`, html, "utf8");
  } catch {
    // ignore debug failures
  }
}

async function maybeDebug(page, label, debug) {
  if (!debug) return;
  await writeDebugArtifacts(page, label);
}

export async function clickPlusToOpenAddDialog(page, { debug = false } = {}) {
  const { addButtonCandidates } = getLocators(page);
  const btn = await firstVisible(addButtonCandidates, { timeoutMs: 2500 });
  if (!btn) {
    await maybeDebug(page, "no-plus-button", debug);
    throw new Error(
      "Could not find the “+ / Add / Lisää” button. Re-run with --debug; a screenshot+HTML will be saved under tools/duocards/.state/debug/ so we can adjust selectors."
    );
  }
  await btn.click();
  // Wait for add-card form/dialog to open.
  await new Promise((r) => setTimeout(r, 800));
  await maybeDebug(page, "after-click-plus", debug);
}

async function firstClickable(locatorCandidates, { timeoutMs = 2500 } = {}) {
  for (const loc of locatorCandidates) {
    try {
      await loc.first().waitFor({ state: "visible", timeout: timeoutMs });
      return loc.first();
    } catch {
      // try next
    }
  }
  return null;
}

export async function exportCardsCsv(page, { debug = false, outPath } = {}) {
  // Expand the Cards section so export/download appears.
  const cardsHeaderCandidates = [
    page.getByText("Cards", { exact: true }),
    page.locator('div:has-text("Cards")').first(),
    page.locator('[class*="CardList__SPaper"]').first(),
  ];
  const cardsHeader = await firstClickable(cardsHeaderCandidates, { timeoutMs: 8000 });
  if (!cardsHeader) {
    await maybeDebug(page, "no-cards-header", debug);
    throw new Error('Could not find the "Cards" header to expand.');
  }
  await cardsHeader.click();
  await new Promise((r) => setTimeout(r, 600));
  await maybeDebug(page, "after-expand-cards", debug);

  // Locate the export/download button (icon-only).
  const downloadBtnCandidates = [
    // Exact button in DuoCards UI (per provided HTML snippet).
    page.locator('button[class*="CardList__SIconButton"]'),
    page.locator('button.MuiIconButton-root[class*="CardList__SIconButton"]'),
    // Match the Material "download" icon path used by DuoCards.
    page.locator(
      'button:has(svg[viewBox="0 0 24 24"] path[d^="M18 15v3H6v-3H4v3"])'
    ),
    page.locator('button:has([data-testid*="Download" i])'),
    page.locator('button:has([data-testid*="FileDownload" i])'),
    page.locator('[aria-label*="export" i]'),
    page.locator('[aria-label*="download" i]'),
    page.locator('[title*="export" i]'),
    page.locator('[title*="download" i]'),
    // MUI icon buttons in the Cards controls area
    page.locator('button.MuiIconButton-root:has(svg)').last(),
  ];
  const dlBtn = await firstClickable(downloadBtnCandidates, { timeoutMs: 8000 });
  if (!dlBtn) {
    await maybeDebug(page, "no-download-button", debug);
    throw new Error('Could not find the export/download button after expanding "Cards".');
  }

  const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
  await dlBtn.click();
  const download = await downloadPromise;

  const suggested = download.suggestedFilename() || "duocards_export.csv";
  const safeName = suggested.endsWith(".csv") ? suggested : `${suggested}.csv`;

  const downloadsDir = path.resolve(".state", "downloads");
  fs.mkdirSync(downloadsDir, { recursive: true });
  const ts = new Date().toISOString().replaceAll(":", "-");
  const tmpPath = path.join(downloadsDir, `${ts}__${safeName}`);

  // Default output: write to project root as latest_vocab.csv
  // (tools/duocards is expected cwd).
  const defaultOut = path.resolve("..", "..", "latest_vocab.csv");
  const target = outPath ? path.resolve(outPath) : defaultOut;

  await download.saveAs(tmpPath);
  await maybeDebug(page, "after-download-click", debug);

  // Copy to final destination and remove temp download.
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(tmpPath, target);
  fs.unlinkSync(tmpPath);

  return target;
}

export async function fillAndSaveCard(
  page,
  { word, meaning, sentence },
  { debug = false, skipIfSaveDisabledMs = 5000 } = {}
) {
  // Save button is a reliable anchor for the add-card form.
  const saveBtn = page.locator("#addCard").first();
  await saveBtn.waitFor({ state: "visible", timeout: 10000 });

  // Scope all inputs to the add-card form/dialog so we don't fill random inputs on the page.
  const form = saveBtn.locator("xpath=ancestor::form[1]");
  const textboxes = form.getByRole("textbox");

  const count = await textboxes.count();
  if (count < 2) {
    await maybeDebug(page, "no-textboxes-in-form", debug);
    throw new Error(
      `Could not find word/meaning inputs inside the add-card form (found ${count} textboxes). UI likely changed.`
    );
  }

  // Convention: 0=word, 1=meaning, 2=sentence (if present).
  await textboxes.nth(0).fill(word ?? "");
  await textboxes.nth(1).fill(meaning ?? "");
  if (count >= 3) {
    await textboxes.nth(2).fill(sentence ?? "");
  }

  await maybeDebug(page, "after-fill", debug);

  // If Save stays disabled after filling, treat as "already exists" and skip.
  const saveEnabled = await page
    .waitForFunction(
      () => {
        const btn = document.getElementById("addCard");
        return (
          !!btn &&
          !btn.classList.contains("Mui-disabled") &&
          !btn.hasAttribute("disabled")
        );
      },
      { timeout: skipIfSaveDisabledMs }
    )
    .then(() => true)
    .catch(async () => {
      await maybeDebug(page, "save-still-disabled", debug);
      return false;
    });

  if (!saveEnabled) {
    // Do not throw; caller can proceed to next card. Next fill() will overwrite fields.
    return { status: "skipped", reason: "save_disabled" };
  }

  await maybeDebug(page, "before-click-save", debug);

  try {
    await saveBtn.click({ timeout: 15000 });
  } catch (e) {
    await maybeDebug(page, "failed-click-save", debug);
    throw e;
  }

  await maybeDebug(page, "after-click-save", debug);
  return { status: "added" };
}

