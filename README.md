# LGND Take Home Test

## Prerequisites
- Git installed
- npm installed
- The [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed

## Installation
- pull down this repo: `git clone git@github.com:avrame/lgnd-take-home-test.git`
- change to the project directory: `cd lgnd-take-home-test`
- install the npm dependencies: `npm install`
- download the DuckDB embeddings database file: `aws s3 cp --no-sign-request s3://lgnd-fullstack-takehome/embeddings.db .`

## Running
- start the MCP server: `npm run start:mcp`
- open a 2nd terminal and start the API server: `npm run start:api`
- open a 3rd terminal and start the Vite server: `npm run dev`
- open `http://localhost:5173/` in your browser to load the app