# Node Connector

A visual workflow automation platform. Build chains of executable plugins on an SVG canvas, connect them to form pipelines, and trigger execution via cron, webhook, or terminal.

![Express.js 5](https://img.shields.io/badge/Express.js-5-000?logo=express)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

## Features

- **Visual Node Editor** — Drag-and-drop SVG canvas with pan, zoom, and real-time connection drawing
- **Plugin System** — Auto-discovered plugins from `api/plugins/`. Add a `.js` file and it appears instantly
- **Three Trigger Modes** — Cron (scheduled), Webhook (HTTP POST), Terminal (CLI or UI)
- **Real-Time Execution** — Live progress streaming via Server-Sent Events (SSE) with per-node status indicators
- **Multi-Input Execution** — Nodes with multiple inputs wait for all upstream nodes to complete; failures propagate downstream
- **Data Flow** — `{{variable}}` template syntax with dot notation for referencing previous node outputs
- **Execution History** — Track every cron/webhook/terminal execution with duration, status, and node count
- **Multi-User Auth** — JWT-based authentication with access and refresh tokens
- **Single Docker Image** — Nginx + API + Scheduler bundled in one container

## Built-in Plugins

| Plugin | Tags | Description |
|--------|------|-------------|
| **Custom Script** | `script` | Execute custom Node.js code with `async function main()` |
| **SSH** | `network` | Run commands on remote servers via SSH |
| **FTP** | `network` | Upload files to FTP servers |
| **Rename File** | `io` | Move or rename files on the filesystem |
| **Linux Terminal** | `terminal`, `linux` | Execute bash/shell commands |
| **Windows CMD** | `terminal`, `windows` | Execute CMD commands |

## Quick Start

### Without Docker (recommended)

Run directly on your machine for full access to host tools (Python, CMD, bash, etc.).

**Prerequisites:** [Node.js 18+](https://nodejs.org/) installed.

```bash
# Windows
start.bat

# Linux / macOS
./start.sh
```

Or directly:
```bash
node start.js
```

This single command:
1. Installs all dependencies (API, frontend, scheduler)
2. Builds the frontend
3. Starts the API + scheduler
4. Opens on `http://localhost:3001`

Terminal plugins have full access to your host machine — run Python, CMD, bash, and any installed tool.

#### Auto-Start on Boot

To have Node Connector start automatically when the system boots:

```bash
# Windows (run as Administrator)
service-install.bat

# Linux (run as root)
sudo ./service-install.sh
```

To remove auto-start:

```bash
# Windows (run as Administrator)
service-uninstall.bat

# Linux (run as root)
sudo ./service-uninstall.sh
```

### Docker

Use Docker if you prefer an isolated container (note: host tools like Python won't be accessible).

```bash
docker build -t node-connector .
docker run -d -p 80:80 --name node-connector node-connector
```

Open `http://localhost` in your browser, register an account, and start building workflows.

**With host volume** (for file access only, not host tools):

```bash
# Linux / macOS
docker run -d -p 80:80 --name node-connector -v /path/on/host:/data node-connector

# Windows
docker run -d -p 80:80 --name node-connector -v C:\Users\You\Desktop:/data node-connector
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `change_me_jwt_secret` | Secret for signing JWT access tokens |
| `REFRESH_TOKEN_SECRET` | `change_me_refresh_secret` | Secret for signing refresh tokens |
| `INTERNAL_API_KEY` | `change_me_internal_key` | Key for scheduler/CLI to API communication |

```bash
docker run -d -p 80:80 \
  -e JWT_SECRET=my_secret \
  -e REFRESH_TOKEN_SECRET=my_refresh_secret \
  -e INTERNAL_API_KEY=my_internal_key \
  node-connector
```

## Architecture

```
+---------------------------------------------------+
|                   Docker Container                 |
|                                                    |
|   +----------+    +-------------+    +-----------+ |
|   |  Nginx   |    |   API       |    | Scheduler | |
|   |  :80     |--->|  :3001      |<---|           | |
|   |          |    |  Express.js |    | node-cron | |
|   +----------+    +------+------+    +-----------+ |
|        |                 |                         |
|        |          +------+------+                  |
|   Static Files    |   SQLite    |                  |
|   (React build)   |   + JSON    |                  |
|                   +-------------+                  |
+---------------------------------------------------+
```

## Project Structure

```
node-connector/
├── api/                        # Express.js REST API
│   ├── index.js                # Server entry point
│   ├── cli.js                  # CLI execution tool
│   ├── plugins/                # Plugin files (auto-loaded)
│   │   ├── custom-script.js
│   │   ├── ssh.js
│   │   ├── ftp.js
│   │   ├── rename-file.js
│   │   ├── linux-terminal.js
│   │   ├── windows-cmd.js
│   │   └── example.js
│   └── src/
│       ├── routes/             # auth.js, sheet.js
│       ├── models/             # user.js, plugin.js, execution-history.js
│       ├── middleware/         # JWT auth, internal key auth
│       ├── executer.js         # Execution engine
│       └── tool-loader.js      # Plugin discovery
├── scheduler/                  # Cron scheduler service
├── front/                      # React 19 + Vite 6
│   └── src/
│       ├── components/         # Sheet editor, list, modals
│       ├── services/           # API clients
│       └── models/             # SVG node rendering
├── Dockerfile                  # Single-image build
├── nginx.conf                  # Reverse proxy config
├── docs.html                   # Full documentation
├── start.js                    # Cross-platform launcher
├── start.bat                   # Windows start wrapper
├── start.sh                    # Linux/macOS start wrapper
├── service-install.bat         # Windows auto-start installer
├── service-uninstall.bat       # Windows auto-start uninstaller
├── service-install.sh          # Linux auto-start installer (systemd)
└── service-uninstall.sh        # Linux auto-start uninstaller
```

## Creating a Plugin

Add a `.js` file in `api/plugins/` — it's auto-discovered on restart:

```javascript
const Plugin = require("./../src/models/plugin");

class MyPlugin extends Plugin {
  name()        { return "My Plugin"; }
  description() { return "What it does"; }
  icon()        { return "🚀"; }
  // iconBase64() { return "data:image/png;base64,..."; }  // Optional image icon
  tags()        { return ["custom"]; }

  paramsDefinition() {
    return [
      { name: "My Param", alias: "my_param", type: "string", default: "", value: undefined }
    ];
  }

  async logic(params = {}) {
    const myParam = params.my_param;
    const input = params.input || {};

    this.log("Processing...");

    return {
      status: { error: false, message: "Done" },
      output: { result: "value" }  // Passed to downstream nodes
    };
  }
}

module.exports = MyPlugin;
```

## CLI Usage

```bash
# From inside the container
node api/cli.js <sheet-uid>

# From host
docker exec node-connector node api/cli.js <sheet-uid>
```

## Documentation

Full documentation is available at [`docs.html`](docs.html) — open it in a browser for the complete API reference, plugin guide, and architecture details.

## License

See [LICENSE](LICENSE) for details. This project is available for personal, non-commercial use only.
