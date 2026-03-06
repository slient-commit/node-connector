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

    // Mutable target for where new promises get pushed.
    // Points to allPromises normally, but switches to a per-iteration
    // array during loop execution.
    let promisesTarget = null;

    // Tracks whether we're inside a loop execution.
    // When > 0, LoopEnd nodes won't notify their downstream nodes.
    let loopDepth = 0;

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
          promisesTarget.push(
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

      // If this is a Loop node, handle loop iteration over downstream nodes
      if (!hasError && node.result?.output?.__isLoop) {
        await handleLoopNode(node, node.result.output.__items);
      } else if (!hasError && node.result?.output?.__isLoopEnd && loopDepth > 0) {
        // Inside a loop — LoopEnd doesn't notify downstream.
        // The loop handler will trigger post-loop nodes after all iterations.
      } else {
        // Notify downstream nodes (they'll check for failures before running)
        notifyOutputNodes(node);
      }

      return result;
    }

    // BFS to find all transitive downstream node IDs from a given node.
    // Stops at LoopEnd nodes — they're included in the set but their
    // outputs are NOT traversed (those belong to the post-loop chain).
    function getDownstreamNodeIds(startNodeId) {
      const downstream = new Set();
      const startNode = nodeMap.get(startNodeId);
      if (!startNode) return downstream;
      const queue = [...(startNode.node.outputs || [])];
      while (queue.length > 0) {
        const id = queue.shift();
        if (downstream.has(id)) continue;
        downstream.add(id);
        const n = nodeMap.get(id);
        if (n && n.node.outputs && n.node.className !== "LoopEnd") {
          queue.push(...n.node.outputs);
        }
      }
      return downstream;
    }

    // Handle Loop node: re-execute all downstream nodes for each iteration
    async function handleLoopNode(loopNode, items) {
      const downstreamIds = getDownstreamNodeIds(loopNode.id);
      const allIterResults = [];

      loopDepth++;

      for (let i = 0; i < items.length; i++) {
        // Send iteration progress
        if (sendProgress)
          sendProgress({
            id: loopNode.id,
            result: {},
            error: false,
            message: `Iteration ${i + 1} of ${items.length}`,
            stage: "executing",
          });

        // Reset all downstream nodes for this iteration
        for (const id of downstreamIds) {
          executed.delete(id);
          failed.delete(id);
          pendingNodes.delete(id);
          const dn = nodeMap.get(id);
          if (dn) {
            dn.result = null;
            dn.isExecuted = false;
          }
        }

        // Update loop node's output for this iteration
        loopNode.result = {
          status: { error: false, message: `Iteration ${i + 1} of ${items.length}` },
          output: { item: items[i], index: i, total: items.length },
        };

        // Create per-iteration promises array and redirect promise target
        const iterPromises = [];
        const savedTarget = promisesTarget;
        promisesTarget = iterPromises;

        // Notify downstream nodes — promises go into iterPromises
        notifyOutputNodes(loopNode);

        // Satisfy external inputs: for downstream nodes with inputs from
        // outside the loop, pre-decrement pending counter (already executed)
        for (const id of downstreamIds) {
          const pending = pendingNodes.get(id);
          if (!pending) continue;
          const dn = nodeMap.get(id);
          if (!dn) continue;
          for (const inputId of dn.node.inputs) {
            if (inputId !== loopNode.id && !downstreamIds.has(inputId) && executed.has(inputId)) {
              pending.remaining--;
            }
          }
          if (pending.remaining <= 0) {
            pending.resolve();
          }
        }

        // Process all iteration promises
        let idx = 0;
        while (idx < iterPromises.length) {
          try {
            await iterPromises[idx];
          } catch (err) {
            if (sendProgress)
              sendProgress({
                id: loopNode.id,
                result: {},
                error: true,
                message: `Loop iteration ${i + 1} error: ${err.message}`,
                stage: "executing",
              });
          }
          idx++;
        }

        // Restore promises target
        promisesTarget = savedTarget;

        // Collect results from downstream nodes for this iteration
        const iterResult = {};
        for (const id of downstreamIds) {
          const dn = nodeMap.get(id);
          if (dn?.result?.output) {
            iterResult[dn.node.title || id] = dn.result.output;
          }
        }
        allIterResults.push(iterResult);
      }

      loopDepth--;

      // Set final aggregated loop output
      loopNode.result = {
        status: { error: false, message: `${items.length} iterations completed` },
        output: { iterations: allIterResults, count: items.length },
      };

      // Send completion progress
      if (sendProgress)
        sendProgress({
          id: loopNode.id,
          result: loopNode.result.output,
          error: false,
          message: `${items.length} iterations completed`,
          stage: "executed",
        });

      // Trigger post-loop nodes: find LoopEnd nodes in the downstream set
      // and notify their outputs (which are outside the loop body)
      for (const id of downstreamIds) {
        const dn = nodeMap.get(id);
        if (dn && dn.node.className === "LoopEnd" && executed.has(id)) {
          // Update LoopEnd result with aggregated loop data
          dn.result = {
            status: { error: false, message: `${items.length} iterations completed` },
            output: { iterations: allIterResults, count: items.length },
          };
          dn.isExecuted = true;
          notifyOutputNodes(dn);
        }
      }
    }

    const entryPoints = nodes.filter((node) => node.id === nodeId);
    const allPromises = entryPoints.map((entryNode) => executeNode(entryNode));
    promisesTarget = allPromises;

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
