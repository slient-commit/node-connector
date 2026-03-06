import React, { Component } from "react";
import "./messagebox.css";

class MessageBox extends Component {
  static defaultProps = {
    message: "Default message",
    type: "info",
    buttons: [],
    onClose: () => {},
  };

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  handleKeyDown = (e) => {
    if (e.key === "Escape") {
      this.props.onClose();
    }
  };

  getIcon() {
    switch (this.props.type) {
      case "warning":
        return <i className="fa-solid fa-triangle-exclamation messagebox-icon warning"></i>;
      case "error":
        return <i className="fa-solid fa-circle-xmark messagebox-icon error"></i>;
      case "success":
        return <i className="fa-solid fa-circle-check messagebox-icon success"></i>;
      default:
        return <i className="fa-solid fa-circle-info messagebox-icon info"></i>;
    }
  }

  render() {
    const { message, type, buttons, onClose } = this.props;

    return (
      <div className="messagebox-overlay" onClick={onClose}>
        <div className={`messagebox ${type}`} onClick={(e) => e.stopPropagation()}>
          <div className="messagebox-body">
            {this.getIcon()}
            <p className="messagebox-text">{message}</p>
          </div>
          <div className="messagebox-actions">
            {buttons.map((button, index) => (
              <button
                className={`messagebox-btn ${button.variant || "default"}`}
                key={index}
                onClick={button.onClick}
              >
                {button.label}
              </button>
            ))}
            {buttons.length === 0 && (
              <button className="messagebox-btn primary" onClick={onClose}>
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default MessageBox;
