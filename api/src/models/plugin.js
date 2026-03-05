class Plugin {
  name() {
    return "Base Plugin";
  }

  description() {
    return "A simple plugin, an empty plugin, only for devs to see a plugin structure";
  }

  icon() {
    return "🌟";
  }

  iconBase64() {
    return null;
  }

  tags() {
    return [];
  }

  paramsDefinition() {
    return [];
  }

  log(message, type = "info") {
    return {
      type: type,
      name: this.name(),
      message: message,
    };
  }

  async logic(params = {}) {
    console.log("This is an empty plugin", params);
    return {
      status: {
        error: false,
        message: "",
      },
      output: {
        example: 0,
      },
    };
  }
}
module.exports = Plugin;
