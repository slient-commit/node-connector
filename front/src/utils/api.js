class API {
  constructor() {
    this.baseURL = window.__API_BASE_URL__ || "http://localhost:3001";
    this.isRefreshing = false;
    this.failedQueue = [];
    this._config();
  }

  processQueue(error) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve();
      }
    });

    this.failedQueue = [];
  }

  _getCsrfToken() {
    const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
    return match ? match[1] : "";
  }

  _config() {
    this.fetch = async (url, options = {}) => {
      const headers = {
        "Content-Type": "application/json",
        "X-CSRF-Token": this._getCsrfToken(),
        ...options.headers,
      };

      const config = {
        ...options,
        headers,
        credentials: "include",
      };

      let response = await fetch(this.baseURL + url, config);

      // If token expired (401) or CSRF token expired/mismatch (403), try refresh
      // Skip for auth endpoints to avoid loops
      if ((response.status === 401 || response.status === 403) && !url.startsWith("/auth/")) {
        try {
          await this.handleRefreshToken();
          // Re-read CSRF token after refresh (server sets a new one)
          config.headers["X-CSRF-Token"] = this._getCsrfToken();
          response = await fetch(this.baseURL + url, config);
        } catch (err) {
          console.error("Auth error:", err);
          window.location.href = "/login";
        }
      }

      return response;
    };
  }

  async handleRefreshToken() {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const res = await fetch(this.baseURL + "/auth/refresh-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to refresh token");

      this.processQueue(null);
      this.isRefreshing = false;
    } catch (err) {
      this.processQueue(err);
      this.isRefreshing = false;
      throw err;
    }
  }

  // Helper methods
  get(url, options) {
    return this.fetch(url, { ...options, method: "GET" });
  }

  post(url, body, options) {
    return this.fetch(url, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  put(url, body, options) {
    return this.fetch(url, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  delete(url, options) {
    return this.fetch(url, { ...options, method: "DELETE" });
  }

  sse(url, queries, callback = undefined) {
    let query = "";
    queries.forEach((q) => {
      query += `&${q.name}=${q.value}`;
    });
    // Cookies are sent automatically with same-origin EventSource
    const eventSource = new EventSource(
      `${this.baseURL + url}?${query.substring(1)}`
    );

    eventSource.onmessage = function (event) {
      if (callback) callback(event.data);
    };

    eventSource.onerror = function (error) {
      console.error("EventSource failed:", error);
      eventSource.close();
    };

    return eventSource;
  }

  async fetchSSE(method, url, body, options, callback = undefined) {
    const response = await this.fetch(url, {
      ...options,
      method: method,
      body: JSON.stringify(body),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const message = decoder.decode(value);
      if (callback) callback(message);
    }
  }
}

export default API;
