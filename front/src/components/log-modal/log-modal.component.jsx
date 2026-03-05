import React, { Component } from "react";
import "./log-modal.css";

class LogModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
    };
  }

  render() {
    const { logs, onClose } = this.props;

    return (
      <div className="log-modal-overlay">
        <div className="log-modal-content">
          <div className="log-modal-header">
            <h2 className="log-modal-title">Logs</h2>
            <button className="log-modal-close-button" onClick={onClose}>
              &times;
            </button>
          </div>
          <div className="log-modal-log-container">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="log-modal-log-entry">
                  {log}
                </div>
              ))
            ) : (
              <div className="log-modal-no-logs">No logs available</div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
export default LogModal;
