// src/services/authService.js
import API from "../utils/api";

class AuthService {
  constructor() {
    this.api = new API();
  }

  async login(username, password) {
    const res = await this.api.post("/auth/login", { username, password });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }
  }

  register(username, password) {
    this.api.post("/auth/register", { username, password }).then((res) => {
      if (res.status !== 500) {
        window.location.href = "/login";
      }
    });
  }

  async logout() {
    try {
      await this.api.post("/auth/logout");
    } catch {
      // Ignore errors — redirect to login regardless
    }
  }

  async isAuthenticated() {
    return this.verify();
  }

  async changePassword(currentPassword, newPassword) {
    const res = await this.api.put("/auth/change-password", { currentPassword, newPassword });
    return res;
  }

  async verify() {
    try {
      const res = await this.api.get("/auth/verify");
      return res.ok;
    } catch {
      return false;
    }
  }
}
export default AuthService;
