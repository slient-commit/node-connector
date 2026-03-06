import React, { Component } from "react";
import AuthService from "../../../services/auth.service";
import "./login.css";

export default class LoginComponent extends Component {
  constructor() {
    super();
    this.authService = new AuthService();
    this.state = {
      username: "",
      password: "",
      error: "",
    };
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { username, password } = this.state;
    try {
      await this.authService.login(username, password);
      window.location.href = "/editor";
    } catch (err) {
      this.setState({ error: err.message || "Login failed" });
    }
  };

  render() {
    return (
      <div className="login-wrapper">
        <div className="login-container">
          <h2>🔐 Node Connector</h2>
          <form id="loginForm" onSubmit={this.handleSubmit}>
            <input
              type="text"
              className="login-input"
              id="username"
              name="username"
              placeholder="Username"
              onChange={this.handleChange}
              required
            />
            <input
              type="password"
              id="password"
              className="login-input"
              placeholder="Password"
              name="password"
              onChange={this.handleChange}
              required
            />
            <button className="login-button" type="submit">
              Login
            </button>
            {this.state.error && <p id="error-message">{this.state.error}</p>}
            <p>
              Don't have an account? <a href="/register">Register</a>
            </p>
          </form>
        </div>
      </div>
    );
  }
}
