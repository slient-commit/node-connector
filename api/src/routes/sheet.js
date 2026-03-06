const express = require("express");
const router = express.Router();
const ToolLoader = require("./../tool-loader");
const SQLiteManager = require("./../sqlite-manager");
const SheetManager = require("../sheet-manager");
const Node = require("../node");
const Executer = require("../executer");
const ExecutionHistory = require("../models/execution-history");
const { validateParams, validatePosition, validateStringArray } = require("../middleware/validateNodeParams");
const AuditLog = require("../models/audit-log");

// Protected route example
router.get(
  "/plugins/list",
  require("../middleware/authenticateToken"),
  async (req, res) => {
    const toolloader = new ToolLoader();
    const classes = toolloader.load("../plugins");

    const list = [];
    for (const Class of classes) {
      const instance = new Class();
      list.push({
        id: Class.name,
        name: instance.name(),
        description: instance.description(),
        icon: instance.icon(),
        iconBase64: instance.iconBase64(),
        tags: instance.tags(),
        default_params: instance.paramsDefinition(),
      });
      // You could call methods here or check for specific ones
    }
    res.json(list);
  }
);

router.get(
  "/list",
  require("../middleware/authenticateToken"),
  async (req, res) => {
    let sheets = [];
    await new SQLiteManager().select("sheets").then((_sheets) => {
      sheets = _sheets;
    });
    res.json(sheets);
  }
);

router.get(
  "/get",
  require("../middleware/authenticateToken"),
  async (req, res) => {
    const sheet = await new SheetManager().load(req.query.id);
    res.json(sheet);
  }
);

router.post(
  "/create",
  require("../middleware/authenticateToken"),
  async (req, res) => {
    const sheet = await new SheetManager().create(req.body.name);
    AuditLog.log({ event: "sheet_create", userId: req.user.id, ip: req.ip, details: { name: req.body.name, uid: sheet.uid } });
    res.json(sheet);
  }
);

router.put(
  "/update",
  require("../middleware/authenticateToken"),
  async (req, res) => {
    const reqSheet = req.body.sheet;
    if (!reqSheet || typeof reqSheet !== "object") {
      return res.status(400).json({ error: "sheet is required" });
    }
    if (reqSheet.name !== undefined && typeof reqSheet.name !== "string") {
      return res.status(400).json({ error: "name must be a string" });
    }
    if (!reqSheet.data || !Array.isArray(reqSheet.data.nodes)) {
      return res.status(400).json({ error: "sheet.data.nodes must be an array" });
    }

    // Validate params for each node in the update
    for (let i = 0; i < reqSheet.data.nodes.length; i++) {
      const n = reqSheet.data.nodes[i];
      if (!n || typeof n !== "object") {
        return res.status(400).json({ error: `Invalid node at index ${i}` });
      }
      if (n.params !== undefined) {
        const result = validateParams(n.params);
        if (!result.valid) {
          return res.status(400).json({ error: `Node ${i}: ${result.error}` });
        }
        n.params = result.sanitized;
      }
      if (n.position !== undefined && !validatePosition(n.position)) {
        return res.status(400).json({ error: `Node ${i}: position must have numeric x and y` });
      }
      if (n.inputs !== undefined && !validateStringArray(n.inputs)) {
        return res.status(400).json({ error: `Node ${i}: inputs must be an array of strings` });
      }
      if (n.outputs !== undefined && !validateStringArray(n.outputs)) {
        return res.status(400).json({ error: `Node ${i}: outputs must be an array of strings` });
      }
    }

    const sheetManager = new SheetManager();
    const sheet = await sheetManager.load(reqSheet.uid);
    if (sheet) {
      sheet.name = reqSheet.name;
      sheet.data.nodes = reqSheet.data.nodes;
      sheetManager.save(sheet);
      AuditLog.log({ event: "sheet_update", userId: req.user.id, ip: req.ip, details: { uid: reqSheet.uid } });
      res.json({ message: "sheet updated" });
      return;
    }
    res.statusCode = 500;
    res.json({ message: "sheet no found" });
  }
);

router.post(
  "/node",
  require("../middleware/authenticateToken"),
  async (req, res) => {
    const { sheetId, title, pluginId, position, params } = req.body;

    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title is required and must be a string" });
    }
    if (!pluginId || typeof pluginId !== "string") {
      return res.status(400).json({ error: "pluginId is required and must be a string" });
    }
    if (position !== undefined && !validatePosition(position)) {
      return res.status(400).json({ error: "position must have numeric x and y" });
    }
    if (params !== undefined) {
      const result = validateParams(params);
      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }
    }

    const sheet = await new SheetManager().load(sheetId);
    if (sheet) {
      const validatedParams = params !== undefined ? validateParams(params).sanitized : [];
      const node = new Node(title, pluginId, position, validatedParams);
      await new SheetManager().addNode(sheet, node);
      res.json({ id: node.id, message: "created" });
      return;
    }
    res.statusCode = 500;
    res.json({ message: "sheet no found" });
  }
);

router.get(
  "/node/execute",
  require("../middleware/authenticateTokenFromQuery"),
  async (req, res) => {
    const sheetUid = req.query.sheetId;
    const sheets = new SheetManager();
    const sheet = await sheets.load(sheetUid);
    if (sheet) {
      const node = sheet.data.nodes.find((x) => x.id === req.query.nodeId);
      if (node) {
        AuditLog.log({ event: "sheet_execute", userId: req.user.id, ip: req.ip, details: { sheetUid, nodeId: node.id } });
        const store = sheets.getNodeStore(sheet);
        const exec = store.find((x) => x.node.id === node.id);
        // Set headers for SSE
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let done = false;
        const debug = async (data) => {
          if (data) {
            if (data.id) {
              if (data.id === "chain-complete") {
                res.end();
                done = true;
                return;
              }
            }
            const eventData = `data: ${JSON.stringify(data)}\n\n`;
            res.write(eventData); // Send data to the client
          }
        };
        try {
          await Executer.executeNodes(
            store,
            node.id,
            "./../plugins",
            debug,
            () => {
              res.end();
            }
          );
          // await exec.trigger(store, "./../plugins", {}, debug);
        } catch (err) {
          console.error(`Node execution error [${node.id}]:`, err.message);
          debug({
            id: node.id,
            result: {},
            error: true,
            message: "An error occurred during execution",
            stage: "executing",
          });
        }
        // Handle client disconnect
        req.on("close", () => {
          res.end(); // End the response
        });
        return;
      }
      res.json({ message: "node not found" });
      return;
    }
    res.statusCode = 500;
    res.json({ message: "sheet no found" });
  }
);

router.put(
  "/node",
  require("../middleware/authenticateToken"),
  async (req, res) => {
    const sheetUid = req.body.sheetId;
    const _node = req.body.node;

    if (!_node || typeof _node !== "object") {
      return res.status(400).json({ error: "node is required" });
    }
    if (_node.title !== undefined && typeof _node.title !== "string") {
      return res.status(400).json({ error: "title must be a string" });
    }
    if (_node.position !== undefined && !validatePosition(_node.position)) {
      return res.status(400).json({ error: "position must have numeric x and y" });
    }
    if (_node.inputs !== undefined && !validateStringArray(_node.inputs)) {
      return res.status(400).json({ error: "inputs must be an array of strings" });
    }
    if (_node.outputs !== undefined && !validateStringArray(_node.outputs)) {
      return res.status(400).json({ error: "outputs must be an array of strings" });
    }
    if (_node.params !== undefined) {
      const result = validateParams(_node.params);
      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }
    }

    const sheet = await new SheetManager().load(sheetUid);
    if (sheet) {
      const node = sheet.data.nodes.find((x) => x.id === _node.id);
      if (node) {
        node.title = _node.title;
        node.inputs = _node.inputs;
        node.outputs = _node.outputs;
        node.position = _node.position;
        node.params = _node.params !== undefined ? validateParams(_node.params).sanitized : node.params;
        await new SheetManager().save(sheet);
        res.json({ message: "updated" });
        return;
      }
      res.statusCode = 500;
      res.json({ message: "node no found" });
      return;
    }
    res.statusCode = 500;
    res.json({ message: "sheet no found" });
  }
);

router.put(
  "/node/delete",
  require("../middleware/authenticateToken"),
  async (req, res) => {
    const sheet = await new SheetManager().load(req.body.sheetId);
    const _node = req.body.node;
    if (sheet) {
      sheet.data.nodes.forEach((node) => {
        node.inputs = node.inputs.filter((x) => x !== _node.id);
        node.outputs = node.outputs.filter((x) => x !== _node.id);
      });
      sheet.data.nodes = sheet.data.nodes.filter((x) => x.id !== _node.id);
      await new SheetManager().save(sheet);
      AuditLog.log({ event: "sheet_delete", userId: req.user.id, ip: req.ip, details: { sheetId: req.body.sheetId, nodeId: _node.id } });
      res.json({ message: "node deleted" });
      return;
    }
    res.statusCode = 500;
    res.json({ message: "sheet no found" });
  }
);

// --- Sheet settings ---

router.put(
  "/settings",
  require("../middleware/authenticateToken"),
  async (req, res) => {
    const { uid, name, is_active, trigger_type, cron_schedule } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "uid is required" });
    }
    if (trigger_type !== undefined && !["cron", "webhook", "terminal"].includes(trigger_type)) {
      return res.status(400).json({ message: "trigger_type must be 'cron', 'webhook', or 'terminal'" });
    }
    if (is_active !== undefined && ![0, 1].includes(is_active)) {
      return res.status(400).json({ message: "is_active must be 0 or 1" });
    }

    const columnsToUpdate = [];
    if (name !== undefined) columnsToUpdate.push({ name: "name", value: name });
    if (is_active !== undefined) columnsToUpdate.push({ name: "is_active", value: is_active });
    if (trigger_type !== undefined) columnsToUpdate.push({ name: "trigger_type", value: trigger_type });
    if (cron_schedule !== undefined) columnsToUpdate.push({ name: "cron_schedule", value: cron_schedule });

    if (columnsToUpdate.length === 0) {
      return res.status(400).json({ message: "No settings to update" });
    }

    await new SQLiteManager().update("sheets", columnsToUpdate, [{ name: "uid", value: uid }]);
    AuditLog.log({ event: "sheet_settings_update", userId: req.user.id, ip: req.ip, details: { uid, fields: columnsToUpdate.map((c) => c.name) } });
    res.json({ message: "settings updated" });
  }
);

// --- Execution history ---

router.get(
  "/history/:uid",
  require("../middleware/authenticateToken"),
  async (req, res) => {
    const history = await ExecutionHistory.getBySheetUid(req.params.uid);
    const parsed = history.map((row) => ({
      ...row,
      results_summary: row.results_summary ? JSON.parse(row.results_summary) : [],
    }));
    res.json(parsed);
  }
);

// --- Internal endpoints (for scheduler service) ---

router.get(
  "/list-internal",
  require("../middleware/authenticateInternalKey"),
  async (req, res) => {
    let sheets = [];
    await new SQLiteManager().select("sheets").then((_sheets) => {
      sheets = _sheets;
    });
    res.json(sheets);
  }
);

router.post(
  "/execute-batch",
  require("../middleware/authenticateInternalKey"),
  async (req, res) => {
    const sheetUid = req.body.sheetUid;
    const triggerType = req.body.triggerType || "terminal";
    if (!sheetUid) {
      return res.status(400).json({ message: "sheetUid is required" });
    }

    // Check if sheet is active
    const row = await new SQLiteManager().selectBy("sheets", { name: "uid", value: sheetUid });
    if (row && !row.is_active) {
      return res.status(403).json({ message: "sheet is inactive", sheetUid });
    }

    const sheets = new SheetManager();
    const sheet = await sheets.load(sheetUid);
    if (!sheet) {
      return res.status(404).json({ message: "sheet not found" });
    }

    // Find root nodes (no inputs)
    const rootNodes = sheet.data.nodes.filter(
      (node) => !node.inputs || node.inputs.length === 0
    );

    if (rootNodes.length === 0) {
      return res.json({ message: "no root nodes found", results: [] });
    }

    const startTime = Date.now();
    const store = sheets.getNodeStore(sheet);
    const results = [];

    for (const rootNode of rootNodes) {
      try {
        await Executer.executeNodes(
          store,
          rootNode.id,
          "./../plugins",
          null,
          null
        );

        // Collect results from executed nodes
        const executedResults = store
          .filter((n) => n.isExecuted)
          .map((n) => ({
            nodeId: n.node.id,
            title: n.node.title,
            result: n.result,
          }));

        results.push({
          rootNodeId: rootNode.id,
          rootNodeTitle: rootNode.title,
          status: "success",
          nodes: executedResults,
        });
      } catch (err) {
        results.push({
          rootNodeId: rootNode.id,
          rootNodeTitle: rootNode.title,
          status: "error",
          error: err.message,
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const errorCount = results.filter((r) => r.status === "error").length;
    const overallStatus = errorCount === 0 ? "success" : errorCount === results.length ? "error" : "partial";

    await ExecutionHistory.record({
      sheetUid,
      sheetName: sheet.name,
      triggerType,
      status: overallStatus,
      startedAt: new Date(startTime).toISOString(),
      durationMs,
      nodeCount: results.reduce((sum, r) => sum + (r.nodes ? r.nodes.length : 0), 0),
      errorCount,
      resultsSummary: results,
    });

    res.json({ sheetUid, sheetName: sheet.name, results });
  }
);

// --- Webhook trigger endpoint ---

router.post(
  "/webhook/:uid",
  require("../middleware/authenticateInternalKey"),
  async (req, res) => {
    const sheetUid = req.params.uid;

    const row = await new SQLiteManager().selectBy("sheets", { name: "uid", value: sheetUid });
    if (!row) {
      return res.status(404).json({ message: "sheet not found" });
    }
    if (!row.is_active) {
      return res.status(403).json({ message: "sheet is inactive" });
    }
    if (row.trigger_type !== "webhook") {
      return res.status(400).json({ message: "sheet is not configured for webhook trigger" });
    }

    const sheets = new SheetManager();
    const sheet = await sheets.load(sheetUid);
    if (!sheet) {
      return res.status(404).json({ message: "sheet data not found" });
    }

    const rootNodes = sheet.data.nodes.filter(
      (node) => !node.inputs || node.inputs.length === 0
    );

    if (rootNodes.length === 0) {
      return res.json({ message: "no root nodes found", results: [] });
    }

    const startTime = Date.now();
    const store = sheets.getNodeStore(sheet);
    const results = [];

    for (const rootNode of rootNodes) {
      try {
        await Executer.executeNodes(store, rootNode.id, "./../plugins", null, null);
        const executedResults = store
          .filter((n) => n.isExecuted)
          .map((n) => ({
            nodeId: n.node.id,
            title: n.node.title,
            result: n.result,
          }));
        results.push({
          rootNodeId: rootNode.id,
          rootNodeTitle: rootNode.title,
          status: "success",
          nodes: executedResults,
        });
      } catch (err) {
        results.push({
          rootNodeId: rootNode.id,
          rootNodeTitle: rootNode.title,
          status: "error",
          error: err.message,
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const errorCount = results.filter((r) => r.status === "error").length;
    const overallStatus = errorCount === 0 ? "success" : errorCount === results.length ? "error" : "partial";

    await ExecutionHistory.record({
      sheetUid,
      sheetName: sheet.name,
      triggerType: "webhook",
      status: overallStatus,
      startedAt: new Date(startTime).toISOString(),
      durationMs,
      nodeCount: results.reduce((sum, r) => sum + (r.nodes ? r.nodes.length : 0), 0),
      errorCount,
      resultsSummary: results,
    });

    AuditLog.log({ event: "webhook_trigger", ip: req.ip, details: { sheetUid, status: overallStatus } });
    res.json({ sheetUid, sheetName: sheet.name, results });
  }
);

module.exports = router;
