import React, { Component } from "react";
import AuthService from "../../../services/auth.service";
import "./register.css";

export default class RegisterComponent extends Component {
  constructor() {
    super();
    this.authService = new AuthService();
    this.state = {
      username: "",
      password: "",
      confirm_password: "",
      error: "",
    };
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { username, password, confirm_password } = this.state;
    if (password !== confirm_password) {
      this.setState({
        error: "The confirmed password is not the same as the password",
      });
      return;
    }
    try {
      await this.authService.register(username, password);
    } catch (err) {
      this.setState({ error: "Register failed" });
    }
  };

  render() {
    return (
      <div className="register-wrapper">
        <div className="login-container">
          <h2>📝 Create Account</h2>
          <form id="registerForm" onSubmit={this.handleSubmit}>
            <input
              type="text"
              id="username"
              className="register-input"
              name="username"
              placeholder="Username"
              onChange={this.handleChange}
              required
            />
            <input
              type="password"
              className="register-input"
              id="password"
              name="password"
              placeholder="Password"
              onChange={this.handleChange}
              required
            />
            <input
              type="password"
              className="register-input"
              id="confirmPassword"
              name="confirm_password"
              placeholder="Confirm Password"
              onChange={this.handleChange}
              required
            />
            <button className="register-button" type="submit">Register</button>
            {this.state.error && <p id="error-message">{this.state.error}</p>}
          </form>
          <p style={{ marginTop: "15px", fontSize: "14px" }}>
            Already have an account?
            <a href="/login" style={{ color: "#00ffcc", textDecoration: "none" }}>
              {" "}Login here
            </a>
          </p>
        </div>
      </div>
    );
  }
}
