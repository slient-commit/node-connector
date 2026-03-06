const ToolLoader = require("./tool-loader");

class Executer {
  static getParams(node) {
    const params = {};
    for (const p in node.params) {
      const param = node.params[p];
      if (param) {
        params[param.alias] = param.value ? param.value : param.default;
      }
    }
    return params;
  }

  // Replace {{variable}} placeholders in param values with data from input
  // Supports dot notation: {{source}}, {{input.source}}, {{a.b.c}}
  static resolveVariables(params, input) {
    if (!input || Object.keys(input).length === 0) return params;
    const resolved = { ...params };
    for (const key of Object.keys(resolved)) {
      if (key === "input" || typeof resolved[key] !== "string") continue;
      resolved[key] = resolved[key].replace(/\{\{([\w.]+)\}\}/g, (match, varName) => {
        // Strip leading "input." since the context is already the input object
        const path = varName.startsWith("input.") ? varName.slice(6) : varName;
        // Traverse dot-separated path
        const parts = path.split(".");
        let val = input;
        for (const part of parts) {
          if (val == null || typeof val !== "object") return match;
          val = val[part];
        }
        if (val === undefined) return match;
        return typeof val === "object" ? JSON.stringify(val) : String(val);
      });
    }
    return resolved;
  }

  static async executeNodes(
    nodes,
    nodeId,
    pluginsFolder,
    sendProgress,
    closeSSE
  ) {
    const nodeMap = new Map();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    const executed = new Set();  // successfully executed node IDs
    const failed = new Set();    // failed node IDs

    // Load plugins once for the entire chain
    const toolloader = new ToolLoader();
    const classes = toolloader.load(pluginsFolder);

    // Track pending resolve callbacks for nodes waiting on inputs
    // Key: node ID, Value: { remaining: number, resolve: Function }
    const pendingNodes = new Map();

    function notifyOutputNodes(node) {
      for (const outputId of node.node.outputs) {
        const outputNode = nodeMap.get(outputId);
        if (!outputNode) {
          if (sendProgress)
            sendProgress({
              id: node.id,
              result: {},
              error: true,
              message: `Output node with id ${outputId} not found`,
              stage: "executing",
            });
          continue;
        }

        // If already executed or already failed, skip
        if (executed.has(outputId) || failed.has(outputId)) continue;

        if (!pendingNodes.has(outputId)) {
          // Count how many input nodes this output node has
          const inputCount = outputNode.node.inputs
            ? outputNode.node.inputs.length
            : 0;
          let resolveReady;
          const readyPromise = new Promise((r) => (resolveReady = r));
          pendingNodes.set(outputId, {
            remaining: inputCount,
            resolve: resolveReady,
            promise: readyPromise,
          });
          // Queue execution: wait until all inputs are done, then execute
          allPromises.push(
            readyPromise.then(() => executeNode(outputNode))
          );
        }

        const pending = pendingNodes.get(outputId);
        pending.remaining--;
        if (pending.remaining <= 0) {
          pending.resolve();
        }
      }
    }

    async function executeNode(node) {
      if (executed.has(node.id) || failed.has(node.id)) return;

      // Check if any input node has failed — if so, skip this node
      if (node.node.inputs && node.node.inputs.length > 0) {
        const failedInputs = node.node.inputs.filter((id) => failed.has(id));
        if (failedInputs.length > 0) {
          failed.add(node.id);
          if (sendProgress)
            sendProgress({
              id: node.id,
              result: {},
              error: true,
              message: "Skipped: a previous node failed",
              stage: "executed",
            });
          // Propagate failure to downstream nodes
          notifyOutputNodes(node);
          return;
        }
      }

      if (sendProgress)
        sendProgress({
          id: node.id,
          result: {},
          error: false,
          message: "Start the node executing",
          stage: "executing",
        });

      let result = {};
      let hasError = false;

      try {
        const InstanceClass = classes.find(
          (x) => x.name === node.node.className
        );
        if (InstanceClass) {
          const instance = new InstanceClass();

          // Intercept log on the instance, not the prototype
          const originalLog = instance.log.bind(instance);
          instance.log = function (...args) {
            const logEntry = originalLog(...args);
            if (sendProgress)
              sendProgress({
                id: node.id,
                result: {},
                error: logEntry.type === "error",
                message: logEntry.message,
                stage: "executing",
              });
            return logEntry;
          };

          let inputParams = { ...Executer.getParams(node.node), input: {} };

          // Merge in results from ALL input nodes
          if (node.node.inputs) {
            for (let _nodeId of node.node.inputs) {
              const execNode = nodes.find((n) => n.node.id === _nodeId);
              if (execNode && execNode.isExecuted) {
                inputParams.input = {
                  ...inputParams.input,
                  ...execNode.result.output,
                };
              }
            }
          }

          // Resolve {{variable}} placeholders in params using input data
          inputParams = Executer.resolveVariables(inputParams, inputParams.input);

          result = await instance.logic(inputParams);
          node.result = result;
          node.isExecuted = true;

          hasError = result.status && result.status.error;

          if (sendProgress)
            sendProgress({
              id: node.id,
              result: result.output,
              error: hasError,
              message: result.status.message,
              stage: "executed",
            });
        } else {
          hasError = true;
          if (sendProgress)
            sendProgress({
              id: node.id,
              result: "Plugin not found: " + node.node.className,
              error: true,
              stage: "executed",
            });
        }
      } catch (err) {
        hasError = true;
        if (sendProgress)
          sendProgress({
            id: node.id,
            result: {},
            error: true,
            message: `Error while executing node: ${err.message}`,
            stage: "executed",
          });
      }

      if (hasError) {
        failed.add(node.id);
      } else {
        executed.add(node.id);
      }

      // Notify downstream nodes (they'll check for failures before running)
      notifyOutputNodes(node);

      return result;
    }

    const entryPoints = nodes.filter((node) => node.id === nodeId);
    const allPromises = entryPoints.map((entryNode) => executeNode(entryNode));

    // Process promises as they grow (children add new ones)
    let i = 0;
    while (i < allPromises.length) {
      try {
        await allPromises[i];
      } catch (error) {
        if (sendProgress)
          sendProgress({
            id: nodeId,
            result: {},
            error: true,
            message: `Promise rejected: ${error.message}`,
            stage: "executing",
          });
      }
      i++;
    }

    if (closeSSE) closeSSE();
  }
}

module.exports = Executer;
