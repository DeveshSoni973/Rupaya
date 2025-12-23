const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

class ApiClient {
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

        const headers = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("token");
                window.location.href = "/login?expired=true";
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Something went wrong");
        }

        return response.json();
    }

    get<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: "GET" });
    }

    post<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, {
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    patch<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, {
            method: "PATCH",
            body: JSON.stringify(body),
        });
    }

    delete<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: "DELETE" });
    }

    // Specific for OAuth2 form data login
    async login(formData: URLSearchParams) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Login failed");
        }

        return response.json();
    }
}

export const api = new ApiClient();
