import React, { Component } from "react";
import Node from "./../../models/node.model";
import DataService from "./../../services/data.service";
import AuthService from "./../../services/auth.service";
import MessageBox from "./../messagebox/messagebox.component";
import "./sheet.css";
import LogModal from "../log-modal/log-modal.component";
import HistoryModal from "../history-modal/history-modal.component";

export default class SheetComponent extends Component {
  constructor() {
    super();
    this.state = {
      showMessage: false,
      showLogModal: false,
      showHistoryModal: false,
      showAlert: false,
      alertMessage: "",
      alertType: "info",
      showConfirmDelete: false,
      confirmDeleteNode: null,
      showConfirmDeleteConnection: false,
      history: [],
      historyLoading: false,
      logs: [],
      plugins: [],
      allTags: [],
      activeTag: null,
    };
    this.svg = null;
    this.draggedNode = null;
    this.sheet = null;
    this.nodes = [];
    this.availablePalettes = [];
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    this.viewport = null;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.editedNode = null;
    this.tempLine = null;
    this.api = new DataService();
    this.auth = new AuthService();
    this.draggingFrom = null;
    this.drawTempLine = this.drawTempLine.bind(this);
    this.endConnection = this.endConnection.bind(this);
    this.mouseMoveForDraging = this.mouseMoveForDraging.bind(this);
    this.mouseUpForDragging = this.mouseUpForDragging.bind(this);
    this.svgZoomWithMouse = this.svgZoomWithMouse.bind(this);
    this.svgPanMouseDown = this.svgPanMouseDown.bind(this);
    this.svgPanMouseMove = this.svgPanMouseMove.bind(this);
    this.svgPanMouseUp = this.svgPanMouseUp.bind(this);
    this.svgPanMouseLeave = this.svgPanMouseLeave.bind(this);
    this.svgDropEvent = this.svgDropEvent.bind(this);
    this.removeKeyDownEvent = this.removeKeyDownEvent.bind(this);
    this.rightClickRemoveEvent = this.rightClickRemoveEvent.bind(this);
    this.startConnection = this.startConnection.bind(this);
    this.drawConnectionLine = this.drawConnectionLine.bind(this);
    this.saveEditingNode = this.saveEditingNode.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.deleteNodeFromEdit = this.deleteNodeFromEdit.bind(this);
    this.saveEditingNode = this.saveEditingNode.bind(this);
    this.executeNode = this.executeNode.bind(this);
    this.executeAll = this.executeAll.bind(this);
    this.loadHistory = this.loadHistory.bind(this);
    this.updateNode = this.updateNode.bind(this);
  }

  makeNodeDragabble(node) {
    node.group.addEventListener("mousedown", (e) => {
      this.draggedNode = node;
      this.offsetX = e.clientX - this.draggedNode.x;
      this.offsetY = e.clientY - this.draggedNode.y;
    });

    node.group.addEventListener("dblclick", (e) => {
      const modal = document.getElementById("node-modal");
      if (modal) {
        this.editNode(node);
        modal.style.display = "block";
      }
    });
  }

  init() {
    this.svg = document.getElementById("canvas");

    // Create defs for grid pattern at SVG root level (not inside viewport)
    const defs = this.createSVGElement("defs", {});
    this.svg.appendChild(defs);

    this.gridPattern = this.createSVGElement("pattern", {
      id: "gridPattern",
      width: 40,
      height: 40,
      patternUnits: "userSpaceOnUse",
    });
    defs.appendChild(this.gridPattern);

    const gridRect = this.createSVGElement("rect", {
      width: 40,
      height: 40,
      fill: "#f9f9f9",
    });
    this.gridPattern.appendChild(gridRect);

    const gridLineX = this.createSVGElement("line", {
      x1: 0,
      y1: 0,
      x2: 40,
      y2: 0,
      stroke: "#ddd",
      "stroke-width": 1,
    });
    this.gridPattern.appendChild(gridLineX);

    const gridLineY = this.createSVGElement("line", {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 40,
      stroke: "#ddd",
      "stroke-width": 1,
    });
    this.gridPattern.appendChild(gridLineY);

    // Drop shadow filter for node cards
    const filter = this.createSVGElement("filter", {
      id: "dropShadow",
      x: "-10%",
      y: "-10%",
      width: "130%",
      height: "130%",
    });
    const feDropShadow = this.createSVGElement("feDropShadow", {
      dx: "0",
      dy: "2",
      stdDeviation: "3",
      "flood-color": "#000000",
      "flood-opacity": "0.12",
    });
    filter.appendChild(feDropShadow);
    defs.appendChild(filter);

    // Grid background at SVG root level - always fills the screen
    this.gridBackground = this.createSVGElement("rect", {
      width: "100%",
      height: "100%",
      fill: "url(#gridPattern)",
    });
    this.svg.appendChild(this.gridBackground);

    // Viewport group for all content (nodes, connections) - on top of grid
    this.viewport = this.createSVGElement("g", {});
    this.svg.appendChild(this.viewport);

    // Toggle grid on/off
    const gridBg = this.gridBackground;
    document
      .getElementById("toggleGrid")
      .addEventListener("change", function () {
        gridBg.style.display = this.checked ? "block" : "none";
      });
  }

  updateGridTransform() {
    this.gridPattern.setAttribute(
      "patternTransform",
      `translate(${this.offsetX}, ${this.offsetY}) scale(${this.scale})`
    );
  }

  componentWillUnmount() {
    document.removeEventListener("mousemove", this.mouseMoveForDraging);
    document.removeEventListener("mouseup", this.mouseUpForDragging);
    document.removeEventListener("keydown", this.removeKeyDownEvent);
    if (this.svg) {
      this.svg.removeEventListener("wheel", this.svgZoomWithMouse);
      this.svg.removeEventListener("mousedown", this.svgPanMouseDown);
      this.svg.removeEventListener("mousemove", this.svgPanMouseMove);
      this.svg.removeEventListener("mouseup", this.svgPanMouseUp);
      this.svg.removeEventListener("mouseleave", this.svgPanMouseLeave);
      this.svg.removeEventListener("drop", this.svgDropEvent);
    }
    if (this.viewport) {
      this.viewport.removeEventListener("contextmenu", this.rightClickRemoveEvent);
    }
  }

  async componentDidMount() {
    const { id } = this.props;
    await this.api
      .getSheet(id)
      .then((res) => res.json())
      .then((sheet) => {
        this.sheet = sheet;
      });
    this.init();
    this.events();

    await this.api
      .getPluginsList()
      .then((res) => res.json())
      .then((plugins) => {
        this.availablePalettes = plugins;
        const allTags = [...new Set(plugins.flatMap((p) => p.tags || []))].sort();
        this.setState({ plugins, allTags });
      });

    this.showSheetNodes();
  }

  // BFS: check if targetNode can already reach sourceNode via outputs.
  // If so, adding sourceNode→targetNode would create a cycle.
  wouldCreateCycle(sourceNodeId, targetNodeId) {
    const visited = new Set();
    const queue = [targetNodeId];
    while (queue.length > 0) {
      const id = queue.shift();
      if (id === sourceNodeId) return true;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = this.nodes.find((n) => n.id === id);
      if (node && node.outputs) {
        queue.push(...node.outputs);
      }
    }
    return false;
  }

  startConnection(node, type, index) {
    if (this.tempLine) this.viewport.removeChild(this.tempLine);
    const port =
      type === "input" ? node.inputs_ports[index] : node.outputs_ports[index];
    const cx = parseFloat(port.getAttribute("cx"));
    const cy = parseFloat(port.getAttribute("cy"));

    this.tempLine = this.createSVGElement("path", {
      d: `M ${cx},${cy} C ${cx},${cy} ${cx},${cy} ${cx},${cy}`,
      stroke: "blue",
      "stroke-width": 2,
      fill: "none",
      "pointer-events": "none",
    });
    this.viewport.appendChild(this.tempLine);
    this.draggingFrom = { node, type, index };
    this._tempStartX = cx;
    this._tempStartY = cy;
    this._tempStartType = type;
    document.addEventListener("mousemove", this.drawTempLine);
    document.addEventListener("mouseup", this.endConnection);
  }

  screenToSVG(clientX, clientY) {
    const point = this.svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(this.viewport.getScreenCTM().inverse());
  }

  drawTempLine(e) {
    if (!this.tempLine) return;

    const svgPoint = this.screenToSVG(e.clientX, e.clientY);
    const x1 = this._tempStartX;
    const y1 = this._tempStartY;
    const x2 = svgPoint.x;
    const y2 = svgPoint.y;
    const dx = Math.max(Math.abs(x2 - x1) * 0.5, 50);

    let d;
    if (this._tempStartType === "output") {
      d = `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
    } else {
      d = `M ${x1},${y1} C ${x1 - dx},${y1} ${x2 + dx},${y2} ${x2},${y2}`;
    }
    this.tempLine.setAttribute("d", d);
  }

  async endConnection(e) {
    if (!this.draggingFrom || !this.tempLine) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target.classList.contains("port")) {
      const fromNode = this.draggingFrom.node;
      const fromType = this.draggingFrom.type;
      const fromIndex = this.draggingFrom.index;
      const fromPort =
        fromType === "input"
          ? fromNode.inputs_ports[fromIndex]
          : fromNode.outputs_ports[fromIndex];

      const toId = target.getAttribute("data-port");
      const [toNodeId, toType, toIndex] = toId.split("_");
      const toNode = this.nodes.find((x) => x.id === toNodeId);

      // Determine the actual source and target for cycle detection
      const sourceNode = fromType === "output" ? fromNode : toNode;
      const targetNode = fromType === "output" ? toNode : fromNode;

      // Prevent connecting a node to itself
      if (sourceNode.id === targetNode.id) {
        // silently reject
      } else if (this.wouldCreateCycle(sourceNode.id, targetNode.id)) {
        this.setState({ showAlert: true, alertMessage: "Cannot connect: this would create a circular dependency.", alertType: "warning" });
      } else if (
        (fromType === "output" && toType === "input") ||
        (fromType === "input" && toType === "output")
      ) {
        const connection = {
          fromPort,
          toPort: target,
        };
        if (fromType === "output") {
          if (fromNode.outputs.indexOf(toNodeId) === -1)
            fromNode.outputs.push(toNodeId);

          if (toNode.inputs.indexOf(fromNode.id) === -1)
            toNode.inputs.push(fromNode.id);
        } else {
          if (fromNode.inputs.indexOf(toNodeId) === -1)
            fromNode.inputs.push(toNodeId);

          if (toNode.outputs.indexOf(fromNode.id) === -1)
            toNode.outputs.push(fromNode.id);
        }

        fromNode.connections.push(connection);

        this.drawConnectionLine(fromPort, target);
        await this.api.updateNewNode(this.sheet.uid, {
          id: fromNode.id,
          outputs: fromNode.outputs,
          inputs: fromNode.inputs,
          position: {
            x: fromNode.x,
            y: fromNode.y,
          },
          title: fromNode.title,
          params: fromNode.params,
        });

        await this.api.updateNewNode(this.sheet.uid, {
          id: toNode.id,
          outputs: toNode.outputs,
          inputs: toNode.inputs,
          position: {
            x: toNode.x,
            y: toNode.y,
          },
          title: toNode.title,
          params: toNode.params,
        });
      }
    }
    if (this.tempLine) {
      this.viewport.removeChild(this.tempLine);
      this.tempLine = null;
    }
    this.draggingFrom = null;
    document.removeEventListener("mousemove", this.drawTempLine);
    document.removeEventListener("mouseup", this.endConnection);
  }

  removeChildrenByClass(parent, className) {
    const elements = parent.getElementsByClassName(className);
    // Convert HTMLCollection to an array to avoid issues with live collection
    const elementsArray = Array.from(elements);
    for (let i = elementsArray.length - 1; i >= 0; i--) {
      elementsArray[i].parentNode.removeChild(elementsArray[i]);
    }
  }

  createSVGElement(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  drawConnectionLine(fromPort, toPort) {
    if (!fromPort || !toPort) return;
    let x1 = parseFloat(fromPort.getAttribute("cx"));
    let y1 = parseFloat(fromPort.getAttribute("cy"));
    let x2 = parseFloat(toPort.getAttribute("cx"));
    let y2 = parseFloat(toPort.getAttribute("cy"));

    const dx = Math.max(Math.abs(x2 - x1) * 0.5, 50);
    const d = `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;

    let path = this.createSVGElement("path", {
      d,
      class: "connection",
      fill: "none",
      "data-from-port": fromPort.getAttribute("data-port"),
      "data-to-port": toPort.getAttribute("data-port"),
    });

    // Prevent duplicates
    Array.from(this.viewport.querySelectorAll("path.connection")).forEach((p) => {
      if (p.getAttribute("d") === d) {
        this.viewport.removeChild(p);
      }
    });

    this.viewport.appendChild(path);

    return path;
  }

  reDrawAllConnections() {
    // Redraw all connections
    const paths = this.viewport.querySelectorAll("path.connection");
    paths.forEach((path) => {
      this.viewport.removeChild(path);
    });
    this.nodes.forEach((node) => {
      node.connections.forEach((conn) => {
        this.drawConnectionLine(conn.fromPort, conn.toPort);
      });
    });
  }

  mouseMoveForDraging(e) {
    if (this.draggedNode) {
      this.draggedNode.updatePosition(
        this.viewport,
        this.nodes,
        this.drawConnectionLine,
        e.clientX - this.offsetX,
        e.clientY - this.offsetY
      );
    }
  }
  async mouseUpForDragging(e) {
    if (this.draggedNode) {
      await this.api.updateNewNode(this.sheet.uid, {
        id: this.draggedNode.id,
        outputs: this.draggedNode.outputs,
        inputs: this.draggedNode.inputs,
        position: {
          x: this.draggedNode.x,
          y: this.draggedNode.y,
        },
        title: this.draggedNode.title,
        params: this.draggedNode.params,
      });
      this.draggedNode = null;
    }
  }

  applyZoom(newScale) {
    this.scale = Math.max(0.3, Math.min(5, newScale));
    this.viewport.setAttribute(
      "transform",
      `translate(${this.offsetX}, ${this.offsetY}) scale(${this.scale})`
    );
    this.updateGridTransform();
  }

  svgZoomWithMouse(e) {
    e.preventDefault();

    const zoomFactor = 0.1;
    if (e.deltaY < 0) {
      this.applyZoom(this.scale + zoomFactor);
    } else {
      this.applyZoom(this.scale - zoomFactor);
    }
  }

  svgPanMouseDown(e) {
    if (e.button === 0 && !this.draggedNode) {
      // Left click and not dragging a node
      this.isPanning = true;
      this.startX = e.clientX - this.offsetX;
      this.startY = e.clientY - this.offsetY;
      this.svg.style.cursor = "grabbing";
    }
  }

  svgPanMouseMove(e) {
    if (this.isPanning) {
      this.offsetX = e.clientX - this.startX;
      this.offsetY = e.clientY - this.startY;
      this.viewport.setAttribute(
        "transform",
        `translate(${this.offsetX}, ${this.offsetY}) scale(${this.scale})`
      );
      this.updateGridTransform();
    }
  }

  svgPanMouseUp(e) {
    this.isPanning = false;
    this.svg.style.cursor = "grab";
  }

  svgPanMouseLeave(e) {
    this.isPanning = false;
    this.svg.style.cursor = "grab";
  }

  showSheetNodes() {
    if (!this.sheet) return;
    this.sheet.data.nodes.forEach((node) => {
      const palette = this.availablePalettes.find(
        (x) => x.id === node.className
      );
      const _node = new Node(
        node.position.x,
        node.position.y,
        node.title ? node.title : palette.name,
        palette.id,
        JSON.parse(
          JSON.stringify(node.params ? node.params : palette.default_params)
        ),
        palette.icon,
        1,
        1,
        palette.iconBase64,
        palette.tags
      );

      _node.inputs = node.inputs;
      _node.outputs = node.outputs;
      _node.id = node.id;

      this.nodes.push(_node);
      _node.create(this.viewport, this.startConnection, this.updateNode);

      this.makeNodeDragabble(_node);

      const inputPort = this.viewport.querySelector(
        `[data-port='${_node.id}_input_0']`
      );
      const outputPort = this.viewport.querySelector(
        `[data-port='${_node.id}_output_0']`
      );
      _node.inputs.forEach((output) => {
        const connection = {
          fromPort: this.viewport.querySelector(
            `[data-port='${output}_output_0']`
          ),
          toPort: inputPort,
        };
        _node.connections.push(connection);
        this.drawConnectionLine(connection.fromPort, connection.toPort);
      });

      _node.outputs.forEach((input) => {
        const connection = {
          fromPort: outputPort,
          toPort: this.viewport.querySelector(`[data-port='${input}_input_0']`),
        };
        _node.connections.push(connection);
        this.drawConnectionLine(connection.fromPort, connection.toPort);
      });
    });
  }

  async svgDropEvent(e) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    const rect = this.svg.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.offsetX) / this.scale;
    const y = (e.clientY - rect.top - this.offsetY) / this.scale;
    const palette = this.availablePalettes.find((x) => x.id === data.id);
    const node = new Node(
      x,
      y,
      palette.name,
      palette.id,
      JSON.parse(JSON.stringify(palette.default_params)),
      palette.icon,
      data.inputs,
      data.outputs,
      palette.iconBase64,
      palette.tags
    );

    let _continue = false;
    await this.api
      .createNewNode(
        this.sheet.uid,
        data.id,
        data.id,
        {
          x,
          y,
        },
        {}
      )
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          node.id = data.id;
          _continue = true;
        }
      });
    if (!_continue) return;
    this.nodes.push(node);
    node.create(this.viewport, this.startConnection, this.updateNode);
    this.makeNodeDragabble(node);
  }

  async updateNode(node) {
    await this.api.updateNewNode(this.sheet.uid, {
      id: node.id,
      outputs: node.outputs,
      inputs: node.inputs,
      title: node.title,
      position: {
        x: node.x,
        y: node.y,
      },
      params: node.params,
    });
  }

  removeKeyDownEvent(e) {
    if (e.key === "Delete" && this.draggedNode) {
      this.deleteNode(this.draggedNode);
      this.draggedNode = null;
    }
  }

  async deleteNode(node) {
    let _continue = false;
    await this.api
      .deleteNode(this.sheet.uid, {
        id: node.id,
      })
      .then((res) => {
        if (res.status !== 500) _continue = true;
      });

    if (!_continue) return;
    const inputPort = this.viewport.querySelector(
      `[data-port='${node.id}_input_0']`
    );
    const outputPort = this.viewport.querySelector(
      `[data-port='${node.id}_output_0']`
    );
    this.nodes.forEach((_node) => {
      _node.inputs = _node.inputs.filter((x) => x !== node.id);
      _node.outputs = _node.outputs.filter((x) => x !== node.id);
      _node.connections = _node.connections.filter(
        (x) =>
          x.fromPort !== inputPort &&
          x.fromPort !== outputPort &&
          x.toPort !== inputPort &&
          x.toPort !== outputPort
      );
    });
    this.sheet.data.nodes.forEach((_node) => {
      _node.inputs = _node.inputs.filter((x) => x !== node.id);
      _node.outputs = _node.outputs.filter((x) => x !== node.id);
    });
    this.sheet.data.nodes = this.sheet.data.nodes.filter(
      (x) => x.id !== node.id
    );
    if (this.viewport.contains(node.group)) {
      this.viewport.removeChild(node.group); // Or use viewport.removeChild()
    }

    this.reDrawAllConnections();
    const modal = document.getElementById("node-modal");
    if (modal) modal.style.display = "none";
  }

  rightClickRemoveEvent(e) {
    // Check for connection path
    if (e.target.classList && e.target.classList.contains("connection")) {
      e.preventDefault();
      this.connectionToDelete = e.target;
      this.setState({ showConfirmDeleteConnection: true });
      return;
    }

    // Check for node
    let el = e.target;
    while (el && el !== this.viewport) {
      if (el.classList && el.classList.contains("node")) {
        e.preventDefault();
        const node = el.__node__;
        if (node) {
          this.setState({ showConfirmDelete: true, confirmDeleteNode: node });
        }
        return;
      }
      el = el.parentElement;
    }
  }

  handleConfirmDeleteConnectionYes = async () => {
    const pathEl = this.connectionToDelete;
    if (!pathEl) return;

    const fromPortId = pathEl.getAttribute("data-from-port");
    const toPortId = pathEl.getAttribute("data-to-port");

    if (fromPortId && toPortId) {
      const [fromNodeId] = fromPortId.split("_");
      const [toNodeId] = toPortId.split("_");

      const fromNode = this.nodes.find((n) => n.id === fromNodeId);
      const toNode = this.nodes.find((n) => n.id === toNodeId);

      if (fromNode && toNode) {
        // Remove from outputs/inputs arrays
        fromNode.outputs = fromNode.outputs.filter((id) => id !== toNodeId);
        toNode.inputs = toNode.inputs.filter((id) => id !== fromNodeId);

        // Remove from connections arrays
        const fromPort = this.viewport.querySelector(`[data-port='${fromPortId}']`);
        const toPort = this.viewport.querySelector(`[data-port='${toPortId}']`);
        fromNode.connections = fromNode.connections.filter(
          (c) => c.fromPort !== fromPort || c.toPort !== toPort
        );
        toNode.connections = toNode.connections.filter(
          (c) => c.fromPort !== fromPort || c.toPort !== toPort
        );

        // Update backend
        await this.api.updateNewNode(this.sheet.uid, {
          id: fromNode.id,
          outputs: fromNode.outputs,
          inputs: fromNode.inputs,
          position: { x: fromNode.x, y: fromNode.y },
          title: fromNode.title,
          params: fromNode.params,
        });
        await this.api.updateNewNode(this.sheet.uid, {
          id: toNode.id,
          outputs: toNode.outputs,
          inputs: toNode.inputs,
          position: { x: toNode.x, y: toNode.y },
          title: toNode.title,
          params: toNode.params,
        });
      }
    }

    // Remove the SVG path
    if (this.viewport.contains(pathEl)) {
      this.viewport.removeChild(pathEl);
    }

    this.connectionToDelete = null;
    this.setState({ showConfirmDeleteConnection: false });
  };

  handleConfirmDeleteConnectionNo = () => {
    this.connectionToDelete = null;
    this.setState({ showConfirmDeleteConnection: false });
  };

  events() {
    // Mouse events for dragging
    document.addEventListener("mousemove", this.mouseMoveForDraging);

    document.addEventListener("mouseup", this.mouseUpForDragging);

    // Zoom with mouse wheel (passive: false to allow preventDefault)
    this.svg.addEventListener("wheel", this.svgZoomWithMouse, { passive: false });

    // Pan with left mouse click drag

    this.svg.addEventListener("mousedown", this.svgPanMouseDown);

    this.svg.addEventListener("mousemove", this.svgPanMouseMove);

    this.svg.addEventListener("mouseup", this.svgPanMouseUp);

    this.svg.addEventListener("mouseleave", this.svgPanMouseLeave);

    // Drag start is now handled via React onDragStart in the palette JSX

    // Handle drop on canvas
    this.svg.addEventListener("dragover", function (e) {
      e.preventDefault();
    });
    this.svg.addEventListener("drop", this.svgDropEvent);

    // Remove node on Delete key
    document.addEventListener("keydown", this.removeKeyDownEvent);

    // Optional: Right-click to remove
    this.viewport.addEventListener("contextmenu", this.rightClickRemoveEvent);
    const modal = document.getElementById("node-modal");
    if (modal) {
      window.addEventListener("click", (event) => {
        if (event.target === modal) {
          modal.style.display = "none";
          this.editedNode = null;
        }
      });
    }
  }

  closeModal() {
    const modal = document.getElementById("node-modal");
    if (modal) {
      modal.style.display = "none";
      this.editedNode = null;
    }
  }

  editNode(node) {
    this.editedNode = node;
    this.setState({
      editedNodeInfo: {
        title: node.title,
        icon: node.icon,
        iconBase64: node.iconBase64,
      },
    });
    const modal = document.getElementById("node-modal");
    if (!modal) return;
    const editForm = document.getElementById("node-modal-editForm");
    if (!editForm) return;
    editForm.innerHTML = ""; // Clear previous inputs
    for (const param of node.params) {
      if (!param) continue;
      // Create a label
      const label = document.createElement("label");
      label.className = "node-modal-label";
      label.textContent =
        param.name.charAt(0).toUpperCase() + param.name.slice(1); // Capitalize the first letter
      label.setAttribute("for", param.alias);

      // Create an input field
      let input = document.createElement("input");
      input.className = "node-modal-input";
      input.setAttribute("placeholder", param.name);
      input.id = param.alias;
      input.name = param.alias;

      // Handle different data types
      if (param.type === "boolean") {
        input.type = "checkbox";
        input.checked = param.value
          ? param.value
          : param.default
          ? param.default
          : false;
      } else if (param.type === "number") {
        input.type = "number";
        input.value = param.value
          ? param.value
          : param.default
          ? param.default
          : 0;
      } else if (param.type === "big_string") {
        input = document.createElement("textarea");
        input.className = "editor-textarea";
        input.setAttribute("placeholder", param.name);
        input.id = param.alias;
        input.name = param.alias;
        input.value = param.value
          ? param.value
          : param.default
          ? param.default
          : 0;
      } else if (param.type === "select") {
        input = document.createElement("select");
        input.className = "node-modal-input";
        input.id = param.alias;
        input.name = param.alias;
        const currentVal = param.value !== undefined ? param.value : (param.default || "");
        (param.options || []).forEach(opt => {
          const option = document.createElement("option");
          option.value = opt.value;
          option.textContent = opt.label;
          if (opt.value === currentVal) option.selected = true;
          input.appendChild(option);
        });
      } else if (param.type === "radio") {
        input = document.createElement("div");
        input.className = "node-modal-radio-group";
        const currentVal = param.value !== undefined ? param.value : (param.default || "");
        (param.options || []).forEach(opt => {
          const wrapper = document.createElement("label");
          wrapper.className = "node-modal-radio-label";
          const radio = document.createElement("input");
          radio.type = "radio";
          radio.name = param.alias;
          radio.value = opt.value;
          radio.id = param.alias;
          radio.className = "node-modal-radio";
          if (opt.value === currentVal) radio.checked = true;
          wrapper.appendChild(radio);
          wrapper.appendChild(document.createTextNode(opt.label));
          input.appendChild(wrapper);
        });
      } else {
        input.type = param.secret ? "password" : "text";
        input.value = param.value
          ? param.value
          : param.default
          ? param.default
          : "";
      }

      // Append label and input to the form
      const div = document.createElement("div");
      div.appendChild(label);
      div.appendChild(input);
      editForm.appendChild(div);
    }
  }

  async saveEditingNode() {
    if (!this.editedNode) return;
    const editForm = document.getElementById("node-modal-editForm");
    if (!editForm) return;
    Array.from(editForm.elements).forEach((element) => {
      const param = this.editedNode.params.find((x) => x.alias === element.id);
      if (!param) return;
      if (element.type === "checkbox") {
        // For checkboxes, use the checked state
        param.value = element.checked;
      } else if (element.type === "radio") {
        // For radio buttons, only include the selected one
        if (element.checked) {
          param.value = element.value;
        }
      } else {
        // For other input types, use the value
        param.value = element.value;
      }
    });

    await this.api.updateNewNode(this.sheet.uid, {
      id: this.editedNode.id,
      outputs: this.editedNode.outputs,
      inputs: this.editedNode.inputs,
      position: {
        x: this.editedNode.x,
        y: this.editedNode.y,
      },
      title: this.editedNode.title,
      params: this.editedNode.params,
    });

    const modal = document.getElementById("node-modal");
    if (modal) modal.style.display = "none";
  }

  deleteNodeFromEdit() {
    if (this.editedNode) {
      this.deleteNode(this.editedNode);
      this.editedNode = null;
    }
  }

  handleDeleteYes = () => {
    this.deleteNodeFromEdit();
    this.setState({ showMessage: false });
  };

  handleDeleteNo = () => {
    this.setState({ showMessage: false });
  };

  displayMessageBox = () => {
    this.setState({ showMessage: true });
  };

  handleConfirmDeleteYes = () => {
    const node = this.state.confirmDeleteNode;
    if (node) {
      this.deleteNode(node);
    }
    this.setState({ showConfirmDelete: false, confirmDeleteNode: null });
  };

  handleConfirmDeleteNo = () => {
    this.setState({ showConfirmDelete: false, confirmDeleteNode: null });
  };

  executeNode() {
    if (this.editedNode) {
      this.api.executeNode(
        this.sheet.uid,
        {
          id: this.editedNode.id,
        },
        (data) => {
          const update = JSON.parse(data);
          const node = this.nodes.find((x) => x.id === update.id);
          if (node) {
            this.setState((prevState) => ({
              logs: [...prevState.logs, `${node.title}: ${update.message}`], // Append new log entry to the list
            }));
            if (node.statusElement) {
              if (update.stage === "executing") {
                node.statusElement.setAttribute("fill", "#dfd113");
              } else if (update.stage.trim() === "executed") {
                setTimeout(() => {
                  let color = "#27d827"; // green = success
                  if (update.conditionNotMet) color = "#999"; // gray = condition not met
                  else if (update.error) color = "#9e2121"; // red = error
                  node.statusElement.setAttribute("fill", color);
                }, 10);
              }
            }
          }
        }
      );

      const modal = document.getElementById("node-modal");
      if (modal) modal.style.display = "none";
      this.setState({ showMessage: false, logs: [], showLogModal: true });
    }
  }

  executeAll() {
    const rootNodes = this.nodes.filter((n) => !n.inputs || n.inputs.length === 0);
    if (rootNodes.length === 0) return;

    this.setState({ logs: [], showLogModal: true });

    const sseCallback = (data) => {
      const update = JSON.parse(data);
      const node = this.nodes.find((x) => x.id === update.id);
      if (node) {
        this.setState((prevState) => ({
          logs: [...prevState.logs, `${node.title}: ${update.message}`],
        }));
        if (node.statusElement) {
          if (update.stage === "executing") {
            node.statusElement.setAttribute("fill", "#dfd113");
          } else if (update.stage.trim() === "executed") {
            setTimeout(() => {
              let color = "#27d827"; // green = success
              if (update.conditionNotMet) color = "#999"; // gray = condition not met
              else if (update.error) color = "#9e2121"; // red = error
              node.statusElement.setAttribute("fill", color);
            }, 10);
          }
        }
      }
    };

    rootNodes.forEach((rootNode) => {
      this.api.executeNode(this.sheet.uid, { id: rootNode.id }, sseCallback);
    });
  }

  async loadHistory() {
    this.setState({ historyLoading: true, showHistoryModal: true });
    try {
      const res = await this.api.getSheetHistory(this.sheet.uid);
      const history = await res.json();
      this.setState({ history, historyLoading: false });
    } catch (err) {
      console.error("Failed to load history:", err);
      this.setState({ history: [], historyLoading: false });
    }
  }

  render() {
    return (
      <div>
        <div id="toolbar-left">
          <button className="toolbar-btn back-btn" onClick={() => { window.location.href = "/editor"; }}>
            <i className="fa-solid fa-arrow-left"></i> Back
          </button>
          <button className="toolbar-btn play-all-btn" onClick={this.executeAll}>
            <i className="fa-solid fa-play"></i> Play All
          </button>
          <button className="toolbar-btn history-btn" onClick={this.loadHistory}>
            <i className="fa-solid fa-clock-rotate-left"></i> History
          </button>
        </div>

        <div id="toolbar-right">
          <label>
            <input type="checkbox" id="toggleGrid" defaultChecked />
            Grid
          </label>
          <button className="zoom-btn" onClick={() => this.applyZoom(this.scale + 0.1)}>+</button>
          <button className="zoom-btn" onClick={() => this.applyZoom(this.scale - 0.1)}>-</button>
          <button className="toolbar-btn logout-btn" onClick={async () => { await this.auth.logout(); window.location.href = "/login"; }} title="Logout">
            <i className="fa-solid fa-right-from-bracket"></i> Logout
          </button>
        </div>

        <div id="palette">
          <div className="palette-header">Plugins</div>
          <div className="palette-tags">
            <button
              className={`palette-tag ${this.state.activeTag === null ? "active" : ""}`}
              onClick={() => this.setState({ activeTag: null })}
            >
              All
            </button>
            {this.state.allTags.map((tag) => (
              <button
                key={tag}
                className={`palette-tag ${this.state.activeTag === tag ? "active" : ""}`}
                onClick={() => this.setState({ activeTag: tag })}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="palette-list">
            {this.state.plugins
              .filter(
                (p) =>
                  !this.state.activeTag ||
                  (p.tags && p.tags.includes(this.state.activeTag))
              )
              .map((plugin) => (
                <div
                  key={plugin.id}
                  className="palette-node"
                  draggable="true"
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "text/plain",
                      JSON.stringify({
                        id: plugin.id,
                        inputs: 1,
                        outputs: 1,
                      })
                    );
                  }}
                >
                  {plugin.iconBase64 ? (
                    <img className="palette-node-icon-img" src={plugin.iconBase64} alt="" />
                  ) : (
                    <span className="palette-node-icon">{plugin.icon}</span>
                  )}
                  <div className="palette-node-info">
                    <span className="palette-node-name">{plugin.name}</span>
                    <span className="palette-node-desc">{plugin.description}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <svg id="canvas"></svg>

        <div id="node-modal" className="node-modal">
          <div className="node-modal-content">
            <span className="node-modal-close" onClick={this.closeModal}>
              &times;
            </span>
            <div className="node-modal-header">
              <div className="node-modal-header-icon">
                {this.state.editedNodeInfo?.iconBase64 ? (
                  <img src={this.state.editedNodeInfo.iconBase64} alt="" />
                ) : (
                  <span>{this.state.editedNodeInfo?.icon || "📁"}</span>
                )}
              </div>
              <div className="node-modal-header-text">
                <h2>{this.state.editedNodeInfo?.title || "Node"}</h2>
                <span className="node-modal-editing-tag">Editing</span>
              </div>
            </div>
            <div className="node-modal-divider"></div>
            <form id="node-modal-editForm"></form>
            <div className="node-modal-actions">
              <button
                type="button"
                id="node-modal-saveChanges"
                onClick={this.saveEditingNode}
              >
                <i className="fa-solid fa-floppy-disk"></i> Save
              </button>
              <button className="execute-button" onClick={this.executeNode}>
                <i className="fa-solid fa-play"></i> Execute
              </button>
              <button
                type="button"
                className="node-modal-delete-btn"
                onClick={this.displayMessageBox}
              >
                <i className="fa-solid fa-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
        {this.state.showLogModal && (
          <LogModal
            logs={this.state.logs}
            onClose={() => this.setState({ showLogModal: false })}
          />
        )}
        {this.state.showHistoryModal && (
          <HistoryModal
            history={this.state.history}
            loading={this.state.historyLoading}
            onClose={() => this.setState({ showHistoryModal: false })}
          />
        )}

        {this.state.showMessage && (
          <MessageBox
            message="Are you sure you want to delete this node?"
            type="warning"
            buttons={[
              { label: "Delete", onClick: this.handleDeleteYes, variant: "danger" },
              { label: "Cancel", onClick: this.handleDeleteNo, variant: "default" },
            ]}
            onClose={() => this.setState({ showMessage: false })}
          />
        )}

        {this.state.showAlert && (
          <MessageBox
            message={this.state.alertMessage}
            type={this.state.alertType}
            onClose={() => this.setState({ showAlert: false })}
          />
        )}

        {this.state.showConfirmDelete && (
          <MessageBox
            message="Delete this node?"
            type="warning"
            buttons={[
              { label: "Delete", onClick: this.handleConfirmDeleteYes, variant: "danger" },
              { label: "Cancel", onClick: this.handleConfirmDeleteNo, variant: "default" },
            ]}
            onClose={this.handleConfirmDeleteNo}
          />
        )}

        {this.state.showConfirmDeleteConnection && (
          <MessageBox
            message="Remove this connection?"
            type="warning"
            buttons={[
              { label: "Remove", onClick: this.handleConfirmDeleteConnectionYes, variant: "danger" },
              { label: "Cancel", onClick: this.handleConfirmDeleteConnectionNo, variant: "default" },
            ]}
            onClose={this.handleConfirmDeleteConnectionNo}
          />
        )}
      </div>
    );
  }
}
