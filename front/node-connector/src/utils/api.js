class API {
  constructor() {
    this.baseURL = window.__API_BASE_URL__ || "http://localhost:3001";
    this.isRefreshing = false;
    this.failedQueue = [];
    this._config();
  }

  processQueue(error, token = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  _config() {
    // You can't intercept requests like Axios, so we'll create a wrapper method
    this.fetch = async (url, options = {}) => {
      const token = localStorage.getItem("token");

      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      };

      const config = {
        ...options,
        headers,
      };

      let response = await fetch(this.baseURL + url, config);

      // If token expired, handle refresh
      if (response.status === 401) {
        const originalRequest = { url, config, retry: false };

        try {
          const newToken = await this.handleRefreshToken(originalRequest);
          config.headers["Authorization"] = `Bearer ${newToken}`;
          response = await fetch(this.baseURL + url, config);
        } catch (err) {
          console.error("Auth error:", err);
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
          // throw err;
        }
      }

      return response;
    };
  }

  async handleRefreshToken(originalRequest) {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      const res = await fetch(this.baseURL + "/auth/refresh-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) throw new Error("Failed to refresh token");

      const data = await res.json();

      localStorage.setItem("token", data.accessToken);

      this.processQueue(null, data.accessToken);
      this.isRefreshing = false;

      return data.accessToken;
    } catch (err) {
      this.processQueue(err, null);
      this.isRefreshing = false;
      // throw err;
    }
  }

  // Helper methods to mimic axios.get/post/etc.
  get(url, options) {
    return this.fetch(url, {
      ...options,
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json", // Optional depending on API requirements
      },
    });
  }

  post(url, body, options) {
    return this.fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json", // Optional depending on API requirements
      },
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  put(url, body, options) {
    return this.fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json", // Optional depending on API requirements
      },
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  delete(url, options) {
    return this.fetch(url, {
      ...options,
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json", // Optional depending on API requirements
      },
    });
  }

  async sse(url, queries, callback = undefined) {
    let query = "";
    queries.forEach((q) => {
      query += `&${q.name}=${q.value}`;
    });
    // Create EventSource with query parameter for JWT
    const eventSource = new EventSource(
      `${this.baseURL + url}?token=${localStorage.getItem("token")}${query}`
    );

    eventSource.onmessage = function (event) {
      if (callback) callback(event.data);
    };

    eventSource.onerror = function (error) {
      console.error("EventSource failed:", error);
      eventSource.close();
    };
  }

  async fetchSSE(method, url, body, options, callback = undefined) {
    const response = await this.fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json", // Optional depending on API requirements
      },
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
