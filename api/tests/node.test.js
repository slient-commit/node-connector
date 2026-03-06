const Node = require("../src/node");

describe("Node", () => {
  test("constructor initializes properties", () => {
    const node = new Node("Test", "TestClass", { x: 10, y: 20 }, []);
    expect(node.title).toBe("Test");
    expect(node.className).toBe("TestClass");
    expect(node.position).toEqual({ x: 10, y: 20 });
    expect(node.params).toEqual([]);
    expect(node.inputs).toEqual([]);
    expect(node.outputs).toEqual([]);
    expect(typeof node.id).toBe("string");
    expect(node.id.length).toBeGreaterThan(0);
  });

  test("each node gets a unique id", () => {
    const a = new Node("A", "C", {}, []);
    const b = new Node("B", "C", {}, []);
    expect(a.id).not.toBe(b.id);
  });

  describe("addInput", () => {
    test("creates bidirectional link", () => {
      const parent = new Node("Parent", "C", {}, []);
      const child = new Node("Child", "C", {}, []);
      child.addInput(parent);
      expect(child.inputs).toContain(parent.id);
      expect(parent.outputs).toContain(child.id);
    });

    test("prevents duplicate links", () => {
      const parent = new Node("Parent", "C", {}, []);
      const child = new Node("Child", "C", {}, []);
      child.addInput(parent);
      child.addInput(parent);
      expect(child.inputs.filter((id) => id === parent.id)).toHaveLength(1);
      expect(parent.outputs.filter((id) => id === child.id)).toHaveLength(1);
    });
  });

  describe("addOutput", () => {
    test("creates bidirectional link", () => {
      const parent = new Node("Parent", "C", {}, []);
      const child = new Node("Child", "C", {}, []);
      parent.addOutput(child);
      expect(parent.outputs).toContain(child.id);
      expect(child.inputs).toContain(parent.id);
    });

    test("prevents duplicate links", () => {
      const parent = new Node("Parent", "C", {}, []);
      const child = new Node("Child", "C", {}, []);
      parent.addOutput(child);
      parent.addOutput(child);
      expect(parent.outputs.filter((id) => id === child.id)).toHaveLength(1);
      expect(child.inputs.filter((id) => id === parent.id)).toHaveLength(1);
    });
  });

  describe("removeInput", () => {
    test("removes bidirectional link", () => {
      const parent = new Node("Parent", "C", {}, []);
      const child = new Node("Child", "C", {}, []);
      child.addInput(parent);
      child.removeInput(parent);
      expect(child.inputs).not.toContain(parent.id);
      expect(parent.outputs).not.toContain(child.id);
    });

    test("no-ops when link does not exist", () => {
      const a = new Node("A", "C", {}, []);
      const b = new Node("B", "C", {}, []);
      a.removeInput(b); // should not throw
      expect(a.inputs).toEqual([]);
      expect(b.outputs).toEqual([]);
    });
  });

  describe("removeOutput", () => {
    test("removes bidirectional link", () => {
      const parent = new Node("Parent", "C", {}, []);
      const child = new Node("Child", "C", {}, []);
      parent.addOutput(child);
      parent.removeOutput(child);
      expect(parent.outputs).not.toContain(child.id);
      expect(child.inputs).not.toContain(parent.id);
    });

    test("no-ops when link does not exist", () => {
      const a = new Node("A", "C", {}, []);
      const b = new Node("B", "C", {}, []);
      a.removeOutput(b); // should not throw
      expect(a.outputs).toEqual([]);
      expect(b.inputs).toEqual([]);
    });
  });
});
