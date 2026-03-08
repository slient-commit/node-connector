// (async () => {
//   const toolloader = new ToolLoader();
//   const classes = toolloader.load("./plugins");

//   const sheets = new SheetManager();
//   sheets.createDbTable();
//   const sheet = await sheets.create("test");
//   const node1 = new Node("FTPTool", {
//     host: "192.168.1.2",
//     user: "me",
//     password: "0000",
//   });
//   const node2 = new Node("Example", { host: "182.15.15.2" });
//   node2.addInput(node1);
//   sheets.addNode(sheet, node1);
//   sheets.addNode(sheet, node2);
//   const store = sheets.getNodeStore(sheet);
//   const exec = store[0];
//   exec.trigger(store);
// })();

const express = require("express");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const verifyCsrfToken = require("./src/middleware/verifyCsrfToken");
const config = require("./config");
const authRoutes = require("./src/routes/auth");
const sheetRoutes = require("./src/routes/sheet");
const User = require("./src/models/user");
const ToolLoader = require("./src/tool-loader");
const SheetManager = require("./src/sheet-manager");
const Node = require("./src/node");
const NodeExecuter = require("./src/node-executer");
const ExecutionHistory = require("./src/models/execution-history");
const AuditLog = require("./src/models/audit-log");

(async () => {
  dotenv.config({ path: path.join(__dirname, ".env") });

  const app = express();

  // Trust reverse proxy (nginx) for X-Forwarded-Proto and client IP
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Middlewares
  const corsOrigin = process.env.CORS_ORIGIN || `http://localhost:${config.port}`;
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }));
  app.use(morgan("tiny"));
  app.use(express.json());

  // Redirect HTTP to HTTPS in production
  if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      if (req.secure) return next();
      res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    });
  }

  // Create table if not exists
  await User.createUserTable();
  await new SheetManager().createDbTable();
  await ExecutionHistory.createTable();
  await AuditLog.createTable();

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  }));

  app.use("/auth/login", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts, please try again later" },
  }));

  app.use("/auth/register", rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many registration attempts, please try again later" },
  }));

  // CSRF protection (skips GET/HEAD/OPTIONS and internal API key requests)
  app.use(verifyCsrfToken);

  // Routes
  app.use("/auth", authRoutes);
  app.use("/sheet", sheetRoutes);

  // Serve frontend static files if build exists (non-Docker mode)
  const frontendPath = path.join(__dirname, "..", "front", "build");
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get("{*path}", (req, res) => {
      res.sendFile(path.join(frontendPath, "index.html"));
    });
  }

  // Start server
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
})();
