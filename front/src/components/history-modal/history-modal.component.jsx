import React, { Component } from "react";
import "./history-modal.css";

class HistoryModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      expandedId: null,
    };
  }

  toggleExpand(id) {
    this.setState((prev) => ({
      expandedId: prev.expandedId === id ? null : id,
    }));
  }

  formatDuration(ms) {
    if (ms < 1000) return ms + "ms";
    return (ms / 1000).toFixed(1) + "s";
  }

  formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString();
  }

  render() {
    const { history, onClose, loading } = this.props;
    const { expandedId } = this.state;

    return (
      <div className="history-modal-overlay">
        <div className="history-modal-content">
          <div className="history-modal-header">
            <h2 className="history-modal-title">Execution History</h2>
            <button className="history-modal-close-button" onClick={onClose}>
              &times;
            </button>
          </div>
          <div className="history-modal-body">
            {loading ? (
              <div className="history-modal-empty">Loading...</div>
            ) : history.length > 0 ? (
              history.map((entry) => (
                <div
                  key={entry.id}
                  className="history-entry"
                  onClick={() => this.toggleExpand(entry.id)}
                >
                  <div className="history-entry-row">
                    <span className={`history-badge history-badge-${entry.status}`}>
                      {entry.status}
                    </span>
                    <span className="history-trigger">{entry.trigger_type}</span>
                    <span className="history-date">{this.formatDate(entry.started_at)}</span>
                    <span className="history-duration">{this.formatDuration(entry.duration_ms)}</span>
                    <span className="history-nodes">{entry.node_count} nodes</span>
                  </div>
                  {expandedId === entry.id && entry.results_summary && (
                    <div className="history-details">
                      {entry.results_summary.map((r, i) => (
                        <div key={i} className="history-detail-row">
                          <span className={`history-detail-status ${r.status}`}>
                            {r.status}
                          </span>
                          <span>{r.rootNodeTitle}</span>
                          {r.error && <span className="history-error">{r.error}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="history-modal-empty">No execution history yet</div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default HistoryModal;
