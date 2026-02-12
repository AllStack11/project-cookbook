# URLs to Test

## Instagram

https://www.instagram.com/p/CigFqTODzPi/ -> fails

## Real LLM URL Artifact Suite

Run:

`RUN_LLM_URL_SUITE=true npm run test:llm-urls`

The suite loads `GEMINI_API_KEY` from `.env.local`.
`RUN_LLM_URL_SUITE` accepts: `true`, `1`, `yes`, `on`.

PowerShell (current terminal session):

`$env:RUN_LLM_URL_SUITE="true"; npm run test:llm-urls`

CMD:

`set RUN_LLM_URL_SUITE=true && npm run test:llm-urls`

Permanent option: add `RUN_LLM_URL_SUITE=true` to `.env.local`.

Optional env vars:

- `LLM_URL_SUITE_MODEL` (default: `gemini-3-flash-preview`)
- `LLM_URL_SUITE_DELAY_MS` (default: `750`)
- `LLM_URL_SUITE_SAVE_FULL_CONTENT=true` (include full extracted content in artifacts)

Output:

- `tmp/llm-extraction-runs/<timestamp>/manifest.json`
- `tmp/llm-extraction-runs/<timestamp>/summary.json`
- `tmp/llm-extraction-runs/<timestamp>/<index>-<caseId>.json`
