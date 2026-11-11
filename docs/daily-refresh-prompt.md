# Daily refresh task

A scheduled task ("CS Answer Desk daily SOP refresh") runs every day at 2:10am Singapore time. It:

1. Reads the Answer Desk database (`sop`, `playbooks`, `quiz`, `feedback`, `meta/info`).
2. Checks Zoho WorkDrive for SOP documents changed in the last day (primary source: *uParcel Operations Master SOP 2026*). Read only.
3. Re-reads the public website: `uparcel.sg/zh/faq` (the English FAQ hides its answers), `uparcel.sg/rates` and `uparcel.sg/terms-and-conditions`.
4. Updates entries whose rules changed using pinned writes. Ambiguous changes and website-vs-SOP conflicts are set to `needs_review` instead of guessed. Nothing is ever deleted.
5. Works through agent feedback: fixes entries a source supports, and logs `gap` entries for questions no source covers.
6. Updates `meta/info.lastRefreshed` and reports a short summary.
