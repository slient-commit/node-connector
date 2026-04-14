#!/usr/bin/env node
const path = require("path");
const { TextDecoder } = require("util");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const sheetUid = process.argv[2];

if (!sheetUid) {
  console.error("Usage: node cli.js <sheet-uid> [--params '{\"key\":\"value\"}']");
  process.exit(1);
}

// Parse --params argument
let inputParams = null;
const paramsIndex = process.argv.indexOf("--params");
if (paramsIndex !== -1 && process.argv[paramsIndex + 1]) {
  try {
    inputParams = JSON.parse(process.argv[paramsIndex + 1]);
  } catch {
    console.error("Error: --params must be valid JSON");
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3001;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

if (!INTERNAL_API_KEY) {
  console.error("Error: INTERNAL_API_KEY environment variable is required.");
  process.exit(1);
}
const BASE_URL = `http://localhost:${PORT}`;

async function execute() {
  try {
    const payload = { sheetUid, triggerType: "terminal" };
    if (inputParams) payload.params = inputParams;

    const res = await fetch(`${BASE_URL}/sheet/execute-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": INTERNAL_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error(`Error (${res.status}):`, data.message || data);
      process.exit(1);
    }

    // Read SSE stream for live progress
    const decoder = new TextDecoder();
    let buffer = "";

    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = JSON.parse(line.slice(6));

        if (data.id === "batch-complete") {
          // Final summary
          console.log(`\nSheet "${data.sheetName}" executed.\n`);
          for (const root of data.results) {
            console.log(`Root: ${root.rootNodeTitle} [${root.status}]`);
            if (root.error) {
              console.error(`  Error: ${root.error}`);
            }
            if (root.nodes) {
              for (const node of root.nodes) {
                console.log(`  -> ${node.title}:`, JSON.stringify(node.result));
              }
            }
            console.log();
          }
        } else {
          // Live progress
          const label = data.title || data.id;
          console.log(`[${label}] ${data.message}`);
        }
      }
    }
  } catch (err) {
    console.error("Failed to connect to API:", err.message);
    process.exit(1);
  }
}

execute();
