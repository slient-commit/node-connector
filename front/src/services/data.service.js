// src/services/dataService.js
import API from "../utils/api";

export default class DataService {
  constructor() {
    this.api = new API();
  }

  async getPluginsList() {
    return await this.api.get("/sheet/plugins/list");
  }

  async getSheetsList() {
    return await this.api.get("/sheet/list");
  }

  async getSheet(id) {
    return await this.api.get("/sheet/get?id=" + id);
  }

  async getSheetHistory(uid) {
    return await this.api.get("/sheet/history/" + uid);
  }

  async createNewSheet(name) {
    return await this.api.post("/sheet/create", { name });
  }

  async cloneSheet(uid) {
    return await this.api.post("/sheet/clone", { uid });
  }

  async deleteSheet(uid) {
    return await this.api.delete("/sheet/delete", { body: JSON.stringify({ uid }) });
  }

  async createNewNode(sheetId, title, pluginId, position, params) {
    return await this.api.post("/sheet/node", {
      sheetId,
      title,
      pluginId,
      position,
      params,
    });
  }

  async executeNode(sheetId, node, callback = undefined, inputParams = null) {
    const queries = [
      { name: "sheetId", value: sheetId },
      { name: "nodeId", value: node.id },
    ];
    if (inputParams) {
      queries.push({ name: "inputParams", value: encodeURIComponent(JSON.stringify(inputParams)) });
    }
    return await this.api.sse("/sheet/node/execute", queries, callback);
  }

  async updateNewNode(sheetId, node) {
    return await this.api.put("/sheet/node", { sheetId, node });
  }

  async updateSheet(sheet) {
    return await this.api.put("/sheet/update", { sheet });
  }

  async updateSheetSettings(uid, settings) {
    return await this.api.put("/sheet/settings", { uid, ...settings });
  }

  async deleteNode(sheetId, node) {
    return await this.api.put("/sheet/node/delete", { sheetId, node });
  }

  getData() {
    this.api.get("/data");
  }

  updateData(id, payload) {
    this.api.put(`/data/${id}`, payload);
  }
}
