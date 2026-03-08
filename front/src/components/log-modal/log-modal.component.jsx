import React, { Component, createRef } from "react";
import "./log-modal.css";

class LogModal extends Component {
  constructor(props) {
    super(props);
    this.logContainerRef = createRef();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.logs.length !== this.props.logs.length) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    const container = this.logContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  render() {
    const { logs, isRunning, onStop, onClose } = this.props;

    return (
      <div className="log-modal-overlay">
        <div className="log-modal-content">
          <div className="log-modal-header">
            <h2 className="log-modal-title">Logs</h2>
            <div className="log-modal-header-actions">
              {isRunning && (
                <button className="log-modal-stop-button" onClick={onStop}>
                  <i className="fa-solid fa-stop"></i> Stop
                </button>
              )}
              <button className="log-modal-close-button" onClick={onClose}>
                &times;
              </button>
            </div>
          </div>
          <div className="log-modal-log-container" ref={this.logContainerRef}>
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
