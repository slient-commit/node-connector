const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const API_DIR = path.join(ROOT, "api");
const FRONT_DIR = path.join(ROOT, "front");
const SCHEDULER_DIR = path.join(ROOT, "scheduler");
const FRONT_BUILD = path.join(FRONT_DIR, "build");

const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";

const children = [];

// ── Helpers ──

function log(tag, msg) {
  const colors = { setup: "\x1b[36m", api: "\x1b[32m", scheduler: "\x1b[33m", front: "\x1b[35m" };
  const reset = "\x1b[0m";
  const c = colors[tag] || "";
  console.log(`${c}[${tag}]${reset} ${msg}`);
}

function runSync(cmd, args, cwd) {
  log("setup", `Running: ${cmd} ${args.join(" ")} (in ${path.basename(cwd)})`);
  execSync(`${cmd} ${args.join(" ")}`, { cwd, stdio: "inherit" });
}

function newestMtime(dir) {
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "build") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(full));
    } else {
      newest = Math.max(newest, fs.statSync(full).mtimeMs);
    }
  }
  return newest;
}

function frontendNeedsRebuild() {
  const indexHtml = path.join(FRONT_BUILD, "index.html");
  if (!fs.existsSync(FRONT_BUILD) || !fs.existsSync(indexHtml)) return true;
  const buildTime = fs.statSync(indexHtml).mtimeMs;
  const srcTime = newestMtime(path.join(FRONT_DIR, "src"));
  return srcTime > buildTime;
}

function installDeps(dir) {
  const nodeModules = path.join(dir, "node_modules");
  if (!fs.existsSync(nodeModules)) {
    log("setup", `Installing dependencies in ${path.basename(dir)}/...`);
    runSync(npm, ["install"], dir);
  } else {
    log("setup", `Dependencies already installed in ${path.basename(dir)}/`);
  }
}

function startProcess(name, cmd, args, cwd, env = {}) {
  const fullEnv = { ...process.env, ...env };
  const child = spawn(cmd, args, { cwd, env: fullEnv, stdio: ["ignore", "pipe", "pipe"] });

  child.stdout.on("data", (data) => {
    data.toString().trim().split("\n").forEach((line) => log(name, line));
  });
  child.stderr.on("data", (data) => {
    data.toString().trim().split("\n").forEach((line) => log(name, line));
  });
  child.on("exit", (code) => {
    log(name, `Process exited with code ${code}`);
  });

  children.push(child);
  return child;
}

// ── Graceful shutdown ──

function shutdown() {
  log("setup", "Shutting down...");
  children.forEach((child) => {
    if (!child.killed) {
      child.kill();
    }
  });
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
if (isWindows) {
  process.on("SIGHUP", shutdown);
}

// ── Main ──

(async () => {
  console.log("");
  console.log("  \x1b[1mNode Connector\x1b[0m — Starting without Docker");
  console.log("  ─────────────────────────────────────────");
  console.log("");

  // 1. Install dependencies
  log("setup", "Checking dependencies...");
  installDeps(API_DIR);
  installDeps(FRONT_DIR);
  installDeps(SCHEDULER_DIR);
  console.log("");

  // 2. Build frontend if needed (auto-detects source changes)
  if (frontendNeedsRebuild()) {
    log("front", "Building frontend...");
    runSync(npm, ["run", "build"], FRONT_DIR);
  } else {
    log("front", "Frontend is up to date");
  }

  // 3. Write config.js for frontend (API on same origin)
  const configPath = path.join(FRONT_BUILD, "config.js");
  const port = process.env.PORT || 3001;
  fs.writeFileSync(configPath, `window.__API_BASE_URL__ = "http://localhost:${port}";\n`);
  log("front", `Config written: API at http://localhost:${port}`);
  console.log("");

  // 4. Start API
  log("api", "Starting API server...");
  startProcess("api", "node", ["index.js"], API_DIR, {
    PORT: String(port),
    DB_PATH: process.env.DB_PATH || "./db/sheets.db",
    ...(process.env.JWT_SECRET && { JWT_SECRET: process.env.JWT_SECRET }),
    ...(process.env.REFRESH_TOKEN_SECRET && { REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET }),
    ...(process.env.INTERNAL_API_KEY && { INTERNAL_API_KEY: process.env.INTERNAL_API_KEY }),
    ...(process.env.ENCRYPTION_KEY && { ENCRYPTION_KEY: process.env.ENCRYPTION_KEY }),
  });

  // 5. Start scheduler (after short delay for API to be ready)
  setTimeout(() => {
    log("scheduler", "Starting scheduler...");
    startProcess("scheduler", "node", ["index.js"], SCHEDULER_DIR, {
      API_BASE_URL: `http://127.0.0.1:${port}`,
      ...(process.env.INTERNAL_API_KEY && { INTERNAL_API_KEY: process.env.INTERNAL_API_KEY }),
      LOG_LEVEL: process.env.LOG_LEVEL || "info",
    });

    console.log("");
    console.log("  \x1b[1m\x1b[32m✓ All services running\x1b[0m");
    console.log(`  → Open \x1b[4mhttp://localhost:${port}\x1b[0m in your browser`);
    console.log("  → Press Ctrl+C to stop");
    console.log("");
  }, 3000);
})();
