const Plugin = require("./../src/models/plugin");
const { exec } = require("child_process");
const os = require("os");

class PowerShell extends Plugin {
  name() {
    return "PowerShell";
  }

  description() {
    return "Execute PowerShell scripts.";
  }

  icon() {
    return "💠";
  }

  iconBase64() {
    return "data:image/png;base64,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";
  }

  tags() {
    return ["terminal", "windows"];
  }

  paramsDefinition() {
    return [
      {
        name: "Script",
        alias: "script",
        type: "big_string",
        default: 'Write-Output "Hello World"',
        value: undefined,
      },
      {
        name: "Working Directory",
        alias: "working_directory",
        type: "string",
        default: "",
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
    const script = params.script;
    if (!script) {
      return { status: { error: true, message: "Script is required" }, output: {} };
    }

    const isWindows = os.platform() === "win32";
    const cwd = params.working_directory || process.cwd();
    const timeout = parseInt(params.timeout, 10) || 30000;
    const shell = isWindows ? "powershell.exe" : "pwsh";

    // Use -EncodedCommand with base64 to avoid escaping issues
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    const command = `${shell} -NoProfile -NonInteractive -EncodedCommand ${encoded}`;

    this.log("Executing PowerShell script...");

    const result = await new Promise((resolve) => {
      exec(command, { cwd, timeout }, (err, stdout, stderr) => {
        if (err) {
          resolve({
            status: { error: true, message: err.message },
            stdout: "",
            stderr: stderr || err.message,
            exitCode: err.code || 1,
          });
        } else {
          resolve({
            status: { error: false, message: "Script executed" },
            stdout: stdout,
            stderr: stderr,
            exitCode: 0,
          });
        }
      });
    });

    this.log("Exit code: " + result.exitCode);
    if (result.stdout) this.log("stdout: " + result.stdout.trim());
    if (result.stderr) this.log("stderr: " + result.stderr.trim());

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

module.exports = PowerShell;
