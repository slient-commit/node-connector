import React, { Component } from "react";
import "./messagebox.css";

class MessageBox extends Component {
  static defaultProps = {
    message: "Default message",
    type: "info",
    buttons: [{ label: "OK", onClick: () => {} }],
    onClose: () => {},
  };

  render() {
    const { message, type, buttons, onClose } = this.props;

    return (
      <div className={`message-box ${type}`}>
        <div className="message-content">
          <p>{message}</p>
          <div className="message-actions">
            {buttons.map((button, index) => (
              <button className="messagebox-button" key={index} onClick={button.onClick}>
                {button.label}
              </button>
            ))}
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }
}

export default MessageBox;
