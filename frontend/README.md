# CS Answer Desk – web front end

Next.js app for uParcel's Singapore CS team. The knowledge base lives in **DynamoDB** (connected through Vercel's AWS integration). Agents read it live; team leads edit it at `/editor`; the nightly refresh writes to it through the admin API. Claude is called from the server for **Ask** and **Reply checker**; the API key never reaches the browser.

On first start with an empty table, the app imports `../knowledge-base/knowledge_base.json` (copied into `data/` at build). After that the database is the source of truth and the JSON file is only a starting copy.

## Who changes what

| Who | Where | Rule |
|---|---|---|
| Team leads | `/editor` (name + `EDITOR_PASSWORD`) | Edit, create or retire SOP entries. Saves are live immediately and marked as human-edited. |
| Nightly refresh | `PUT /api/admin/item` with `mode: "refresh"` | Updates untouched entries. For human-edited entries it stores a **suggestion** that a lead accepts or rejects in the editor. |
| Claude on request | `PUT /api/admin/item` with `mode: "human"` | Direct change you asked for. |

Every write needs the version the writer last read; a stale save is rejected (409) instead of overwriting. Every change is logged with before/after text and can be restored from the editor.

## Admin API (Bearer `ADMIN_API_KEY`)

- `GET /api/admin/kb` – all collections with `version`, `humanEdited`, `suggestion`.
- `PUT /api/admin/item` – `{ collection, id, data, expectedVersion, mode, by, reason }`. `expectedVersion: 0` creates a new item.
- `GET /api/admin/feedback`, `POST /api/admin/feedback {key}` – agent flags.

## Features

| Tab | What it does | Needs the API key |
|---|---|---|
| Ask | SOP steps, a customer reply to copy, escalation, linked SOP entries. Falls back to the closest SOP entries if the AI is unavailable. | Yes |
| Playbooks | Step-by-step decision guides (job not accepted, late agent, failed delivery, claims…). | No |
| SOP library | Search and browse all entries; "Report wrong or outdated" sends a flag to the editors. | No |
| Reply checker | Scores a draft reply against the SOP and suggests a better one. | Yes |
| Shift checklist | Timed checks for monitoring and support shifts, saved in the browser for the day. | No |
| Quiz | 19 questions, 80% pass mark; result can be copied for the team lead. | No |

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `APP_PASSWORD` | Yes | Password for the whole app (HTTP Basic auth, any username). The app refuses to serve anything until it is set, because the SOP is internal. |
| `ANTHROPIC_API_KEY` | For Ask / Reply checker | Claude API key from console.anthropic.com. |
| `ANTHROPIC_MODEL` | No | Claude model id, e.g. `claude-sonnet-5-5`. |
| `EDITOR_PASSWORD` | For `/editor` | Shared password for team leads. Changing it signs everyone out. |
| `ADMIN_API_KEY` | For the nightly refresh | Bearer key for `/api/admin/*`. |
| `AWS_ROLE_ARN`, `AWS_REGION`, `DYNAMODB_TABLE_*` | Yes | Added automatically by the Vercel DynamoDB integration. |

## Run locally

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

## Deploy on Vercel

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `frontend` and keep "Include files outside the root directory" on (the build copies `../knowledge-base/knowledge_base.json`).
3. Add `APP_PASSWORD` and `ANTHROPIC_API_KEY` under Environment Variables.
4. Deploy. Every push that changes `knowledge-base/knowledge_base.json` redeploys with the new answers.

## Limits

- Checklist ticks stay in the agent's browser; quiz results are copied to the SG CS Chat.
- The editor edits SOP entries. Playbooks, quiz and checklists are changed through the admin API (ask Claude).
