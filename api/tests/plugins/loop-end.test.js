const LoopEnd = require("../../plugins/loop-end");

describe("LoopEnd Plugin", () => {
  let plugin;

  beforeEach(() => {
    plugin = new LoopEnd();
  });

  test("returns correct metadata", () => {
    expect(plugin.name()).toBe("Loop End");
    expect(plugin.tags()).toEqual(["flow"]);
    expect(typeof plugin.description()).toBe("string");
  });

  test("paramsDefinition returns empty array", () => {
    expect(plugin.paramsDefinition()).toEqual([]);
  });

  test("passes through input and adds __isLoopEnd marker", async () => {
    const input = { key: "value", data: 42 };
    const result = await plugin.logic({ input });
    expect(result.status.error).toBe(false);
    expect(result.output.__isLoopEnd).toBe(true);
    expect(result.output.key).toBe("value");
    expect(result.output.data).toBe(42);
  });

  test("handles empty input", async () => {
    const result = await plugin.logic({});
    expect(result.status.error).toBe(false);
    expect(result.output.__isLoopEnd).toBe(true);
  });
});
