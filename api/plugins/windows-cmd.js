const Plugin = require("./../src/models/plugin");
const { exec } = require("child_process");
const os = require("os");

class WindowsCmd extends Plugin {
  name() {
    return "Windows CMD";
  }

  description() {
    return "Execute CMD commands on a Windows system.";
  }

  icon() {
    return "🪟";
  }

  iconBase64() {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAEZ9JREFUeJzt3V+M1eWZwPHnzAzD4PBPmBEEtIYWla2mSIrVsF2zF9LS4qbR1k0bbWINVi560dR001Qii+BVk9Ziu0lvmibLxmbXJiZ24aKtFC+ssooViCJmF9QCwvB/xhkG5sxebCbbtXWLOu/vd5jn80nOlfF53ujF7zvvOXMmAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACq06hy2Zfuv3/+mePH1x7cv39V3+HDvcePHu0cGhys8ggA0BK6pkyJWb29wz1z5x6Zf+WVT82eNWv9P//kJ4eq2l9JAHxp3brOkzt3bn7ut7+9/fTJk21V7ASAi8mMSy9tLrvlln+7dMmSu/913brh0vuKB8Bd9913+c4XXti554UX5pTeBQAXu2uXLOlbunz5J//lRz86UPdZPrAvf+tbPR/52McGImLUy8vLy8vL68JeH1m0qP/eb35zVhTUXnJ4W7P56mu7dvWU3AEAE82p48c7RxuNvz/81luPltpR7P34v/vKVx58+bnnrig1HwAmspeeffaq2+666x9KzS92AzA0NPTvp44f7yw1HwAmuuGhoZtPHjv2SInZRW4A7rzvvr89sG9fd4nZAJDF/tde6/7y6tW3lJhdJABOHDmypsRcAMjm6NGjRZ6pRQJgoL9/YYm5AJDNO4WeqUUC4J2Bgdkl5gJANoMDA70l5hYJgObISEeJuQCQzUihZ6qv5QWAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICELppv7Fu8ZEnccc89dR8DAN7TEz/9abzy0kt1H+OCXDQB0Hv55fE3K1fWfQwAeE/bt269aALAWwAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJBQR90HuFDbt2yJFVu21H0MAJgQ3AAAQEICAAASEgAAkJAAAICEBAAAJCQAACChIgHQaDQuml8vBIBW1tZotBeZW2JoI6KrxFwASKfRKPJMLfMWQKFaAYCEityql7oBEAAAMA5KPVOLBMDI+fPNEnMBIJvz584VeaYWCYBz586NlJgLANmcP3++yDO1SAC8c+bM2RJzASCbd06fLvJMLRIAA6dPD5eYCwDZDJw5U+SZ6ouAACAhAQAACQkAAEhIAABAQgIAABISAACQ0EXzV/suX7AgPnnTTXUfAwDe03/87ndx6K236j7GBbloAqDRbEbbuXN1HwMA3lOjefF8E763AAAgIQEAAAkJAABISAAAQEICAAASEgAAkJAAAICEBAAAJCQAACAhAQAACQkAAEhIAABAQgIAABISAACQkAAAgIQEAAAkJAAAICEBAAAJCQAASEgAAEBCAgAAEhIAAJCQAACAhAQAACQkAAAgIQEAAAkJAABISAAAQEICAAASEgAAkFBH3QfIZtKkSbF06dJYtGhRzJkzJ9ra2qK/vz/27t0bO3fujBMnTtR9RAASEAAVmTx5ctxxxx3xuc99LqZOnfon//wzn/lMjIyMxK9//ev4+c9/HseOHavhlABk4S2ACixatCgee+yxuPPOO//sw39Me3t7rFixIjZt2hQ33HBDhScEIBsBUNiyZctiw4YN0dvbe8H/ziWXXBJr166Nz372swVPBkBmAqCgj370o/HAAw/E5MmT3/e/29bWFl//+tfjtttuK3AyALITAIV0dXXFd77znQ/08B/TaDTia1/7WqxatWocTwYAAqCYL37xi9HT0/Oh5zQajbj33ntFAADjSgAU0NnZGStXrhy3eWMR4O0AAMaLAChg2bJl0d3dPa4zvR0AwHgSAAVcc801Rea6CQBgvAiAAubPn19s9thNgAgA4MMQAAU0Go3i80UAAB+GAChgcHCw+A4R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";
  }

  tags() {
    return ["terminal", "windows"];
  }

  paramsDefinition() {
    return [
      {
        name: "Command",
        alias: "command",
        type: "big_string",
        default: "dir",
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
    const rawCommand = params.command;
    if (!rawCommand) {
      return {
        status: { error: true, message: "Command is required" },
        output: {},
      };
    }

    const isWindows = os.platform() === "win32";
    const cwd = params.working_directory || (isWindows ? process.cwd() : "/data");
    const timeout = parseInt(params.timeout, 10) || 30000;
    const shell = isWindows ? "cmd.exe" : "/bin/bash";

    // Join multi-line commands with && so they run sequentially
    const separator = isWindows ? " & " : " && ";
    const command = rawCommand
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join(separator);

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

module.exports = WindowsCmd;
