const Plugin = require("./../src/models/plugin");
const { exec } = require("child_process");
const { safePath } = require("./../src/safe-path");

class CopyFileLinux extends Plugin {
  name() {
    return "Copy File (Linux)";
  }

  description() {
    return "Copy files or folders on a Linux system using the cp command.";
  }

  icon() {
    return "📋";
  }

  iconBase64() {
    return "data:image/png;base64,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";
  }

  tags() {
    return ["io", "linux"];
  }

  paramsDefinition() {
    return [
      {
        name: "Source Path",
        alias: "source_path",
        type: "string",
        default: undefined,
        value: undefined,
      },
      {
        name: "Destination Path",
        alias: "dest_path",
        type: "string",
        default: undefined,
        value: undefined,
      },
      {
        name: "Recursive",
        alias: "recursive",
        type: "boolean",
        default: false,
        value: undefined,
      },
      {
        name: "Preserve Attributes",
        alias: "preserve",
        type: "boolean",
        default: false,
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
    const sourcePath =
      params.source_path || (params.input && params.input.source_path);
    const destPath =
      params.dest_path || (params.input && params.input.dest_path);
    const recursive = params.recursive || false;
    const preserve = params.preserve || false;
    const baseDir = params.working_directory || "/data";
    const timeout = parseInt(params.timeout, 10) || 30000;

    if (!sourcePath || !destPath) {
      return {
        status: { error: true, message: "Both source_path and dest_path are required" },
        output: {},
      };
    }

    let resolvedSource, resolvedDest;
    try {
      resolvedSource = safePath(sourcePath, baseDir);
      resolvedDest = safePath(destPath, baseDir);
    } catch (err) {
      return { status: { error: true, message: err.message }, output: {} };
    }

    const flags = [];
    if (recursive) flags.push("-r");
    if (preserve) flags.push("-p");
    const flagStr = flags.length > 0 ? flags.join(" ") + " " : "";

    const command = `cp ${flagStr}"${resolvedSource}" "${resolvedDest}"`;

    return new Promise((resolve) => {
      exec(command, { timeout, cwd: baseDir }, (error, stdout, stderr) => {
        if (error) {
          resolve({
            status: { error: true, message: error.message },
            output: { stdout, stderr },
          });
        } else {
          resolve({
            status: { error: false, message: "File copied successfully" },
            output: {
              source_path: resolvedSource,
              dest_path: resolvedDest,
              stdout: stdout.trim(),
            },
          });
        }
      });
    });
  }
}

module.exports = CopyFileLinux;
