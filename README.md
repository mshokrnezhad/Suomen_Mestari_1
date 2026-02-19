# Suomen Mestari 1 — Structured Content & Notion Learning

This project is a **workflow** for turning the textbook *Suomen Mestari 1* into structured, exam-ready material and using it to learn Finnish. The workflow has three main steps: **(1)** use Cursor agents to extract structured content from the book, **(2)** upload that content to Notion, and **(3)** use Q&A and practice (e.g. flashcards, drills) in Notion to understand and learn Finnish—with a focus on YKI B1 (Grade 3) speaking and writing.

The value is a clear path from raw lesson text to organized grammar, vocabulary, and training tasks in Notion, so you can study and ask questions in one place.

## Table of Contents

- [Workflow Overview](#workflow-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Thank You & Contributing](#thank-you--contributing)

## Workflow Overview

- **Step 1 — Extract with Cursor agents**  
  Use the agent spec in `instructions.md` (and step prompts like `step1.md`) to extract from each lesson:
  - Grammar (rules, examples, validation), core vocabulary (nouns, verbs, adjectives, connectors), and useful chunks/expressions.
  - YKI B1–oriented speaking and writing training: monologues, role-plays, Q&A sets, model texts (80–120 words), substitution/transform/case drills, and an error-log template.  
  Output is saved as Markdown in lesson folders (e.g. `07/processed_data/`, `08/processed_data/`) with filenames like `*__yki_b1_speaking_writing_training.md`.

- **Step 2 — Upload to Notion**  
  Connect to your Notion workspace and write the processed Markdown into the right pages (e.g. under “Suomen Mestari 1” → “Lesson 7”). Step prompts (e.g. `step2.md`) define which file goes to which Notion page so all material lives in one place for study and Q&A.

- **Step 3 — Q&A and practice**  
  From the same Notion pages (e.g. “Suomen Mestari 1” / “Lesson 7”), run the practice workflow (e.g. as in `tools/duocards/RUNBOOK.md`) step by step. This is where you do Q&A, drills, and repetition to understand and learn Finnish using the extracted content.

## Project Structure

- **`instructions.md`** — Agent spec for lesson → YKI B1 (Speaking + Writing) extraction: what to extract (grammar, vocabulary, chunks, training tasks), constraints, and output Markdown format.
- **`step1.md`**, **`step2.md`**, **`step3.md`** — Short prompts to run each workflow step with Cursor (extract one lesson, upload to Notion, run practice runbook).
- **`07/`, `08/`, …** — Per-lesson folders; each typically has raw/processed lesson content and a `processed_data/` subfolder with the generated training Markdown and any exports (e.g. CSV for cards).
- **`tools/duocards/`** — Scripts and runbook for turning Notion content into practice (e.g. flashcards); used in Step 3.
- **`Project_Readme_Guideline.md`** — Guideline used to generate this README.

## Getting Started

1. **Prerequisites**
   - [Cursor](https://cursor.com) (with agent/chat available).
   - A Notion workspace and a page structure (e.g. “Suomen Mestari 1” with one page per lesson).
   - The *Suomen Mestari 1* lesson content available in the repo (e.g. as `NN/` folders and/or `NN/processed_data/NN.md` or similar).

2. **Step 1 — Extract one lesson**
   - Open the lesson file (e.g. `08/processed_data/08.md` or as in `step1.md`).
   - In Cursor, run the task described in `step1.md`: follow `instructions.md` for that lesson so the agent produces the YKI B1 training Markdown. Ensure the grammar section includes every grammar topic taught in the lesson.
   - Output will appear in the same lesson folder (e.g. `08/processed_data/08__...__yki_b1_speaking_writing_training.md`).

3. **Step 2 — Upload to Notion**
   - Use the prompt in `step2.md`: connect to Notion, locate the target page (e.g. “Suomen Mestari 1” → “Lesson 7”), and paste or import the content from the corresponding `processed_data` Markdown file (e.g. `07__kylassa__yki_b1_speaking_writing_training.md`).

4. **Step 3 — Q&A and practice**
   - Use the prompt in `step3.md`: connect to Notion, open the same lesson page (e.g. “Suomen Mestari 1” / “Lesson 7”), and run `tools/duocards/RUNBOOK.md` step by step to do Q&A and practice from that page.

Repeat Steps 1–3 for other lessons as you work through the book.

---

## Thank You <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Folded%20Hands.png" alt="Folded Hands" width="20" height="20" />

Thanks for checking out **Suomen Mestari 1 — Structured Content & Notion Learning**. We hope this workflow makes it easier to go from the book to structured material in Notion and to use Q&A and practice to understand and learn Finnish.

**How you can contribute:**
- Improve extraction: refine `instructions.md` or step prompts so grammar, vocabulary, and training tasks better match YKI B1 and the book.
- Share Notion structure: document or suggest page layouts and templates that work well for Q&A and drills.
- Extend practice: suggest or add runbook steps, flashcard formats, or question types that help with speaking and writing.
- Report issues: missing grammar points, wrong vocabulary, or unclear steps in the workflow.

We look forward to your ideas and contributions.
