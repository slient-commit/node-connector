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

  static interceptLog(baseClass, nodeId, sseEvent = undefined) {
    const originalLog = baseClass.prototype.log;

    baseClass.prototype.log = function (...args) {
      // Call original log method to get the log object
      const logEntry = originalLog.apply(this, args);

      if (sseEvent)
        sseEvent({
          id: nodeId,
          result: {},
          error: logEntry.type === "error" ? true : false,
          message: logEntry.message,
          stage: "executing",
        });

      return logEntry; // still return the object as expected
    };
  }

  static async _executeNodes(
    nodes,
    nodeId,
    pluginsFolder,
    sendProgress,
    closeSSE
  ) {
    // Create a map for quick lookup of nodes by id
    const nodeMap = new Map();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    // Track execution state
    const executed = new Set(); // To track which nodes have been executed
    const executionPromises = new Map(); // To track ongoing executions

    // Helper function to execute a single node
    async function executeNode(node) {
      if (executed.has(node.id)) return; // Skip if already executed
      if (sendProgress)
        // Notify progress via the SSE event
        sendProgress({
          id: node.id,
          result: {},
          error: false,
          message: "Start the node executing",
          stage: "executing",
        });
      let result = {};
      // Wait for all input nodes to complete
      //   const inputPromises = node.node.inputs.map((inputId) => {
      //     const inputNode = nodeMap.get(inputId);
      //     if (!inputNode)
      //       sendProgress({
      //         id: node.id,
      //         result: {},
      //         error: true,
      //         message: `Input node with id ${inputId} not found`,
      //         stage: "executing",
      //       });
      //     return executeNode(inputNode); // Recursively execute input nodes
      //   });

      //   await Promise.all(inputPromises);

      try {
        const toolloader = new ToolLoader();
        const classes = toolloader.load(pluginsFolder);
        const InstanceClass = classes.find(
          (x) => x.name === node.node.className
        );
        if (InstanceClass) {
          Executer.interceptLog(InstanceClass, node.id, sendProgress);
          const instance = new InstanceClass();

          let inputParams = { ...Executer.getParams(node.node), input: {} };

          // Merge in results from input nodes
          for (let _nodeId of node.node.inputs) {
            const execNode = nodes.find((node) => node.node.id === _nodeId);
            if (execNode) {
              if (execNode.isExecuted) {
                inputParams.input = {
                  ...inputParams.input,
                  ...execNode.result.output,
                };
              }
            }
          }

          result = await instance.logic(inputParams);
          node.result = result;
          node.isExecuted = true;

          if (sendProgress)
            // Notify progress via the SSE event
            sendProgress({
              id: node.id,
              result: result.output,
              error: false,
              message: "Done",
              stage: "executed",
            });
        } else {
          if (sendProgress)
            sendProgress({
              id: node.id,
              result: "Plugin not found: " + node.node.className,
              error: true,
              stage: "executed",
            });
        }
      } catch (err) {
        if (sendProgress)
          sendProgress({
            id: node.id,
            result: `Error while executing node: ${err.message}`,
            error: true,
            stage: "executed",
          });
      }

      // Mark this node as executed
      executed.add(node.id);

      // Pass the result to all output nodes
      //   for (const outputId of node.node.outputs) {
      //     const outputNode = nodeMap.get(outputId);
      //     if (!outputNode) {
      //       sendProgress({
      //         id: node.id,
      //         result: {},
      //         error: true,
      //         message: `Output node with id ${outputId} not found`,
      //         stage: "executing",
      //       });
      //     }
      //     // No need to wait here, just trigger execution
      //     allPromises.push(executeNode(outputNode));
      //   }

      return result;
    }
    const entryPoints = nodes.filter((node) => node.id === nodeId);
    const allPromises = entryPoints.map((entryNode) => executeNode(entryNode));
    // Start executing all nodes without inputs (entry points)
    const addChildrenNodesToExecution = (node) => {
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
        }
        // No need to wait here, just trigger execution
        allPromises.push(executeNode(outputNode));
        addChildrenNodesToExecution(outputNode);
      }
    };

    for (const node of entryPoints) {
      addChildrenNodesToExecution(node);
    }

    for (const promise of allPromises) {
      try {
        await promise;
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
    }
    if (closeSSE) closeSSE();
    // // Wait for all nodes to finish executing
    // await Promise.all(allPromises).then((r) => {
    //   if (closeSSE) closeSSE();
    // });
  }

  static async executeNodes(
    nodes,
    nodeId,
    pluginsFolder,
    sendProgress,
    closeSSE
  ) {
    // Create a map for quick lookup of nodes by id
    const nodeMap = new Map();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    // Track execution state
    const executed = new Set(); // To track which nodes have been executed
    const executionPromises = new Map(); // To track ongoing executions

    // Helper function to execute a single node
    async function executeNode(node) {
      if (executed.has(node.id)) return; // Skip if already executed
      if (sendProgress)
        // Notify progress via the SSE event
        sendProgress({
          id: node.id,
          result: {},
          error: false,
          message: "Start the node executing",
          stage: "executing",
        });
      let result = {};
      // Wait for all input nodes to complete
      //   const inputPromises = node.node.inputs.map((inputId) => {
      //     const inputNode = nodeMap.get(inputId);
      //     if (!inputNode)
      //       sendProgress({
      //         id: node.id,
      //         result: {},
      //         error: true,
      //         message: `Input node with id ${inputId} not found`,
      //         stage: "executing",
      //       });
      //     return executeNode(inputNode); // Recursively execute input nodes
      //   });

      //   await Promise.all(inputPromises);

      try {
        const toolloader = new ToolLoader();
        const classes = toolloader.load(pluginsFolder);
        const InstanceClass = classes.find(
          (x) => x.name === node.node.className
        );
        if (InstanceClass) {
          Executer.interceptLog(InstanceClass, node.id, sendProgress);
          const instance = new InstanceClass();

          let inputParams = { ...Executer.getParams(node.node), input: {} };

          // Merge in results from input nodes
          for (let _nodeId of node.node.inputs) {
            const execNode = nodes.find((node) => node.node.id === _nodeId);
            if (execNode) {
              if (execNode.isExecuted) {
                inputParams.input = {
                  ...inputParams.input,
                  ...execNode.result.output,
                };
              }
            }
          }

          result = await instance.logic(inputParams);
          node.result = result;
          node.isExecuted = true;

          if (sendProgress)
            // Notify progress via the SSE event
            sendProgress({
              id: node.id,
              result: result.output,
              error: node.result.status.error,
              message: node.result.status.message,
              stage: "executed",
            });
        } else {
          if (sendProgress)
            sendProgress({
              id: node.id,
              result: "Plugin not found: " + node.node.className,
              error: true,
              stage: "executed",
            });
        }
      } catch (err) {
        if (sendProgress)
          sendProgress({
            id: node.id,
            result: `Error while executing node: ${err.message}`,
            error: true,
            stage: "executed",
          });
      }

      // Mark this node as executed
      executed.add(node.id);

      // Pass the result to all output nodes
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
        // No need to wait here, just trigger execution
        allPromises.push(executeNode(outputNode));
      }

      return result;
    }
    const entryPoints = nodes.filter((node) => node.id === nodeId);
    const allPromises = entryPoints.map((entryNode) => executeNode(entryNode));
    let currentPromiseIndex = 0;
    while (currentPromiseIndex < allPromises.length) {
      await allPromises[currentPromiseIndex];
      currentPromiseIndex++;
      console.log(currentPromiseIndex, allPromises.length);
    }
    if (closeSSE) closeSSE();
  }
}

module.exports = Executer;
