const { v4: uuidv4 } = require("uuid");

class Node {
  constructor(title, className, position, params) {
    this.id = uuidv4();
    this.className = className;
    this.title = title;
    this.params = params;
    this.position = position;
    this.inputs = [];
    this.outputs = [];
  }

  addInput(node) {
    if (!this.inputs.find((id) => id === node.id)) {
      this.inputs.push(node.id);
      node.outputs.push(this.id);
    }
  }

  addOutput(node) {
    if (!this.outputs.find((id) => id === node.id)) {
      this.outputs.push(node.id);
      node.inputs.push(this.id);
    }
  }

  removeInput(node) {
    if (this.inputs.find((id) => id === node.id)) {
      this.inputs = this.inputs.filter((id) => id !== node.id);
      node.outputs = node.outputs.filter((id) => id !== this.id);
    }
  }

  removeOutput(node) {
    if (this.outputs.find((id) => id === node.id)) {
      this.outputs = this.outputs.filter((id) => id !== node.id);
      node.inputs = node.inputs.filter((id) => id !== this.id);
    }
  }
}

module.exports = Node;
