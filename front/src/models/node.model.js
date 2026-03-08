export default class Node {
  static TAG_COLORS = {
    network: "#4A90D9",
    io: "#E8A838",
    flow: "#9B59B6",
    data: "#2ECC71",
    notification: "#E74C3C",
    terminal: "#34495E",
    script: "#F39C12",
    example: "#95A5A6",
  };

  static DEFAULT_COLOR = "#888888";

  constructor(
    x,
    y,
    title,
    type,
    params = null,
    icon = "📁",
    numInputs = 1,
    numOutputs = 1,
    iconBase64 = null,
    tags = []
  ) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.x = x;
    this.type = type;
    this.y = y;
    this.params = params;
    this.title = title;
    this.icon = icon;
    this.iconBase64 = iconBase64;
    this.tags = tags;
    this.numInputs = numInputs;
    this.numOutputs = numOutputs;
    this.inputs = [];
    this.outputs = [];
    this.inputs_ports = [];
    this.outputs_ports = [];
    this.connections = []; // { fromPort, toPort }

    // Card dimensions
    this.cardWidth = 160;
    this.cardHeight = 80;
    this.headerHeight = 10;
    this.cornerRadius = 12;
  }

  getHeaderColor() {
    const tag = this.tags && this.tags.length > 0 ? this.tags[0] : null;
    return (tag && Node.TAG_COLORS[tag]) || Node.DEFAULT_COLOR;
  }

  create(viewport, startConnection, updateTitle) {
    // Group element
    this.group = this.createSVGElement("g", { class: "node" });
    viewport.appendChild(this.group);

    const left = this.x - this.cardWidth / 2;
    const top = this.y - this.cardHeight / 2;
    const bodyCenter = this.y + this.headerHeight / 2;

    // Header rect (full card size, tag color, rounded corners — visible only at top)
    this.headerRect = this.createSVGElement("rect", {
      x: left,
      y: top,
      width: this.cardWidth,
      height: this.cardHeight,
      rx: this.cornerRadius,
      ry: this.cornerRadius,
      fill: this.getHeaderColor(),
      class: "node-header",
    });
    this.group.appendChild(this.headerRect);

    // Body rect (white, covers below header, rounded corners at bottom)
    this.bodyRect = this.createSVGElement("rect", {
      x: left,
      y: top + this.headerHeight,
      width: this.cardWidth,
      height: this.cardHeight - this.headerHeight,
      rx: this.cornerRadius,
      ry: this.cornerRadius,
      fill: "#ffffff",
      class: "node-body",
    });
    this.group.appendChild(this.bodyRect);

    // Card outline (transparent fill, just for the border + shadow)
    this.cardRect = this.createSVGElement("rect", {
      x: left,
      y: top,
      width: this.cardWidth,
      height: this.cardHeight,
      rx: this.cornerRadius,
      ry: this.cornerRadius,
      fill: "none",
      stroke: "#e0e0e0",
      "stroke-width": 1,
      filter: "url(#dropShadow)",
      class: "node-card",
    });
    this.group.appendChild(this.cardRect);

    // Status bar (left-edge strip for execution status)
    this.statusBar = this.createSVGElement("rect", {
      x: left,
      y: top + this.headerHeight,
      width: 4,
      height: this.cardHeight - this.headerHeight - this.cornerRadius,
      fill: "transparent",
      class: "node-status-bar",
    });
    this.group.appendChild(this.statusBar);
    this.statusElement = this.statusBar;

    // Icon inside card body
    if (this.iconBase64) {
      this.iconEl = this.createSVGElement("image", {
        x: left + 14,
        y: bodyCenter - 16,
        width: 32,
        height: 32,
        href: this.iconBase64,
        class: "text-unselectable",
      });
    } else {
      this.iconEl = this.createSVGElement("text", {
        x: left + 30,
        y: bodyCenter + 8,
        "text-anchor": "middle",
        "font-size": "22px",
        class: "text-unselectable",
      });
      this.iconEl.textContent = this.icon;
    }
    this.group.appendChild(this.iconEl);

    // ClipPath for title text (prevents overflow beyond card boundary)
    const clipId = `clip-title-${this.id}`;
    const clipPath = this.createSVGElement("clipPath", { id: clipId });
    this.titleClipRect = this.createSVGElement("rect", {
      x: left + 50,
      y: top + this.headerHeight,
      width: this.cardWidth - 58,
      height: this.cardHeight - this.headerHeight,
    });
    clipPath.appendChild(this.titleClipRect);
    this.group.appendChild(clipPath);

    // Title (to the right of icon, clipped to card bounds)
    this.titleText = this.createSVGElement("text", {
      x: left + 52,
      y: bodyCenter + 5,
      class: "node-title",
      "clip-path": `url(#${clipId})`,
    });
    this.titleText.textContent = this.title;

    // Add a double-click event listener to the text element
    this.titleText.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      // Create an input field
      const input = document.createElement("input");
      input.type = "text";
      input.value = this.titleText.textContent;
      input.style.position = "absolute";
      input.style.left = `${this.titleText.getBoundingClientRect().left}px`;
      input.style.top = `${this.titleText.getBoundingClientRect().top}px`;
      input.style.width = `${Math.max(this.titleText.getComputedTextLength() + 5, 80)}px`;

      document.body.appendChild(input);
      input.focus();

      const handleKeyDown = (event) => {
        if (event.key === "Enter") {
          handleInputEnd();
        }
      };

      const handleInputEnd = () => {
        this.titleText.textContent = input.value;
        this.title = input.value;
        if (updateTitle) updateTitle(this);
        document.body.removeChild(input);
        input.removeEventListener("blur", handleInputEnd);
        input.removeEventListener("keydown", handleKeyDown);
      };

      input.addEventListener("blur", handleInputEnd);
      input.addEventListener("keydown", handleKeyDown);
    });
    this.group.appendChild(this.titleText);

    // Create ports
    const portRadius = 8;
    const verticalSpacing = 25;

    for (let i = 0; i < this.numInputs; i++) {
      const y =
        this.y -
        ((this.numInputs - 1) * verticalSpacing) / 2 +
        i * verticalSpacing;
      const port = this.createSVGElement("circle", {
        cx: this.x - this.cardWidth / 2,
        cy: y,
        r: portRadius,
        class: "port",
        "data-port": `${this.id}_input_${i}`,
      });
      this.inputs_ports.push(port);
      this.group.appendChild(port);

      port.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        startConnection(this, "input", i);
      });
    }

    for (let i = 0; i < this.numOutputs; i++) {
      const y =
        this.y -
        ((this.numOutputs - 1) * verticalSpacing) / 2 +
        i * verticalSpacing;
      const port = this.createSVGElement("circle", {
        cx: this.x + this.cardWidth / 2,
        cy: y,
        r: portRadius,
        class: "port",
        "data-port": `${this.id}_output_${i}`,
      });
      this.outputs_ports.push(port);
      this.group.appendChild(port);

      port.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        startConnection(this, "output", i);
      });
    }

    this.group.__node__ = this;
  }

  createSVGElement(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  updatePosition(viewport, nodes, drawConnectionLine, x, y) {
    this.x = x;
    this.y = y;

    const left = this.x - this.cardWidth / 2;
    const top = this.y - this.cardHeight / 2;
    const bodyCenter = this.y + this.headerHeight / 2;

    // Header rect
    this.headerRect.setAttribute("x", left);
    this.headerRect.setAttribute("y", top);

    // Body rect
    this.bodyRect.setAttribute("x", left);
    this.bodyRect.setAttribute("y", top + this.headerHeight);

    // Card outline
    this.cardRect.setAttribute("x", left);
    this.cardRect.setAttribute("y", top);

    // Status bar
    this.statusBar.setAttribute("x", left);
    this.statusBar.setAttribute("y", top + this.headerHeight);

    // Title clip rect
    this.titleClipRect.setAttribute("x", left + 50);
    this.titleClipRect.setAttribute("y", top + this.headerHeight);

    // Icon
    if (this.iconBase64) {
      this.iconEl.setAttribute("x", left + 14);
      this.iconEl.setAttribute("y", bodyCenter - 16);
    } else {
      this.iconEl.setAttribute("x", left + 30);
      this.iconEl.setAttribute("y", bodyCenter + 8);
    }

    // Title
    this.titleText.setAttribute("x", left + 52);
    this.titleText.setAttribute("y", bodyCenter + 5);

    // Ports
    const verticalSpacing = 25;

    for (let i = 0; i < this.inputs_ports.length; i++) {
      const y =
        this.y -
        ((this.numInputs - 1) * verticalSpacing) / 2 +
        i * verticalSpacing;
      this.inputs_ports[i].setAttribute("cx", this.x - this.cardWidth / 2);
      this.inputs_ports[i].setAttribute("cy", y);
    }

    for (let i = 0; i < this.outputs_ports.length; i++) {
      const y =
        this.y -
        ((this.numOutputs - 1) * verticalSpacing) / 2 +
        i * verticalSpacing;
      this.outputs_ports[i].setAttribute("cx", this.x + this.cardWidth / 2);
      this.outputs_ports[i].setAttribute("cy", y);
    }

    // Redraw all connections
    const paths = viewport.querySelectorAll("path.connection");
    paths.forEach((path) => {
      viewport.removeChild(path);
    });
    nodes.forEach((node) => {
      node.connections.forEach((conn) => {
        drawConnectionLine(conn.fromPort, conn.toPort);
      });
    });
  }
}
