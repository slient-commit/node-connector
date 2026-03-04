const Plugin = require("./../src/models/plugin");
const { Client } = require("ssh2");

class SSHTool extends Plugin {
  description() {
    return "SSH Tool";
  }

  name() {
    return "SSH";
  }

  icon() {
    return "🔐";
  }

  paramsDefinition() {
    return [
      {
        name: "Host IP",
        alias: "ssh_host",
        type: "string",
        default: undefined,
        value: undefined,
      },
      {
        name: "Username",
        alias: "ssh_username",
        type: "string",
        default: undefined,
        value: undefined,
      },
      {
        name: "Password",
        alias: "ssh_password",
        type: "string",
        default: undefined,
        value: undefined,
      },
      {
        name: "CMD",
        alias: "ssh_cmd",
        type: "string",
        default: undefined,
        value: undefined,
      },
    ];
  }

  async logic(params = {}) {
    let error = false;
    let message = "All commands executed successfully.";
    await new Promise((_resolve) => {
      // Configuration for the SSH connection
      const sshConfig = {
        host: params.ssh_host, // Replace with your SSH server's hostname or IP
        port: 22, // Default SSH port is 22
        username: params.ssh_username, // Replace with your SSH username
        password: params.ssh_password, // Replace with your SSH password (or use privateKey)
        // privateKey: require('fs').readFileSync('/path/to/private/key'), // Uncomment if using key-based auth
      };
      const commands = params.ssh_cmd.split(",");
      // Create an SSH client
      const sshClient = new Client();
      // Connect to the SSH server
      sshClient.on("ready", () => {
        this.log("SSH connection established.");

        // Function to execute commands sequentially
        const executeCommands = async (cmds) => {
          for (const cmd of cmds) {
            await new Promise((resolve, reject) => {
              sshClient.exec(cmd.trim(), (err, stream) => {
                if (err) {
                  this.log(
                    `Error executing command "${cmd}": ${err.message}`,
                    "error"
                  );
                  console.error(
                    `Error executing command "${cmd}":`,
                    err.message
                  );
                  return reject(err);
                }

                // Handle data from the command execution
                stream.on("data", (data) => {
                  this.log(`Output of "${cmd}":\n${data}`);
                });

                // Handle errors from the command execution
                stream.stderr.on("data", (data) => {
                  this.log(`Error output of "${cmd}":\n${data}`, "error");
                });

                // Resolve the promise when the command finishes
                stream.on("close", (code, signal) => {
                  this.log(`Command "${cmd}" exited with code ${code}`);
                  resolve();
                });
              });
            });
          }
        };

        // Execute all commands and close the connection
        executeCommands(commands)
          .then(() => {
            console.log("All commands executed successfully.");
            message = "All commands executed successfully.";
            sshClient.end(); // Close the SSH connection
            _resolve();
          })
          .catch((err) => {
            error = true;
            message = "Failed to execute commands:" + err.message;
            console.error("Failed to execute commands:", err.message);
            this.log("Failed to execute commands:" + err.message, "error");
            sshClient.end(); // Ensure the connection is closed even if there's an error
            _resolve();
          });
      });

      // Handle connection errors
      sshClient.on("error", (err) => {
        error = true;
        message = "SSH connection error:" + err.message;
        this.log("SSH connection error:" + err.message, "error");
        _resolve();
      });

      // Connect to the SSH server
      sshClient.connect(sshConfig);
    });

    return {
      status: {
        error: error,
        message: message,
      },
      output: {},
    };
  }
}
module.exports = SSHTool;
