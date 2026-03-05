class NodeExecuter {
  constructor(node) {
    this.id = node.id;
    this.node = node;
    this.result = null;
    this.isExecuted = false;
  }
}

module.exports = NodeExecuter;
