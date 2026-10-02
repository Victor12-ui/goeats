const BASE_URL = "http://localhost:5000/api";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const token = localStorage.getItem("goeats_token");
  const storedUser = localStorage.getItem("goeats_user");
  let restaurantId: string | null = null;

  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user.restaurantId) {
        restaurantId = user.restaurantId.toString();
      }
    } catch (e) {
      // ignore
    }
  }

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Inject current restaurant tenant context if available
  if (restaurantId && !headers.has("x-restaurant-id")) {
    headers.set("x-restaurant-id", restaurantId);
  }

  let url = `${BASE_URL}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}
