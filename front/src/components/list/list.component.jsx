import React, { Component } from "react";
import "./list.css";
import DataService from "./../../services/data.service";

const CRON_OPTIONS = [
  { label: "Every 15 seconds", value: "*/15 * * * * *" },
  { label: "Every 30 seconds", value: "*/30 * * * * *" },
  { label: "Every 1 minute", value: "* * * * *" },
  { label: "Every 3 minutes", value: "*/3 * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every 45 minutes", value: "*/45 * * * *" },
  { label: "Every 1 hour", value: "0 * * * *" },
  { label: "Daily at 6:00 AM", value: "0 6 * * *" },
  { label: "Daily at 9:00 AM", value: "0 9 * * *" },
  { label: "Daily at 12:00 PM", value: "0 12 * * *" },
  { label: "Daily at 3:00 PM", value: "0 15 * * *" },
  { label: "Daily at 6:00 PM", value: "0 18 * * *" },
];

export default class ListComponent extends Component {
  constructor() {
    super();
    this.api = new DataService();
    this.state = {
      sheets: [],
      createName: "",
      createError: "",
      showCreateModal: false,
      showSettingsModal: false,
      settingsSheet: null,
      settingsName: "",
      settingsTriggerType: "cron",
      settingsCronSchedule: "0 * * * *",
      settingsIsActive: 1,
    };
  }

  componentDidMount() {
    this.loadSheets();
  }

  loadSheets() {
    this.api
      .getSheetsList()
      .then((res) => res.json())
      .then((sheets) => this.setState({ sheets }));
  }

  // --- Create modal ---
  openCreateModal = () => {
    this.setState({ showCreateModal: true, createName: "", createError: "" });
  };

  closeCreateModal = () => {
    this.setState({ showCreateModal: false });
  };

  handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await this.api.createNewSheet(this.state.createName);
      const sheet = await res.json();
      if (!sheet) {
        this.setState({ createError: "Error while creating the new sheet" });
      } else {
        this.closeCreateModal();
        this.loadSheets();
      }
    } catch (err) {
      this.setState({ createError: "Error while creating the new sheet" });
    }
  };

  // --- Settings modal ---
  openSettingsModal = (sheet) => {
    this.setState({
      showSettingsModal: true,
      settingsSheet: sheet,
      settingsName: sheet.name,
      settingsTriggerType: sheet.trigger_type || "cron",
      settingsCronSchedule: sheet.cron_schedule || "0 * * * *",
      settingsIsActive: sheet.is_active,
    });
  };

  closeSettingsModal = () => {
    this.setState({ showSettingsModal: false, settingsSheet: null });
  };

  handleSettingsSave = async () => {
    const { settingsSheet, settingsName, settingsTriggerType, settingsCronSchedule, settingsIsActive } = this.state;
    await this.api.updateSheetSettings(settingsSheet.uid, {
      name: settingsName,
      trigger_type: settingsTriggerType,
      cron_schedule: settingsCronSchedule,
      is_active: settingsIsActive,
    });
    this.closeSettingsModal();
    this.loadSheets();
  };

  getCronLabel(value) {
    const opt = CRON_OPTIONS.find((o) => o.value === value);
    return opt ? opt.label : value;
  }

  getSheetSummary(sheet) {
    if (sheet.trigger_type === "webhook") return "Webhook";
    if (sheet.trigger_type === "terminal") return "Terminal";
    return this.getCronLabel(sheet.cron_schedule || "0 * * * *");
  }

  render() {
    const {
      sheets,
      showCreateModal, createName, createError,
      showSettingsModal, settingsName, settingsTriggerType, settingsCronSchedule, settingsIsActive,
    } = this.state;

    return (
      <div className="list-container">
        <div className="list-header">
          <h1>My Sheets</h1>
          <button className="create-btn" onClick={this.openCreateModal}>
            + Create New
          </button>
        </div>

        <div className="sheet-cards">
          {sheets.map((sheet) => (
            <div
              key={sheet.uid}
              className={`sheet-card ${sheet.is_active ? "" : "inactive"}`}
            >
              <div className="sheet-card-header">
                <a href={`/editor?id=${sheet.uid}`} className="sheet-name">
                  {sheet.name}
                </a>
                <div className="sheet-card-actions">
                  <span
                    className={`status-badge ${sheet.is_active ? "active" : "inactive"}`}
                  >
                    {sheet.is_active ? "Active" : "Inactive"}
                  </span>
                  <button
                    className="settings-btn"
                    onClick={() => this.openSettingsModal(sheet)}
                    title="Settings"
                  >
                    &#9881;
                  </button>
                </div>
              </div>
              <div className="sheet-card-summary">
                {this.getSheetSummary(sheet)}
              </div>
            </div>
          ))}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="modal" style={{ display: "flex" }}>
            <div className="modal-content">
              <span className="close" onClick={this.closeCreateModal}>&times;</span>
              <h2>Create New Sheet</h2>
              <form onSubmit={this.handleCreateSubmit}>
                <label htmlFor="createName">Sheet Name:</label>
                <input
                  type="text"
                  id="createName"
                  value={createName}
                  onChange={(e) => this.setState({ createName: e.target.value })}
                  placeholder="Enter sheet name..."
                  required
                />
                {createError && <p className="error-message">{createError}</p>}
                <button type="submit" className="submit-btn">Create</button>
              </form>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="modal" style={{ display: "flex" }}>
            <div className="modal-content settings-modal">
              <span className="close" onClick={this.closeSettingsModal}>&times;</span>
              <h2>Sheet Settings</h2>

              <div className="settings-form">
                <div className="settings-field">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={settingsName}
                    onChange={(e) => this.setState({ settingsName: e.target.value })}
                  />
                </div>

                <div className="settings-field">
                  <label>Status:</label>
                  <select
                    value={settingsIsActive}
                    onChange={(e) => this.setState({ settingsIsActive: parseInt(e.target.value) })}
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label>Trigger:</label>
                  <select
                    value={settingsTriggerType}
                    onChange={(e) => this.setState({ settingsTriggerType: e.target.value })}
                  >
                    <option value="cron">Cron (Scheduled)</option>
                    <option value="webhook">Webhook</option>
                    <option value="terminal">Terminal (Manual)</option>
                  </select>
                </div>

                {settingsTriggerType === "cron" && (
                  <div className="settings-field">
                    <label>Schedule:</label>
                    <select
                      value={settingsCronSchedule}
                      onChange={(e) => this.setState({ settingsCronSchedule: e.target.value })}
                    >
                      {CRON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {settingsTriggerType === "webhook" && (
                  <div className="webhook-url">
                    POST /sheet/webhook/{this.state.settingsSheet?.uid}
                  </div>
                )}

                {settingsTriggerType === "terminal" && (
                  <div className="terminal-cmd">
                    <label>Docker exec:</label>
                    <code>docker exec node-connector node api/cli.js {this.state.settingsSheet?.uid}</code>
                    <label>Or with curl:</label>
                    <code>curl -X POST http://localhost/api/sheet/execute-batch -H "Content-Type: application/json" -H "X-Internal-Key: change_me_internal_key" -d "{'{'}\"sheetUid\":\"{this.state.settingsSheet?.uid}\"{'}'}"</code>
                  </div>
                )}

                <button className="submit-btn" onClick={this.handleSettingsSave}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
