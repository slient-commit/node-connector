// src/services/authService.js
import API from "../utils/api";

class AuthService {
  constructor() {
    this.api = new API();
  }

  async login(username, password) {
    await this.api
      .post("/auth/login", { username, password })
      .then((res) => res.json())
      .then((data) => {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
      });
  }

  register(username, password) {
    this.api.post("/auth/register", { username, password }).then((res) => {
      if (res.status !== 500) {
        window.location.href = "/login";
      }
    });
  }

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  }

  isAuthenticated() {
    const token = localStorage.getItem("token");
    if (!token) return false;
    return !this.isJwtExpired(token);
  }

  isJwtExpired(token) {
    try {
      // Decode the token payload (base64url)
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));

      // Check if the token has an expiration time
      if (!decoded || !decoded.exp) {
        throw new Error("Token does not have an expiration time (exp claim).");
      }

      // Get the current time in seconds
      const currentTime = Math.floor(Date.now() / 1000);

      // Compare the expiration time with the current time
      if (decoded.exp < currentTime) {
        return true; // Token is expired
      }

      return false; // Token is still valid
    } catch (error) {
      console.error("Error decoding token:", error.message);
      return true; // Assume token is invalid/expired if there's an error
    }
  }
}
export default AuthService;
