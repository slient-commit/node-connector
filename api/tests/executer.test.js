const Executer = require("../src/executer");

describe("Executer", () => {
  describe("getParams()", () => {
    test("extracts alias:value pairs from node params", () => {
      const node = {
        params: [
          { alias: "host", value: "example.com", default: "" },
          { alias: "port", value: "8080", default: "80" },
        ],
      };
      const result = Executer.getParams(node);
      expect(result).toEqual({ host: "example.com", port: "8080" });
    });

    test("falls back to default when value is falsy", () => {
      const node = {
        params: [
          { alias: "host", value: undefined, default: "localhost" },
          { alias: "port", value: "", default: "3000" },
        ],
      };
      const result = Executer.getParams(node);
      expect(result).toEqual({ host: "localhost", port: "3000" });
    });

    test("handles empty params", () => {
      const node = { params: [] };
      const result = Executer.getParams(node);
      expect(result).toEqual({});
    });

    test("skips null/undefined param entries", () => {
      const node = {
        params: [null, undefined, { alias: "x", value: "1", default: "0" }],
      };
      const result = Executer.getParams(node);
      expect(result).toEqual({ x: "1" });
    });
  });

  describe("resolveVariables()", () => {
    test("replaces {{var}} with input values", () => {
      const params = { cmd: "echo {{message}}" };
      const input = { message: "hello" };
      const result = Executer.resolveVariables(params, input);
      expect(result.cmd).toBe("echo hello");
    });

    test("handles dot notation", () => {
      const params = { val: "{{a.b.c}}" };
      const input = { a: { b: { c: "deep" } } };
      const result = Executer.resolveVariables(params, input);
      expect(result.val).toBe("deep");
    });

    test("strips leading input. prefix", () => {
      const params = { val: "{{input.name}}" };
      const input = { name: "test" };
      const result = Executer.resolveVariables(params, input);
      expect(result.val).toBe("test");
    });

    test("JSON.stringifies object values", () => {
      const params = { val: "{{data}}" };
      const input = { data: { key: "value" } };
      const result = Executer.resolveVariables(params, input);
      expect(result.val).toBe('{"key":"value"}');
    });

    test("leaves unmatched placeholders unchanged", () => {
      const params = { val: "{{missing}}" };
      const input = { other: "value" };
      const result = Executer.resolveVariables(params, input);
      expect(result.val).toBe("{{missing}}");
    });

    test("returns params unchanged when input is empty", () => {
      const params = { val: "{{something}}" };
      const result = Executer.resolveVariables(params, {});
      expect(result.val).toBe("{{something}}");
    });

    test("returns params unchanged when input is null", () => {
      const params = { val: "{{something}}" };
      const result = Executer.resolveVariables(params, null);
      expect(result.val).toBe("{{something}}");
    });

    test("skips the input key itself", () => {
      const params = { input: "should not change", val: "{{x}}" };
      const input = { x: "replaced" };
      const result = Executer.resolveVariables(params, input);
      expect(result.input).toBe("should not change");
      expect(result.val).toBe("replaced");
    });

    test("skips non-string values", () => {
      const params = { num: 42, val: "{{x}}" };
      const input = { x: "ok" };
      const result = Executer.resolveVariables(params, input);
      expect(result.num).toBe(42);
      expect(result.val).toBe("ok");
    });

    test("replaces multiple placeholders in one string", () => {
      const params = { val: "{{a}} and {{b}}" };
      const input = { a: "foo", b: "bar" };
      const result = Executer.resolveVariables(params, input);
      expect(result.val).toBe("foo and bar");
    });
  });

  describe("executeNodes()", () => {
    // Helper to create a mock node for the execution engine
    function makeExecNode(id, className, outputs = [], inputs = [], params = {}) {
      return {
        id,
        node: { id, className, title: id, outputs, inputs, params },
        result: null,
        isExecuted: false,
      };
    }

    // A simple pass-through plugin class
    class PassThrough {
      static get name() { return "PassThrough"; }
      log() { return { type: "info", name: "PassThrough", message: "" }; }
      async logic(params) {
        return {
          status: { error: false, message: "ok" },
          output: { ...(params.input || {}), ran: true },
        };
      }
    }

    // A plugin that always fails
    class FailPlugin {
      static get name() { return "FailPlugin"; }
      log() { return { type: "error", name: "FailPlugin", message: "" }; }
      async logic() {
        return {
          status: { error: true, message: "failed" },
          output: {},
        };
      }
    }

    // Mock ToolLoader
    function mockToolLoader(classes) {
      jest.spyOn(require("../src/tool-loader").prototype, "load").mockReturnValue(classes);
    }

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test("runs a single-node chain", async () => {
      const nodeA = makeExecNode("A", "PassThrough");
      mockToolLoader([PassThrough]);

      const progress = [];
      await Executer.executeNodes(
        [nodeA], "A", "../plugins",
        (p) => progress.push(p),
        null
      );

      expect(nodeA.isExecuted).toBe(true);
      expect(nodeA.result.output.ran).toBe(true);
      expect(progress.some((p) => p.stage === "executed" && p.id === "A")).toBe(true);
    });

    test("runs a linear A→B chain", async () => {
      const nodeA = makeExecNode("A", "PassThrough", ["B"]);
      const nodeB = makeExecNode("B", "PassThrough", [], ["A"]);
      mockToolLoader([PassThrough]);

      await Executer.executeNodes(
        [nodeA, nodeB], "A", "../plugins",
        null, null
      );

      expect(nodeA.isExecuted).toBe(true);
      expect(nodeB.isExecuted).toBe(true);
    });

    test("propagates data from upstream to downstream", async () => {
      class Producer {
        static get name() { return "Producer"; }
        log() { return { type: "info", name: "Producer", message: "" }; }
        async logic() {
          return {
            status: { error: false, message: "ok" },
            output: { value: 42 },
          };
        }
      }

      class Consumer {
        static get name() { return "Consumer"; }
        log() { return { type: "info", name: "Consumer", message: "" }; }
        async logic(params) {
          return {
            status: { error: false, message: "ok" },
            output: { received: params.input?.value },
          };
        }
      }

      const nodeA = makeExecNode("A", "Producer", ["B"]);
      const nodeB = makeExecNode("B", "Consumer", [], ["A"]);
      mockToolLoader([Producer, Consumer]);

      await Executer.executeNodes(
        [nodeA, nodeB], "A", "../plugins",
        null, null
      );

      expect(nodeB.result.output.received).toBe(42);
    });

    test("handles node failure and propagates to downstream", async () => {
      const nodeA = makeExecNode("A", "FailPlugin", ["B"]);
      const nodeB = makeExecNode("B", "PassThrough", [], ["A"]);
      mockToolLoader([FailPlugin, PassThrough]);

      const progress = [];
      await Executer.executeNodes(
        [nodeA, nodeB], "A", "../plugins",
        (p) => progress.push(p),
        null
      );

      // B should be skipped due to A's failure
      const bExecuted = progress.find(
        (p) => p.id === "B" && p.stage === "executed"
      );
      expect(bExecuted).toBeTruthy();
      expect(bExecuted.error).toBe(true);
      expect(bExecuted.message).toMatch(/previous node failed/i);
    });

    test("waits for multiple inputs before executing", async () => {
      // A and B both feed into C
      const nodeA = makeExecNode("A", "PassThrough", ["C"]);
      const nodeB = makeExecNode("B", "PassThrough", ["C"]);
      const nodeC = makeExecNode("C", "PassThrough", [], ["A", "B"]);
      mockToolLoader([PassThrough]);

      // Start from A — but B also needs to run for C to execute.
      // We start both A and B as entry points by making B another entry.
      // Actually executeNodes starts from a single nodeId entry.
      // Let's test with a diamond: Entry→A, Entry→B, A→C, B→C
      const entry = makeExecNode("Entry", "PassThrough", ["A", "B"]);
      const a = makeExecNode("A", "PassThrough", ["C"], ["Entry"]);
      const b = makeExecNode("B", "PassThrough", ["C"], ["Entry"]);
      const c = makeExecNode("C", "PassThrough", [], ["A", "B"]);
      mockToolLoader([PassThrough]);

      await Executer.executeNodes(
        [entry, a, b, c], "Entry", "../plugins",
        null, null
      );

      expect(c.isExecuted).toBe(true);
    });
  });
});
