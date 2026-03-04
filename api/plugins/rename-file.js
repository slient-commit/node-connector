const fs = require("fs");
const path = require("path");
const Plugin = require("./../src/models/plugin");

class RenameFile extends Plugin {
  name() {
    return "Rename File";
  }

  description() {
    return "Rename or move a file on the host file system. Provide the current file path and the new file path.";
  }

  icon() {
    return "📝";
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
    ];
  }

  async logic(params = {}) {
    const sourcePath = params.source_path || (params.input && params.input.source_path);
    const destPath = params.dest_path || (params.input && params.input.dest_path);

    if (!sourcePath || !destPath) {
      return {
        status: { error: true, message: "Both source_path and dest_path are required" },
        output: {},
      };
    }

    const resolvedSource = path.resolve(sourcePath);
    const resolvedDest = path.resolve(destPath);

    try {
      if (!fs.existsSync(resolvedSource)) {
        return {
          status: { error: true, message: `File not found: ${resolvedSource}` },
          output: {},
        };
      }

      // Ensure destination directory exists
      const destDir = path.dirname(resolvedDest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.renameSync(resolvedSource, resolvedDest);

      return {
        status: { error: false, message: "File renamed successfully" },
        output: {
          source_path: resolvedSource,
          dest_path: resolvedDest,
          filename: path.basename(resolvedDest),
        },
      };
    } catch (err) {
      return {
        status: { error: true, message: err.message },
        output: {},
      };
    }
  }
}

module.exports = RenameFile;
