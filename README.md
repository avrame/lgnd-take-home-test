# LGND Take Home Test

## Prerequisites
- Git installed
- npm installed
- The [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed
- You have an Anthropic API Key

## Installation
- pull down this repo: `git clone git@github.com:avrame/lgnd-take-home-test.git`
- change to the project directory: `cd lgnd-take-home-test`
- install the npm dependencies: `npm install`
- download the DuckDB embeddings database file: `aws s3 cp --no-sign-request s3://lgnd-fullstack-takehome/embeddings.db .`
- Set the env var called `ANTHROPIC_API_KEY` to your Anthropic API Key

## Running
- start the MCP server: `npm run start:mcp`
- open a 2nd terminal and start the API server: `npm run start:api`
- open a 3rd terminal and start the Vite server: `npm run dev`
- open `http://localhost:5173/` in your browser to load the app

---

## Demo
[Video](https://www.icloud.com/iclouddrive/06d4j-8X8Ttx4ICyRTNnoStXA#Screen_Recording_2025-11-17_at_11.27.53%E2%80%AFPM)

---

## Known limitations
If Claude doesn't find any results in the first Open Street Map query and then wants to try a different named tag in a second query, the code doesn't handle this situation and gets stuck.

I limited the Open Street Map results to the top five because it returns too many to effectively list in the chat view. Each feature returns a maximum of six similar imagery results. This could easily be changed to something larger, but it might slow things down a bit.
