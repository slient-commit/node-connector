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
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const config = require("./config");
const authRoutes = require("./src/routes/auth");
const sheetRoutes = require("./src/routes/sheet");
const User = require("./src/models/user");
const ToolLoader = require("./src/tool-loader");
const SheetManager = require("./src/sheet-manager");
const Node = require("./src/node");
const NodeExecuter = require("./src/node-executer");
const ExecutionHistory = require("./src/models/execution-history");

(async () => {
  dotenv.config();

  const app = express();

  // Middlewares
  app.use(cors());
  app.use(helmet());
  app.use(morgan("tiny"));
  app.use(express.json());

  // Create table if not exists
  await User.createUserTable();
  await new SheetManager().createDbTable();
  await ExecutionHistory.createTable();

  // Routes
  app.use("/auth", authRoutes);
  app.use("/sheet", sheetRoutes);

  // Start server
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
})();
