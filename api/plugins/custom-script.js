const Plugin = require("./../src/models/plugin");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");
const path = require("path");
const parser = require("@babel/parser");

const EXECUTION_TIMEOUT = 30000; // 30 seconds

// Modules blocked inside custom scripts to prevent process spawning and network access
const BLOCKED_MODULES = [
  "child_process", "cluster", "worker_threads",
  "net", "dgram", "tls", "http", "http2", "https", "dns",
];

// Build a require guard injected at the top of every script
const REQUIRE_GUARD = `
const _origRequire = require;
const _blocked = new Set(${JSON.stringify(BLOCKED_MODULES)});
require = function(mod) {
  if (_blocked.has(mod)) throw new Error('Module "' + mod + '" is not allowed in custom scripts');
  return _origRequire(mod);
};
`;

// Minimal environment for the child process (strip secrets)
function getSafeEnv() {
  return {
    PATH: process.env.PATH || "",
    HOME: process.env.HOME || process.env.USERPROFILE || "",
    TMPDIR: process.env.TMPDIR || os.tmpdir(),
    NODE_ENV: process.env.NODE_ENV || "development",
  };
}

class CustomScript extends Plugin {
  description() {
    return "You can write a custom NodeJs (Javascript) code and it will be executed in the local system.";
  }

  name() {
    return "Custom Script";
  }

  icon() {
    return "📜";
  }

  iconBase64() {
    return "data:image/png;base64,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";
  }

  tags() {
    return ["script"];
  }

  paramsDefinition() {
    return [
      {
        name: "Script",
        alias: "script",
        type: "big_string",
        default: "// write a javascript code\nasync function main() {\n  const fs = require('fs');\n  const files = fs.readdirSync('.');\n  output({ files });\n}",
        value: undefined,
      },
      {
        name: "Working Directory",
        alias: "working_directory",
        type: "string",
        default: "/data",
        value: undefined,
      },
    ];
  }
  hasMainFunction(codeString) {
    try {
      // Parse the code string into an AST
      const ast = parser.parse(codeString, {
        sourceType: "module",
        plugins: ["asyncGenerators", "classProperties", "objectRestSpread"],
      });

      // Traverse the AST to find an async function named "main"
      return ast.program.body.some(
        (node) =>
          node.type === "FunctionDeclaration" &&
          node.async &&
          node.id?.name === "main"
      );
    } catch (error) {
      console.error("Error parsing code:", error.message);
      return false;
    }
  }

  async logic(params = {}) {
    let message = "Code executed";
    let error = false;
    if (!this.hasMainFunction(params.script)) {
      return {
        status: {
          error: true,
          message: "Function main not found!",
        },
        output: {},
      };
    }
    const cwd = params.working_directory || "/data";
    const input = params.input || {};
    let result = await new Promise((resolve) => {
      let _result = {};
      // Create a secure temporary directory with unpredictable name
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-script-"));
      const tempFilePath = path.join(tempDir, `script-${crypto.randomBytes(16).toString("hex")}.js`);
      // Inject require guard, input data, and output helper
      const code = `${REQUIRE_GUARD}\nconst input = ${JSON.stringify(input)};\nfunction output(data) { console.log(JSON.stringify(data)); }\n${params.script}\n(async()=>{await main();})();`;
      // Step 1: Write the code string to the temporary file with restrictive permissions
      fs.writeFile(tempFilePath, code, { mode: 0o600 }, (writeErr) => {
        if (writeErr) {
          console.error("Error writing temporary file:", writeErr.message);
          fs.rmSync(tempDir, { recursive: true, force: true });
          return;
        }

        // Step 2: Execute the temporary file using execFile (no shell) with timeout and safe env
        execFile("node", [tempFilePath], { cwd, env: getSafeEnv(), timeout: EXECUTION_TIMEOUT }, (execErr, stdout, stderr) => {
          if (execErr) {
            error = true;
            const isTimeout = execErr.killed || execErr.signal === "SIGTERM";
            const errMsg = isTimeout ? `Script timed out after ${EXECUTION_TIMEOUT / 1000}s` : execErr.message;
            console.error("Error executing script:", errMsg);
            message = errMsg;
          } else {
            _result = stdout;
            if (stderr) {
              console.error("Script stderr:", stderr);
            }
          }

          // Step 3: Delete the entire temporary directory
          fs.rm(tempDir, { recursive: true, force: true }, (rmErr) => {
            if (rmErr) {
              console.error("Error deleting temporary directory:", rmErr.message);
            }
          });
          resolve(_result);
        });
      });
    });
    this.log("Output: " + result);
    // Try to parse stdout as JSON for structured output, otherwise wrap as { result: string }
    let output;
    if (typeof result === "string") {
      const trimmed = result.trim();
      try {
        output = JSON.parse(trimmed);
      } catch {
        output = { result: trimmed };
      }
    } else {
      output = result;
    }
    return {
      status: {
        error: error,
        message: message,
      },
      output,
    };
  }

  formatBytes(bytes) {
    // If the input is less than 1 KB, return in bytes
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    // If the input is between 1 KB and 1 MB, return in KB
    else if (bytes >= 1024 && bytes < 1024 * 1024) {
      const kb = (bytes / 1024).toFixed(2); // Convert to KB with 2 decimal places
      return `${kb} KB`;
    }
    // If the input is 1 MB or more, return in MB
    else {
      const mb = (bytes / (1024 * 1024)).toFixed(2); // Convert to MB with 2 decimal places
      return `${mb} MB`;
    }
  }
}
module.exports = CustomScript;
