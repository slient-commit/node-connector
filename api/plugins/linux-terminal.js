const Plugin = require("./../src/models/plugin");
const { exec } = require("child_process");
const os = require("os");

class LinuxTerminal extends Plugin {
  name() {
    return "Linux Terminal";
  }

  description() {
    return "Execute bash/shell commands on a Linux system.";
  }

  icon() {
    return "🐧";
  }

  iconBase64() {
    return "data:image/png;base64,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";
  }

  tags() {
    return ["terminal", "linux"];
  }

  paramsDefinition() {
    return [
      {
        name: "Command",
        alias: "command",
        type: "big_string",
        default: "ls -la",
        value: undefined,
      },
      {
        name: "Working Directory",
        alias: "working_directory",
        type: "string",
        default: "/data",
        value: undefined,
      },
      {
        name: "Timeout (ms)",
        alias: "timeout",
        type: "number",
        default: 30000,
        value: undefined,
      },
    ];
  }

  async logic(params = {}) {
    const command = params.command;
    if (!command) {
      return {
        status: { error: true, message: "Command is required" },
        output: {},
      };
    }

    const isWindows = os.platform() === "win32";
    const cwd = params.working_directory || (isWindows ? process.cwd() : "/data");
    const timeout = params.timeout || 30000;
    const shell = isWindows ? true : "/bin/bash";

    this.log("Executing: " + command);

    const result = await new Promise((resolve) => {
      exec(
        command,
        { cwd, timeout, shell },
        (err, stdout, stderr) => {
          if (err) {
            resolve({
              status: { error: true, message: err.message },
              stdout: "",
              stderr: stderr || err.message,
              exitCode: err.code || 1,
            });
          } else {
            resolve({
              status: { error: false, message: "Command executed" },
              stdout: stdout,
              stderr: stderr,
              exitCode: 0,
            });
          }
        }
      );
    });

    this.log("Exit code: " + result.exitCode);
    if (result.stdout) this.log("stdout: " + result.stdout.trim());
    if (result.stderr) this.log("stderr: " + result.stderr.trim());

    // Try to parse stdout as JSON, otherwise return as string
    let output;
    const trimmed = (result.stdout || "").trim();
    try {
      output = JSON.parse(trimmed);
    } catch {
      output = { result: trimmed };
    }
    output.exitCode = result.exitCode;
    if (result.stderr) output.stderr = result.stderr.trim();

    return {
      status: result.status,
      output,
    };
  }
}

module.exports = LinuxTerminal;
