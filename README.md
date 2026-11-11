# uParcel CS Answer Desk

An internal tool for uParcel's Singapore customer service and fulfilment team. Agents describe a situation in plain words and get the exact SOP steps, a reply they can send, and who to escalate to.

There are two versions: a claude.ai artifact (knowledge base in the artifact's database, refreshed daily) and a standalone Next.js web app in `frontend/` that reads `knowledge-base/knowledge_base.json`. This repo also keeps the scripts that built the knowledge base.

## What's in the app

- **Ask** – answers from the SOP only, with a copyable customer reply and escalation. Says so when the SOP doesn't cover a question.
- **Playbooks** – step-by-step guides: job not accepted, late agent, late delivery, failed delivery, failed pickup, claims, date/address change.
- **SOP library** – every rule, searchable, with a "report wrong or outdated" button.
- **Reply checker** – scores a draft reply against the SOP and suggests a complete version.
- **Shift checklist** – timed checks for delivery monitoring and the support shift, saved per agent per day.
- **Quiz** – 19 questions, 80% pass mark. Leads see results on the Review tab.

## Repo layout

| Path | Contents |
|---|---|
| `frontend/` | Standalone Next.js web app (deploy on Vercel). See `frontend/README.md`. |
| `app/index.html` | Page source of the claude.ai artifact version (the artifact adds the HTML skeleton at publish time). |
| `knowledge-base/knowledge_base.json` | All collections in one file: `sop`, `playbooks`, `checklist`, `quiz`, `meta`. |
| `knowledge-base/seed/<collection>/<id>.json` | One file per database document, as seeded. |
| `scripts/build_seed.py` | Builds the entries taken from the *Operations Master SOP 2026*. |
| `scripts/build_web.py` | Builds the entries taken from uparcel.sg (FAQ, rates, T&C). |
| `docs/knowledge-base-prompt.md` | The original build prompt. |
| `docs/daily-refresh-prompt.md` | What the daily refresh task does. |

Rebuild the seed files with `python3 scripts/build_seed.py <out_dir>` and `python3 scripts/build_web.py <out_dir>`.

## Sources

- *uParcel Operations Master SOP 2026* (Zoho WorkDrive) – internal handling.
- uparcel.sg FAQ, rates and Terms & Conditions – customer-facing numbers.

## Known gaps

- **Job price amendments** – not covered by any source yet; agents are told to check with their lead.
- **Needs review** – 4 entries where the website and SOP disagree: claim deadline, cancellation fee cap, return fee, customer service hours.
- **Reply standards** – drafted, awaiting confirmation from the Support lead.

This repository contains internal operating procedures. Keep it private.
