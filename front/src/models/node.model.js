export default class Node {
  constructor(
    x,
    y,
    title,
    type,
    params = null,
    icon = "📁",
    numInputs = 1,
    numOutputs = 1,
    iconBase64 = null
  ) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.x = x;
    this.type = type;
    this.y = y;
    this.params = params;
    this.title = title;
    this.icon = icon;
    this.iconBase64 = iconBase64;
    this.radius = 40;
    this.numInputs = numInputs;
    this.numOutputs = numOutputs;
    this.inputs = [];
    this.outputs = [];
    this.inputs_ports = [];
    this.outputs_ports = [];
    this.connections = []; // { fromPort, toPort }
  }

  create(viewport, startConnection, updateTitle) {
    // Group element
    this.group = this.createSVGElement("g", { class: "node" });
    viewport.appendChild(this.group);

    // Title
    this.titleText = this.createSVGElement("text", {
      x: this.x,
      y: this.y - this.radius - 20,
      class: "title",
    });
    this.titleText.textContent = this.title;

    // Add a double-click event listener to the text element
    this.titleText.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      // Create an input field
      const input = document.createElement("input");
      input.type = "text";
      input.value = this.titleText.textContent; // Set the current text as the input value
      input.style.position = "absolute";
      input.style.left = `${this.titleText.getBoundingClientRect().left}px`;
      input.style.top = `${this.titleText.getBoundingClientRect().top}px`;
      input.style.width = `${this.titleText.getComputedTextLength() + 5}px`;

      // Append the input field to the body
      document.body.appendChild(input);

      // Focus on the input field
      input.focus();

      const handleKeyDown = (event) => {
        if (event.key === "Enter") {
          handleInputEnd();
        }
      };

      // Handle the input losing focus or pressing Enter
      const handleInputEnd = () => {
        // Update the text element with the new value
        this.titleText.textContent = input.value;
        this.title = input.value;
        console.log(this.title, updateTitle);
        if (updateTitle) updateTitle(this);
        // Remove the input field
        document.body.removeChild(input);

        // Remove event listeners
        input.removeEventListener("blur", handleInputEnd);
        input.removeEventListener("keydown", handleKeyDown);
      };

      // Add event listeners for blur and keydown
      input.addEventListener("blur", handleInputEnd);
      input.addEventListener("keydown", handleKeyDown);
    });
    this.group.appendChild(this.titleText);

    // Circle
    this.circle = this.createSVGElement("circle", {
      cx: this.x,
      cy: this.y,
      r: this.radius,
      fill: "#ddd",
      stroke: "#333",
      "stroke-width": 2,
    });
    this.group.appendChild(this.circle);

    // Icon inside circle
    if (this.iconBase64) {
      this.iconEl = this.createSVGElement("image", {
        x: this.x - 20,
        y: this.y - 20,
        width: 40,
        height: 40,
        href: this.iconBase64,
        class: "text-unselectable",
      });
    } else {
      this.iconEl = this.createSVGElement("text", {
        x: this.x,
        y: this.y + 10,
        "text-anchor": "middle",
        "font-size": "24px",
        class: "text-unselectable",
      });
      this.iconEl.textContent = this.icon;
    }
    this.group.appendChild(this.iconEl);

    // Create ports
    const portRadius = 7;
    const verticalSpacing = 25;

    for (let i = 0; i < this.numInputs; i++) {
      const y =
        this.y -
        ((this.numInputs - 1) * verticalSpacing) / 2 +
        i * verticalSpacing;
      const port = this.createSVGElement("circle", {
        cx: this.x - this.radius - portRadius - 5,
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
        cx: this.x + this.radius + portRadius + 5,
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

    this.titleText.setAttribute("x", this.x);
    this.titleText.setAttribute("y", this.y - this.radius - 20);

    this.circle.setAttribute("cx", this.x);
    this.circle.setAttribute("cy", this.y);

    if (this.iconBase64) {
      this.iconEl.setAttribute("x", this.x - 20);
      this.iconEl.setAttribute("y", this.y - 20);
    } else {
      this.iconEl.setAttribute("x", this.x);
      this.iconEl.setAttribute("y", this.y + 10);
    }

    const portRadius = 7;
    const verticalSpacing = 25;

    // Update input ports
    for (let i = 0; i < this.inputs_ports.length; i++) {
      const y =
        this.y -
        ((this.numInputs - 1) * verticalSpacing) / 2 +
        i * verticalSpacing;
      this.inputs_ports[i].setAttribute(
        "cx",
        this.x - this.radius - portRadius - 5
      );
      this.inputs_ports[i].setAttribute("cy", y);
    }

    // Update output ports
    for (let i = 0; i < this.outputs_ports.length; i++) {
      const y =
        this.y -
        ((this.numOutputs - 1) * verticalSpacing) / 2 +
        i * verticalSpacing;
      this.outputs_ports[i].setAttribute(
        "cx",
        this.x + this.radius + portRadius + 5
      );
      this.outputs_ports[i].setAttribute("cy", y);
    }

    // Redraw all connections
    const lines = viewport.querySelectorAll("line.connection");
    lines.forEach((line) => {
      viewport.removeChild(line);
    });
    nodes.forEach((node) => {
      node.connections.forEach((conn) => {
        drawConnectionLine(conn.fromPort, conn.toPort);
      });
    });
  }
}
