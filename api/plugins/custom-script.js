const Plugin = require("./../src/models/plugin");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const parser = require("@babel/parser");

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

  paramsDefinition() {
    return [
      {
        name: "Script",
        alias: "script",
        type: "big_string",
        default: "// write a javascript code",
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
    let result = await new Promise(async (resolve) => {
      let _result = {};
      // Create a temporary file name
      const tempFileName = "temp_script.js";
      const tempFilePath = path.join(__dirname, tempFileName);
      const code = `${params.script}\n\rawait main()`;
      // Step 1: Write the code string to the temporary file
      fs.writeFile(tempFilePath, params.script, (writeErr) => {
        if (writeErr) {
          console.error("Error writing temporary file:", writeErr.message);
          return;
        }

        // Step 2: Execute the temporary file using child_process
        const command = `node ${tempFilePath}`;
        exec(command, (execErr, stdout, stderr) => {
          if (execErr) {
            error = true;
            console.error("Error executing script:", execErr.message);
            message = execErr.message;
          } else {
            _result = stdout;
            if (stderr) {
              console.error("Script stderr:", stderr);
            }
          }

          // Step 3: Delete the temporary file
          fs.unlink(tempFilePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error(
                "Error deleting temporary file:",
                unlinkErr.message
              );
            }
          });
          resolve(_result);
        });
      });
    });
    this.log("Output: " + result);
    return {
      status: {
        error: error,
        message: message,
      },
      output: result,
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
