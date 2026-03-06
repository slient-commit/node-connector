const IfCondition = require("../../plugins/if-condition");

describe("IfCondition Plugin", () => {
  let plugin;

  beforeEach(() => {
    plugin = new IfCondition();
    plugin.log = jest.fn((msg, type) => ({
      type: type || "info",
      name: "If Condition",
      message: msg,
    }));
  });

  test("returns correct metadata", () => {
    expect(plugin.name()).toBe("If Condition");
    expect(plugin.tags()).toEqual(["flow"]);
  });

  test("paramsDefinition returns value, operator, compare_to", () => {
    const params = plugin.paramsDefinition();
    const aliases = params.map((p) => p.alias);
    expect(aliases).toContain("value");
    expect(aliases).toContain("operator");
    expect(aliases).toContain("compare_to");
  });

  describe("equals operator", () => {
    test("passes when values match", async () => {
      const result = await plugin.logic({
        value: "hello",
        operator: "equals",
        compare_to: "hello",
      });
      expect(result.status.error).toBe(false);
      expect(result.output.passed).toBe(true);
    });

    test("fails when values do not match", async () => {
      const result = await plugin.logic({
        value: "hello",
        operator: "equals",
        compare_to: "world",
      });
      expect(result.status.error).toBe(true);
      expect(result.output.passed).toBe(false);
    });
  });

  test("not_equals operator works", async () => {
    const pass = await plugin.logic({
      value: "a",
      operator: "not_equals",
      compare_to: "b",
    });
    expect(pass.output.passed).toBe(true);

    const fail = await plugin.logic({
      value: "a",
      operator: "not_equals",
      compare_to: "a",
    });
    expect(fail.status.error).toBe(true);
  });

  test("contains operator works", async () => {
    const pass = await plugin.logic({
      value: "hello world",
      operator: "contains",
      compare_to: "world",
    });
    expect(pass.output.passed).toBe(true);

    const fail = await plugin.logic({
      value: "hello",
      operator: "contains",
      compare_to: "xyz",
    });
    expect(fail.status.error).toBe(true);
  });

  test("not_contains operator works", async () => {
    const pass = await plugin.logic({
      value: "hello",
      operator: "not_contains",
      compare_to: "xyz",
    });
    expect(pass.output.passed).toBe(true);
  });

  test("greater_than operator works", async () => {
    const pass = await plugin.logic({
      value: "10",
      operator: "greater_than",
      compare_to: "5",
    });
    expect(pass.output.passed).toBe(true);

    const fail = await plugin.logic({
      value: "3",
      operator: "greater_than",
      compare_to: "5",
    });
    expect(fail.status.error).toBe(true);
  });

  test("less_than operator works", async () => {
    const pass = await plugin.logic({
      value: "3",
      operator: "less_than",
      compare_to: "5",
    });
    expect(pass.output.passed).toBe(true);
  });

  test("is_empty operator works", async () => {
    const pass = await plugin.logic({
      value: "  ",
      operator: "is_empty",
      compare_to: "",
    });
    expect(pass.output.passed).toBe(true);

    const fail = await plugin.logic({
      value: "not empty",
      operator: "is_empty",
      compare_to: "",
    });
    expect(fail.status.error).toBe(true);
  });

  test("is_not_empty operator works", async () => {
    const pass = await plugin.logic({
      value: "has content",
      operator: "is_not_empty",
      compare_to: "",
    });
    expect(pass.output.passed).toBe(true);
  });

  test("unknown operator returns error", async () => {
    const result = await plugin.logic({
      value: "a",
      operator: "unknown_op",
      compare_to: "b",
    });
    expect(result.status.error).toBe(true);
    expect(result.status.message).toMatch(/unknown operator/i);
  });

  test("passes input through on success", async () => {
    const result = await plugin.logic({
      value: "a",
      operator: "equals",
      compare_to: "a",
      input: { key: "value" },
    });
    expect(result.output.input).toEqual({ key: "value" });
  });
});
