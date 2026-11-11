# CS Answer Desk – web front end

Next.js app for uParcel's Singapore CS team. It reads the knowledge base from `../knowledge-base/knowledge_base.json` (copied into `data/` before each build), and calls Claude from the server for **Ask** and **Reply checker**. The API key never reaches the browser.

## Features

| Tab | What it does | Needs the API key |
|---|---|---|
| Ask | SOP steps, a customer reply to copy, escalation, linked SOP entries. Falls back to the closest SOP entries if the AI is unavailable. | Yes |
| Playbooks | Step-by-step decision guides (job not accepted, late agent, failed delivery, claims…). | No |
| SOP library | Search and browse all entries; "Report wrong or outdated" builds a note to paste in the SG CS Chat. | No |
| Reply checker | Scores a draft reply against the SOP and suggests a better one. | Yes |
| Shift checklist | Timed checks for monitoring and support shifts, saved in the browser for the day. | No |
| Quiz | 19 questions, 80% pass mark; result can be copied for the team lead. | No |

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `APP_PASSWORD` | Yes | Password for the whole app (HTTP Basic auth, any username). The app refuses to serve anything until it is set, because the SOP is internal. |
| `ANTHROPIC_API_KEY` | For Ask / Reply checker | Claude API key from console.anthropic.com. |
| `ANTHROPIC_MODEL` | No | Claude model id. Defaults to `claude-sonnet-4-5`. |

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

- Feedback, checklist ticks and quiz scores aren't stored on a server: flags and quiz results are copied into the SG CS Chat, and ticks stay in the agent's browser.
- The knowledge base updates only when `knowledge-base/knowledge_base.json` is pushed. The claude.ai Answer Desk's daily refresh does not push to GitHub.
