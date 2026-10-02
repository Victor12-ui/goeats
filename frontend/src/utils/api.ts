const envApiUrl = (import.meta as any).env?.VITE_API_URL;
const hostname = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
const BASE_URL = envApiUrl ? envApiUrl.replace(/\/$/, "") : `http://${hostname}:5000/api`;

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

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  } catch (err: any) {
    // If backend is not reached (e.g. running on Vercel without cloud DB yet)
    if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError") || err.name === "TypeError")) {
      console.warn(`[API Resilient Fallback] Backend unreachable at ${url}. Providing seamless offline preview data for ${endpoint}`);

      // Marketplace fallback
      if (endpoint === "/restaurants/public/list") {
        return {
          success: true,
          restaurants: [
            { id: 1, name: "Burger King Express", slug: "burger-king", address: "Av. Amazonas y Colón", phone: "0991234567", logo: "/logos/burger-king.svg", coverImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800", isActive: true },
            { id: 2, name: "KFC Coronel", slug: "kfc", address: "Mall del Sol, Local 12", phone: "0992345678", logo: "/logos/kfc.svg", coverImage: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800", isActive: true },
            { id: 3, name: "El Artesanal Burger", slug: "el-artesanal", address: "Calle Larga y Borrero", phone: "0993456789", logo: "/logos/el-artesanal.svg", coverImage: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800", isActive: true },
            { id: 4, name: "Papa John's Pizza", slug: "papa-johns", address: "Av. 12 de Octubre", phone: "0994567890", logo: "/logos/papa-johns.svg", coverImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800", isActive: true },
            { id: 5, name: "Maku Sushi Bar", slug: "maku-sushi", address: "Plaza Mayor, Local 4", phone: "0995678901", logo: "/logos/maku-sushi.svg", coverImage: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800", isActive: true }
          ]
        };
      }

      if (endpoint === "/saas-categories") {
        return {
          success: true,
          categories: [
            { id: 1, name: "Hamburguesas" },
            { id: 2, name: "Pizza" },
            { id: 3, name: "Pollo" },
            { id: 4, name: "Sushi" },
            { id: 5, name: "Postres" },
            { id: 6, name: "Bebidas" }
          ]
        };
      }

      // Customer Auth fallback
      if (endpoint.startsWith("/auth/register-customer") || endpoint.startsWith("/auth/social-login") || endpoint.startsWith("/auth/login")) {
        let reqBody: any = {};
        try {
          reqBody = typeof options.body === "string" ? JSON.parse(options.body) : {};
        } catch (e) {}

        const username = reqBody.username || (reqBody.email ? reqBody.email.split("@")[0] : "usuario");
        const name = reqBody.name || username;
        return {
          success: true,
          token: "jwt-preview-token-" + Date.now(),
          user: {
            id: 999,
            username,
            name,
            email: reqBody.email || `${username}@gmail.com`,
            role: "CUSTOMER",
            cedula: reqBody.cedula || "1700000000",
            walletBalance: 0,
            isPlus: false,
          }
        };
      }

      if (endpoint.startsWith("/auth/complete-profile")) {
        return { success: true, message: "Perfil guardado con éxito" };
      }
    }
    throw err;
  }
}
