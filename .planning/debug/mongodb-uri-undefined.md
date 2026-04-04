---
status: investigating
trigger: "Backend crashes on startup with: MongooseError: The `uri` parameter to `openUri()` must be a string, got "undefined"."
created: 2026-04-04T00:00:00.000Z
updated: 2026-04-04T00:00:00.000Z
---

## Current Focus
hypothesis: MONGODB_URI environment variable is not being loaded from .env file before connection.js tries to use it
test: Read connection.js and index.js to trace how MONGODB_URI is loaded
expecting: Find where .env should be loaded and verify it's being loaded before connection.js
next_action: Read src/db/connection.js and src/index.js to understand the loading sequence

## Symptoms
expected: Backend should connect to MongoDB Atlas using MONGODB_URI from .env file
actual: Server crashes because MONGODB_URI is undefined
errors:
  - "MongooseError: The `uri` parameter to `openUri()` must be a string, got "undefined"."
reproduction: Run `npm start` or start the server - it crashes immediately
started: Unknown - likely since deployment or recent changes to env loading

## Eliminated

## Evidence
- timestamp: 2026-04-04T00:00:00.000Z
  checked: Error message
  found: "src/db/connection.js:16:32" in connectDB() function
  implication: The connectDB function receives undefined instead of a valid URI string

## Resolution
root_cause: 
fix: 
verification: 
files_changed: []
