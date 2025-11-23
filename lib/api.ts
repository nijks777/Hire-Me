// Use Next.js API routes for authentication
const API_URL = "/api";

interface ApiRequestOptions {
  method?: string;
  body?: any;
  requiresAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { method = "GET", body, requiresAuth = false } = options;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add authorization header if required
    if (requiresAuth) {
      const token = localStorage.getItem("access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      // Handle token refresh if needed
      if (response.status === 401 && requiresAuth) {
        // TODO: Implement token refresh logic
        // For now, just redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ access_token: string; refresh_token?: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  }

  async signup(name: string, email: string, password: string) {
    return this.request<{ access_token: string; refresh_token?: string }>("/auth/signup", {
      method: "POST",
      body: { name, email, password },
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ access_token: string }>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    });
  }

  async getCurrentUser() {
    return this.request<{ id: string; email: string; name: string }>("/auth/me", {
      requiresAuth: true,
    });
  }

  async logout() {
    return this.request("/auth/logout", {
      method: "POST",
      requiresAuth: true,
    });
  }
}

export const apiClient = new ApiClient(API_URL);
