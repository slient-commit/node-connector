const fs = require("fs");
const path = require("path");
const { Client } = require("basic-ftp");
const Plugin = require("./../src/models/plugin");

class FTPTool extends Plugin {
  description() {
    return "FTP";
  }

  name() {
    return "FTP";
  }

  icon() {
    return "📤";
  }

  iconBase64() {
    return "data:image/png;base64,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";
  }

  tags() {
    return ["network"];
  }

  paramsDefinition() {
    return [
      {
        name: "Host IP",
        alias: "host",
        type: "string",
        default: undefined,
        value: undefined,
      },
      {
        name: "Username",
        alias: "username",
        type: "string",
        default: undefined,
        value: undefined,
      },
      {
        name: "Password",
        alias: "password",
        type: "string",
        secret: true,
        default: undefined,
        value: undefined,
      },
      {
        name: "Local file path",
        alias: "local_file_path",
        type: "string",
        default: undefined,
        value: undefined,
      },
      {
        name: "Remote folder path",
        alias: "remote_folder_path",
        type: "string",
        default: "/",
        value: undefined,
      },
    ];
  }

  getFileNameAndExtension(path) {
    // Get everything after the last slash (in case of a full path)
    const fileName = path.split("\\").pop().split("/").pop();

    // Split into name and extension
    const lastDotIndex = fileName.lastIndexOf(".");
    const name =
      lastDotIndex === -1 ? fileName : fileName.slice(0, lastDotIndex);
    const ext = lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex + 1);

    return `${name}.${ext}`;
  }

  async logic(params = {}) {
    const client = new Client();

    try {
      this.log("Connecting to host: " + params.host);
      await client.access({
        host: params.host,
        user: params.username,
        password: params.password,
        port: 21,
        secure: false,
      });

      const localFilePath = path.resolve(__dirname, params.local_file_path);
      const remoteFilePath = `${
        params.remote_folder_path
      }/${this.getFileNameAndExtension(params.local_file_path)}`;

      const stat = fs.statSync(localFilePath);
      const totalSize = stat.size;

      this.log(
        `Uploading: ${localFilePath} -> ${remoteFilePath} (${this.formatBytes(totalSize)})`,
      );

      // Track upload progress live
      let lastLoggedPercent = -1;
      client.trackProgress((info) => {
        if (totalSize > 0) {
          const percent = Math.floor((info.bytes / totalSize) * 100);
          if (percent !== lastLoggedPercent && percent % 5 === 0) {
            lastLoggedPercent = percent;
            this.log(`Uploading: ${percent}% (${this.formatBytes(info.bytes)} / ${this.formatBytes(totalSize)})`);
          }
        }
      });

      // Upload using file path directly — basic-ftp handles the stream internally
      await client.uploadFrom(localFilePath, remoteFilePath);

      // Stop tracking after upload
      client.trackProgress();

      this.log("File upload completed.");

      return {
        status: { error: false, message: "" },
        output: { size: this.formatBytes(totalSize) },
      };
    } catch (err) {
      this.log("Error uploading file: " + err.message, "error");
      return {
        status: { error: true, message: err.message },
        output: {},
      };
    } finally {
      client.close();
    }
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
module.exports = FTPTool;
