import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../utils/api";
import {
  Star,
  Heart,
  Search,
  ChevronRight,
  Compass,
  Utensils,
  LogOut,
  Menu as MenuIcon,
  X as XIcon,
  Sparkles,
  SlidersHorizontal,
  User,
  HelpCircle,
  ChevronDown,
  ShoppingBag,
  Bike,
  Store,
  Shield
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { FoodPreferencesModal, FOOD_PREFERENCE_CATEGORIES } from "../components/FoodPreferencesModal";
import { SupportModal } from "../components/SupportModal";

interface PublicRestaurant {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
}

interface AugmentedRestaurant extends PublicRestaurant {
  coverImage: string;
  category: string;
  categories?: Array<{ id: number; name: string }>;
  subcategories?: Array<{ id: number; name: string }>;
  rating: string;
  reviews: string;
  deliveryTime: string;
  deliveryCost: string;
  promoText: string | null;
  specialLabel?: string;
  isPopular: boolean;
  isFavorite: boolean;
}

const categoriesList = [
  { id: "all", name: "Todos", emoji: "🍽️" },
  { id: "super", name: "Súper", emoji: "🍌" },
  { id: "pizza", name: "Pizza", emoji: "🍕" },
  { id: "sushi", name: "Sushi", emoji: "🍣" },
  { id: "poke", name: "Poke", emoji: "🍲" },
  { id: "burgers", name: "Hamburguesas", emoji: "🍔" },
  { id: "alitas", name: "Alitas", emoji: "🍗" },
  { id: "pollo", name: "Pollo", emoji: "🍗" },
  { id: "mexican", name: "Mexicana", emoji: "🌮" },
  { id: "tapioca", name: "Té de tapioca", emoji: "🧋" },
  { id: "healthy", name: "Saludable", emoji: "🥗" },
  { id: "desserts", name: "Postres", emoji: "🍰" },
  { id: "sandwiches", name: "Sándwiches", emoji: "🥪" },
  { id: "bbq", name: "BBQ", emoji: "🍖" },
  { id: "korean", name: "Coreana", emoji: "🍜" },
  { id: "italian", name: "Italiana", emoji: "🍝" },
  { id: "chinese", name: "China", emoji: "🥡" },
  { id: "fastfood", name: "Comida rápida", emoji: "🍟" },
];

export const Aggregator: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [restaurants, setRestaurants] = useState<AugmentedRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SaaS categories dynamic loading
  const [allCategories, setAllCategories] = useState<any[]>([]);

  const getEmoji = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes("rapida") || n.includes("fast") || n.includes("fastfood")) return "🍟";
    if (n.includes("hamburguesa") || n.includes("burger")) return "🍔";
    if (n.includes("pizza")) return "🍕";
    if (n.includes("sushi")) return "🍣";
    if (n.includes("pollo") || n.includes("kfc")) return "🍗";
    if (n.includes("alitas") || n.includes("wing")) return "🍗";
    if (n.includes("mexicana") || n.includes("taco")) return "🌮";
    if (n.includes("postre") || n.includes("dulce") || n.includes("helado") || n.includes("pastel")) return "🍰";
    if (n.includes("saludable") || n.includes("salad") || n.includes("ensalada")) return "🥗";
    if (n.includes("sandwiches") || n.includes("sanduche")) return "🥪";
    if (n.includes("carne") || n.includes("bbq") || n.includes("parrilla")) return "🍖";
    if (n.includes("italiana") || n.includes("pasta") || n.includes("tallarin")) return "🍝";
    if (n.includes("china") || n.includes("arroz")) return "🥡";
    if (n.includes("bebida") || n.includes("jugo") || n.includes("tapioca")) return "🧋";
    return "🍽️";
  };

  const activeCategoriesList = allCategories.length > 0 ? [
    { id: "all", name: "Todos", emoji: "🍽️" },
    ...allCategories.map(cat => ({
      id: `cat-${cat.id}`,
      name: cat.name,
      emoji: getEmoji(cat.name)
    })),
    ...allCategories.flatMap(cat => cat.subcategories || []).map((sub: any) => ({
      id: `sub-${sub.id}`,
      name: sub.name,
      emoji: getEmoji(sub.name)
    }))
  ] : categoriesList;

  // Filter States
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "takeout">("delivery");
  
  // Quick Filter Chips
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [fastDelivery, setFastDelivery] = useState(false);
  const [highRating, setHighRating] = useState(false);
  const [sortBy, setSortBy] = useState<"none" | "rating" | "name">("none");

  // Favorites Local State
  const [favorites, setFavorites] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Food Preferences & Recommendations State
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState<string[]>([]);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // User Profile Dropdown state
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userDropdownOpen]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "CUSTOMER": return "Cliente";
      case "MOTORIZADO": return "Repartidor";
      case "RESTAURANT_OWNER": return "Restaurante";
      case "CAJERO": return "Cajero";
      case "MOZO": return "Mozo";
      case "PRODUCCION": return "Cocina";
      case "SUPER_ADMIN": return "Super Admin";
      default: return role || "Usuario";
    }
  };

  const BRAND_LOGOS: Record<string, string> = {
    "el-artesanal": "/logos/el-artesanal.svg",
    "kfc": "/logos/kfc.svg",
    "burger-king": "/logos/burger-king.svg",
    "pollo-campero": "/logos/pollo-campero.svg",
    "tropiburger": "/logos/tropiburger.svg",
    "papa-johns": "/logos/papa-johns.svg",
    "sushi-tokyo": "/logos/sushi-tokyo.svg",
    "salad-green": "/logos/salad-green.svg",
    "tacos-mx": "/logos/tacos-mx.svg",
    "sweet-bakery": "/logos/sweet-bakery.svg",
    "arroz-relleno": "/logos/arroz-relleno.svg",
    "el-gaucho": "/logos/el-gaucho.svg",
    "el-sabroson": "/logos/el-sabroson.svg",
    "prueba": "/logos/prueba.svg",
    "makushi": "/logos/maku-sushi.svg",
    "maku-sushi": "/logos/maku-sushi.svg",
  };

  const BRAND_COVERS: Record<string, string> = {
    "el-artesanal": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80",
    "kfc": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80",
    "burger-king": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80",
    "pollo-campero": "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&auto=format&fit=crop&q=80",
    "tropiburger": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80",
    "papa-johns": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80",
    "sushi-tokyo": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=80",
    "salad-green": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
    "tacos-mx": "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop&q=80",
    "sweet-bakery": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
    "arroz-relleno": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80",
    "el-gaucho": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
    "el-sabroson": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80",
    "prueba": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
    "makushi": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=80",
    "maku-sushi": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=80",
  };

  const getAugmentedRestaurants = (dbList: PublicRestaurant[]): AugmentedRestaurant[] => {
    const defaultCovers = [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=600&auto=format&fit=crop&q=80",
    ];

    const categories = ["Pizza", "Sushi", "Hamburguesas", "Alitas", "Pollo", "Mexicana", "Saludable", "Postres"];

    const augmentedDb = dbList.map((rest: any, index) => {
      const finalLogo = BRAND_LOGOS[rest.slug] || rest.logo || "/logos/prueba.svg";
      const finalCover = BRAND_COVERS[rest.slug] || rest.coverImage || defaultCovers[index % defaultCovers.length];

      return {
        ...rest,
        logo: finalLogo,
        coverImage: finalCover,
        category: rest.categories?.[0]?.name || categories[index % categories.length],
        categories: rest.categories || [],
        subcategories: rest.subcategories || [],
        rating: (4.5 + (index * 0.08) % 0.4).toFixed(1),
        reviews: `(${500 + (index * 680) % 8000}+)`,
        deliveryTime: `${15 + (index * 4) % 18} min`,
        deliveryCost: index % 2 === 0 ? "Envío gratis" : "Costo de envío: $1.25",
        promoText: index % 3 === 0 ? "$5.00 de descuento en tu compra" : null,
        isPopular: index % 2 === 0,
        isFavorite: index % 3 === 0
      };
    });

    return augmentedDb;
  };

  useEffect(() => {
    async function loadRestaurants() {
      try {
        const catRes = await apiRequest("/saas-categories");
        if (catRes.success) {
          setAllCategories(catRes.categories || []);
        }

        const res = await apiRequest("/restaurants/public/list");
        const list = res.restaurants || [];
        setRestaurants(getAugmentedRestaurants(list));
      } catch (err: any) {
        setError(err.message || "Error al cargar restaurantes");
      } finally {
        setLoading(false);
      }
    }
    loadRestaurants();
  }, []);

  // Sync Food Preferences from user profile, localStorage, or setup query parameter
  useEffect(() => {
    if (user && (user as any).preferences && Array.isArray((user as any).preferences)) {
      setUserPreferences((user as any).preferences);
    } else {
      try {
        const stored = localStorage.getItem("goeats_food_preferences");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setUserPreferences(parsed);
        }
      } catch (e) {}
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("setup_preferences") === "true") {
      setPreferencesModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const matchesCategory = (rest: AugmentedRestaurant, selectedId: string) => {
    if (selectedId === "all") return true;
    if (selectedId.startsWith("cat-")) {
      const catId = parseInt(selectedId.replace("cat-", ""), 10);
      return rest.categories?.some((c: any) => c.id === catId);
    }
    if (selectedId.startsWith("sub-")) {
      const subId = parseInt(selectedId.replace("sub-", ""), 10);
      return rest.subcategories?.some((s: any) => s.id === subId);
    }
    
    // For fallback static category list compatibility
    const catObj = categoriesList.find(c => c.id === selectedId);
    if (!catObj) return true;
    const catName = catObj.name.toLowerCase();
    return rest.category?.toLowerCase().includes(catName) || 
           rest.categories?.some((c: any) => c.name.toLowerCase().includes(catName)) ||
           rest.subcategories?.some((s: any) => s.name.toLowerCase().includes(catName));
  };

  // Filter & Sort Logic
  const filteredRestaurants = restaurants.filter(rest => {
    if (!matchesCategory(rest, activeCategory)) return false;

    if (searchQuery.trim() && 
        !rest.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !rest.category.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (onlyOffers && !rest.promoText) return false;

    if (fastDelivery) {
      const mins = parseInt(rest.deliveryTime, 10);
      if (isNaN(mins) || mins > 20) return false;
    }

    if (highRating) {
      const ratingVal = parseFloat(rest.rating);
      if (isNaN(ratingVal) || ratingVal < 4.5) return false;
    }

    return true;
  });

  if (sortBy === "rating") {
    filteredRestaurants.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
  } else if (sortBy === "name") {
    filteredRestaurants.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Subdivided categories for UI Sections
  const popularRestaurants = filteredRestaurants.filter(r => r.isPopular || parseFloat(r.rating) >= 4.6);
  const offerRestaurants = filteredRestaurants.filter(r => r.promoText !== null);

  // Smart Recommendations based on culinary preferences
  const recommendedRestaurants = filteredRestaurants.filter(rest => {
    if (userPreferences.length === 0) return false;
    return userPreferences.some(prefId => matchesCategory(rest, prefId));
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", paddingBottom: "60px" }}>
      
      {/* Stick Header Navigation style UberEats */}
      <nav className="aggregator-navbar" style={{
        position: "sticky",
        top: 0,
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        zIndex: 1000,
        padding: "15px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "25px", flex: 1 }} className="aggregator-left-wrapper">
          <h1 style={{
            fontSize: "24px",
            fontWeight: "800",
            color: "#ff4757",
            letterSpacing: "-0.5px",
            margin: 0,
            cursor: "pointer"
          }} onClick={() => navigate("/")}>
            Go<span style={{ color: "#2f3542" }}>Eats</span>
          </h1>

          {/* Delivery/Takeout Selector Button Block */}
          <div className="mobile-hide" style={{
            display: "flex",
            backgroundColor: "#f1f3f4",
            padding: "3px",
            borderRadius: "30px",
            gap: "2px"
          }}>
            <button
              onClick={() => setDeliveryMode("delivery")}
              style={{
                padding: "8px 18px",
                borderRadius: "30px",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: deliveryMode === "delivery" ? "#ffffff" : "transparent",
                color: deliveryMode === "delivery" ? "#000000" : "#5f6368",
                cursor: "pointer",
                boxShadow: deliveryMode === "delivery" ? "0 2px 5px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s ease"
              }}
            >
              Entrega
            </button>
            <button
              onClick={() => setDeliveryMode("takeout")}
              style={{
                padding: "8px 18px",
                borderRadius: "30px",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: deliveryMode === "takeout" ? "#ffffff" : "transparent",
                color: deliveryMode === "takeout" ? "#000000" : "#5f6368",
                cursor: "pointer",
                boxShadow: deliveryMode === "takeout" ? "0 2px 5px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s ease"
              }}
            >
              Para llevar
            </button>
          </div>

          {/* Search bar inside header */}
          <div className="aggregator-search-bar" style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#f1f3f4",
            padding: "8px 15px",
            borderRadius: "30px",
            width: "350px",
            position: "relative"
          }}>
            <Search size={16} style={{ color: "#5f6368", marginRight: "10px" }} />
            <input
              type="text"
              placeholder="Buscar comida, restaurante o antojo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                fontSize: "13px",
                color: "#202124",
                border: "none",
                backgroundColor: "transparent",
                outline: "none"
              }}
            />
          </div>
        </div>

        <div className="mobile-hide" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link
            to="/plus"
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: user?.isPlus ? "#b45309" : "#d97706",
              padding: "8px 16px",
              borderRadius: "30px",
              backgroundColor: user?.isPlus ? "#fef3c7" : "rgba(251, 191, 36, 0.08)",
              border: "1px solid #fbbf24",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            <Sparkles size={14} color="#d97706" />
            {user?.isPlus ? "Miembro Plus ⭐" : "Hazte Plus ✨"}
          </Link>

          {isAuthenticated && user ? (
            <div ref={dropdownRef} style={{ position: "relative" }}>
              {/* User Profile Pill Trigger */}
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "5px 14px 5px 6px",
                  borderRadius: "30px",
                  backgroundColor: userDropdownOpen ? "#f8fafc" : "#ffffff",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #ff4757 0%, #ff6b81 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "700",
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(255, 71, 87, 0.25)"
                  }}
                >
                  {getInitials(user.name)}
                </div>

                <div style={{ textAlign: "left", lineHeight: 1.25 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#0f172a",
                      maxWidth: "130px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {user.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    {getRoleLabel(user.role)}
                  </div>
                </div>

                <ChevronDown
                  size={14}
                  color="#64748b"
                  style={{
                    transform: userDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease"
                  }}
                />
              </button>

              {/* User Dropdown Menu Card */}
              {userDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "260px",
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.12)",
                    zIndex: 1000,
                    overflow: "hidden",
                  }}
                >
                  {/* User Profile Header */}
                  <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #ff4757 0%, #ff6b81 100%)",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                          fontWeight: "700",
                          flexShrink: 0
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div style={{ overflow: "hidden" }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {user.name}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {user.email || user.username}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "600",
                          backgroundColor: "#eff6ff",
                          color: "#2563eb",
                          border: "1px solid #bfdbfe"
                        }}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                      {user.isPlus && (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "600",
                            backgroundColor: "#fef3c7",
                            color: "#b45309",
                            border: "1px solid #fde68a"
                          }}
                        >
                          Socio Plus ⭐
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  <div style={{ padding: "8px" }}>
                    {user.role === "CUSTOMER" && (
                      <>
                        <Link
                          to="/customer/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#1e293b",
                            textDecoration: "none",
                            transition: "background 0.15s ease"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <ShoppingBag size={16} color="#ff4757" />
                          <span>Mis Pedidos</span>
                        </Link>

                        <Link
                          to="/customer/dashboard?tab=profile"
                          onClick={() => setUserDropdownOpen(false)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#1e293b",
                            textDecoration: "none",
                            transition: "background 0.15s ease"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <User size={16} color="#64748b" />
                          <span>Mi Perfil</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            setPreferencesModalOpen(true);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#1e293b",
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "background 0.15s ease"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Sparkles size={16} color="#d97706" />
                            <span>Mis Preferencias</span>
                          </div>
                          {userPreferences.length > 0 && (
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                backgroundColor: "#fef3c7",
                                color: "#b45309",
                                padding: "2px 8px",
                                borderRadius: "10px"
                              }}
                            >
                              {userPreferences.length}
                            </span>
                          )}
                        </button>
                      </>
                    )}

                    {user.role === "MOTORIZADO" && (
                      <Link
                        to="/delivery"
                        onClick={() => setUserDropdownOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#1e293b",
                          textDecoration: "none",
                          transition: "background 0.15s ease"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <Bike size={16} color="#10b981" />
                        <span>Panel de Repartos</span>
                      </Link>
                    )}

                    {(user.role === "RESTAURANT_OWNER" || user.role === "CAJERO" || user.role === "MOZO" || user.role === "PRODUCCION") && (
                      <Link
                        to="/pos"
                        onClick={() => setUserDropdownOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#1e293b",
                          textDecoration: "none",
                          transition: "background 0.15s ease"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <Store size={16} color="#f59e0b" />
                        <span>Sistema POS</span>
                      </Link>
                    )}

                    {user.role === "SUPER_ADMIN" && (
                      <Link
                        to="/admin/restaurants"
                        onClick={() => setUserDropdownOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#1e293b",
                          textDecoration: "none",
                          transition: "background 0.15s ease"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <Shield size={16} color="#8b5cf6" />
                        <span>Panel Super Admin</span>
                      </Link>
                    )}

                    <div style={{ height: "1px", backgroundColor: "#f1f5f9", margin: "6px 0" }} />

                    {/* Centro de Ayuda */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setSupportModalOpen(true);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#1e293b",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.15s ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <HelpCircle size={16} color="#3b82f6" />
                      <span>Ayuda y Soporte</span>
                    </button>

                    <div style={{ height: "1px", backgroundColor: "#f1f5f9", margin: "6px 0" }} />

                    {/* Cerrar Sesion */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#ef4444",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.15s ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <LogOut size={16} color="#ef4444" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => setSupportModalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "30px",
                  backgroundColor: "transparent",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  transition: "all 0.2s ease"
                }}
                title="Centro de Ayuda & Soporte"
              >
                <HelpCircle size={14} />
                Ayuda
              </button>

              <Link to="/login" style={{
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: "#000000",
                color: "#ffffff",
                padding: "8px 20px",
                borderRadius: "30px",
                textDecoration: "none",
                transition: "all 0.2s ease"
              }}>
                Iniciar Sesión
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="mobile-show aggregator-navbar-toggle-btn"
          style={{
            cursor: "pointer",
            color: "var(--text-primary)",
            padding: "8px",
            background: "none",
            border: "none"
          }}
        >
          {menuOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
        </button>

        {/* Mobile Drawer Dropdown */}
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "#ffffff",
              borderBottom: "1px solid #e2e8f0",
              padding: "20px 30px",
              zIndex: 999,
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              boxShadow: "0 8px 16px rgba(0,0,0,0.05)"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                to="/plus"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#d97706",
                  padding: "12px 16px",
                  borderRadius: "30px",
                  backgroundColor: "rgba(251, 191, 36, 0.08)",
                  border: "1px solid #fbbf24",
                  textDecoration: "none"
                }}
              >
                Hazte Plus ✨
              </Link>

              <button
                onClick={() => { setMenuOpen(false); setPreferencesModalOpen(true); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#ff4757",
                  padding: "12px 16px",
                  borderRadius: "30px",
                  backgroundColor: "rgba(255, 71, 87, 0.08)",
                  border: "1px solid rgba(255, 71, 87, 0.2)",
                  cursor: "pointer"
                }}
              >
                <Sparkles size={15} />
                {userPreferences.length > 0 ? `Mis Preferencias (${userPreferences.length})` : "Configurar Preferencias"}
              </button>

              {isAuthenticated && user ? (
                <>
                  {user.role === "CUSTOMER" && (
                    <>
                      <Link
                        to="/customer/dashboard"
                        onClick={() => setMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "10px",
                          fontSize: "14px",
                          fontWeight: 600,
                          padding: "12px 16px",
                          borderRadius: "30px",
                          color: "#ff4757",
                          backgroundColor: "rgba(255, 71, 87, 0.05)",
                          border: "1px solid rgba(255, 71, 87, 0.15)",
                          textDecoration: "none"
                        }}
                      >
                        Mis Pedidos 🍔
                      </Link>

                      <Link
                        to="/customer/dashboard?tab=profile"
                        onClick={() => setMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "10px",
                          fontSize: "14px",
                          fontWeight: 600,
                          padding: "12px 16px",
                          borderRadius: "30px",
                          color: "#1e293b",
                          backgroundColor: "#f8fafc",
                          border: "1px solid #cbd5e1",
                          textDecoration: "none"
                        }}
                      >
                        <User size={16} color="#ff4757" />
                        Mi Perfil e Información
                      </Link>
                    </>
                  )}

                  {user.role === "MOTORIZADO" && (
                    <Link
                      to="/delivery"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        fontSize: "14px",
                        fontWeight: 600,
                        padding: "12px 16px",
                        borderRadius: "30px",
                        color: "#ff4757",
                        backgroundColor: "rgba(255, 71, 87, 0.05)",
                        border: "1px solid rgba(255, 71, 87, 0.15)",
                        textDecoration: "none"
                      }}
                    >
                      Entregas 🛵
                    </Link>
                  )}

                  {(user.role === "RESTAURANT_OWNER" || user.role === "CAJERO" || user.role === "MOZO" || user.role === "PRODUCCION") && (
                    <Link
                      to="/pos"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        fontSize: "14px",
                        fontWeight: 600,
                        padding: "12px 16px",
                        borderRadius: "30px",
                        color: "#ff4757",
                        backgroundColor: "rgba(255, 71, 87, 0.05)",
                        border: "1px solid rgba(255, 71, 87, 0.15)",
                        textDecoration: "none"
                      }}
                    >
                      Ir al POS 🖥️
                    </Link>
                  )}

                  {user.role === "SUPER_ADMIN" && (
                    <Link
                      to="/admin/restaurants"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        fontSize: "14px",
                        fontWeight: 600,
                        padding: "12px 16px",
                        borderRadius: "30px",
                        color: "#ff4757",
                        backgroundColor: "rgba(255, 71, 87, 0.05)",
                        border: "1px solid rgba(255, 71, 87, 0.15)",
                        textDecoration: "none"
                      }}
                    >
                      Panel Admin 🛡️
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "600",
                    backgroundColor: "#000000",
                    color: "#ffffff",
                    padding: "12px 16px",
                    borderRadius: "30px",
                    textDecoration: "none",
                    textAlign: "center"
                  }}
                >
                  Iniciar Sesión
                </Link>
              )}

              <button
                onClick={() => { setMenuOpen(false); setSupportModalOpen(true); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#3b82f6",
                  padding: "12px 16px",
                  borderRadius: "30px",
                  backgroundColor: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  cursor: "pointer"
                }}
              >
                <HelpCircle size={16} />
                Centro de Ayuda & Soporte
              </button>
            </div>


            {isAuthenticated && user && (
              <div style={{
                borderTop: "1px solid #e2e8f0",
                paddingTop: "15px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>{user.name}</div>
                  <div style={{ fontSize: "11px", color: "#5f6368" }}>{user.role}</div>
                </div>
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 16px",
                    borderRadius: "30px",
                    backgroundColor: "rgba(255, 71, 87, 0.1)",
                    border: "1px solid rgba(255, 71, 87, 0.2)",
                    color: "#ff4757",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600
                  }}
                >
                  <LogOut size={14} style={{ marginRight: "4px" }} />
                  Salir
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Main Aggregator Body */}
      <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 20px" }}>

        {/* Categories Bar Horizontal Slider */}
        <div className="no-scrollbar" style={{
          display: "flex",
          gap: "15px",
          overflowX: "auto",
          padding: "20px 0 15px 0",
          margin: "10px 0",
          scrollBehavior: "smooth"
        }}>
          {activeCategoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                flexShrink: 0,
                cursor: "pointer",
                background: "none",
                border: "none",
                transition: "transform 0.15s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <div style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: activeCategory === cat.id ? "#ffeef0" : "#f1f3f4",
                border: activeCategory === cat.id ? "2px solid #ff4757" : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                transition: "all 0.2s ease"
              }}>
                {cat.emoji}
              </div>
              <span style={{
                fontSize: "11px",
                fontWeight: activeCategory === cat.id ? "700" : "500",
                color: activeCategory === cat.id ? "#ff4757" : "#202124"
              }}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Pills / Chips Container */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "25px" }}>
          <button
            onClick={() => setOnlyOffers(prev => !prev)}
            style={{
              padding: "8px 16px",
              borderRadius: "30px",
              fontSize: "12px",
              fontWeight: "600",
              border: "1px solid #cbd5e1",
              backgroundColor: onlyOffers ? "#ff4757" : "#ffffff",
              color: onlyOffers ? "#ffffff" : "#202124",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Ofertas
          </button>
          
          <button
            onClick={() => setFastDelivery(prev => !prev)}
            style={{
              padding: "8px 16px",
              borderRadius: "30px",
              fontSize: "12px",
              fontWeight: "600",
              border: "1px solid #cbd5e1",
              backgroundColor: fastDelivery ? "#ff4757" : "#ffffff",
              color: fastDelivery ? "#ffffff" : "#202124",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Menos de 20 min
          </button>

          <button
            onClick={() => setHighRating(prev => !prev)}
            style={{
              padding: "8px 16px",
              borderRadius: "30px",
              fontSize: "12px",
              fontWeight: "600",
              border: "1px solid #cbd5e1",
              backgroundColor: highRating ? "#ff4757" : "#ffffff",
              color: highRating ? "#ffffff" : "#202124",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Calificación 4.5+ ★
          </button>

          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            style={{
              padding: "8px 16px",
              borderRadius: "30px",
              fontSize: "12px",
              fontWeight: "600",
              border: "1px solid #cbd5e1",
              backgroundColor: sortBy !== "none" ? "#ff4757" : "#ffffff",
              color: sortBy !== "none" ? "#ffffff" : "#202124",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="none" style={{ color: "#000" }}>Ordenar por</option>
            <option value="rating" style={{ color: "#000" }}>Mejor Calificación</option>
            <option value="name" style={{ color: "#000" }}>Nombre (A-Z)</option>
          </select>
        </div>

        {/* Double Promo Banners Grid */}
        {activeCategory === "all" && !searchQuery && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "40px"
          }}>
            {/* Promo Banner 1: Green */}
            <div style={{
              background: "linear-gradient(135deg, #10ac84 0%, #1dd1a1 100%)",
              borderRadius: "20px",
              padding: "35px 30px",
              color: "#ffffff",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "210px"
            }}>
              <div style={{ zIndex: 2 }}>
                <h2 style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: "800", color: "#ffffff", lineHeight: "1.2", margin: "0 0 10px 0" }}>
                  Contraataca los antojos con ofertas ganadoras
                </h2>
                <p style={{ fontSize: "14px", opacity: 0.9, margin: 0, maxWidth: "280px" }}>
                  Disfruta hoy de hasta 40% de descuento en locales seleccionados.
                </p>
              </div>
              <button
                onClick={() => setOnlyOffers(true)}
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#ffffff",
                  color: "#10ac84",
                  fontSize: "13px",
                  fontWeight: "700",
                  padding: "10px 20px",
                  borderRadius: "30px",
                  cursor: "pointer",
                  marginTop: "15px",
                  zIndex: 2,
                  border: "none",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                Disfruta ahora
              </button>
              {/* Mock visual element */}
              <div style={{
                position: "absolute",
                right: "-20px",
                bottom: "-30px",
                fontSize: "140px",
                opacity: 0.15,
                pointerEvents: "none"
              }}>
                🍔
              </div>
            </div>

            {/* Promo Banner 2: Dark / Sunset Orange */}
            <div style={{
              background: "linear-gradient(135deg, #2f3542 0%, #ff7f50 100%)",
              borderRadius: "20px",
              padding: "35px 30px",
              color: "#ffffff",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "210px"
            }}>
              <div style={{ zIndex: 2 }}>
                <h2 style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: "800", color: "#ffffff", lineHeight: "1.2", margin: "0 0 10px 0" }}>
                  Hazte Plus ✨
                </h2>
                <p style={{ fontSize: "14px", opacity: 0.9, margin: 0, maxWidth: "280px" }}>
                  Disfruta de envíos gratis ilimitados y beneficios exclusivos en tus pedidos.
                </p>
              </div>
              <button
                onClick={() => navigate("/plus")}
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#ffffff",
                  color: "#2f3542",
                  fontSize: "13px",
                  fontWeight: "700",
                  padding: "10px 20px",
                  borderRadius: "30px",
                  cursor: "pointer",
                  marginTop: "15px",
                  zIndex: 2,
                  border: "none",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                Únete ahora
              </button>
              {/* Mock visual element */}
              <div style={{
                position: "absolute",
                right: "-20px",
                bottom: "-30px",
                fontSize: "140px",
                opacity: 0.15,
                pointerEvents: "none"
              }}>
                🛵
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "30px", marginTop: "20px" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="skeleton" style={{ width: "100%", height: "180px", borderRadius: "16px" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div className="skeleton" style={{ width: "60%", height: "20px" }} />
                  <div className="skeleton" style={{ width: "15%", height: "20px" }} />
                </div>
                <div className="skeleton" style={{ width: "40%", height: "14px" }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#ff4757", border: "1px solid #cbd5e1", borderRadius: "12px", marginTop: "20px" }}>
            <p>Error de conexión: {error}</p>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div style={{ padding: "60px 40px", textAlign: "center", color: "#5f6368", border: "1px dashed #cbd5e1", borderRadius: "16px", marginTop: "20px" }}>
            <Compass size={40} style={{ color: "#cbd5e1", marginBottom: "15px" }} />
            <h3 style={{ fontSize: "16px", color: "#202124", margin: "0 0 5px 0" }}>No se encontraron restaurantes</h3>
            <p style={{ fontSize: "13px", margin: 0 }}>Intenta removiendo filtros o buscando un término diferente.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "50px" }}>
            
            {/* SECTION 0: Recomendados para ti (Sistema de Preferencias Gastronómicas) */}
            {activeCategory === "all" && !searchQuery && (
              userPreferences.length > 0 && recommendedRestaurants.length > 0 ? (
                <div style={{
                  backgroundColor: "rgba(255, 71, 87, 0.02)",
                  borderRadius: "24px",
                  padding: "24px 20px",
                  border: "1px solid rgba(255, 71, 87, 0.12)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#ff4757",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "4px"
                      }}>
                        <Sparkles size={14} /> Recomendaciones Personalizadas
                      </div>
                      <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#202124", margin: 0 }}>
                        Recomendados para ti según tus gustos
                      </h2>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                        {userPreferences.map((prefId) => {
                          const cat = FOOD_PREFERENCE_CATEGORIES.find(c => c.id === prefId);
                          if (!cat) return null;
                          return (
                            <span key={prefId} style={{
                              fontSize: "12px",
                              backgroundColor: "#ffffff",
                              border: "1px solid #ffd1d6",
                              color: "#d63031",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontWeight: 600
                            }}>
                              {cat.emoji} {cat.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => setPreferencesModalOpen(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "#ff4757",
                        fontWeight: "700",
                        cursor: "pointer",
                        background: "#ffffff",
                        border: "1px solid rgba(255, 71, 87, 0.3)",
                        borderRadius: "20px",
                        padding: "6px 14px",
                        boxShadow: "0 2px 5px rgba(255, 71, 87, 0.08)",
                      }}
                    >
                      <SlidersHorizontal size={13} />
                      Cambiar gustos
                    </button>
                  </div>

                  <div className="no-scrollbar" style={{
                    display: "flex",
                    gap: "20px",
                    overflowX: "auto",
                    paddingBottom: "10px",
                    scrollBehavior: "smooth"
                  }}>
                    {recommendedRestaurants.map((rest) => (
                      <Link
                        to={`/r/${rest.slug}`}
                        key={`rec-${rest.id}`}
                        style={{
                          width: "300px",
                          flexShrink: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          position: "relative",
                          textDecoration: "none"
                        }}
                      >
                        <div style={{
                          position: "relative",
                          width: "100%",
                          height: "165px",
                          borderRadius: "16px",
                          overflow: "hidden",
                          backgroundColor: "#f1f3f4"
                        }}>
                          <img
                            src={rest.coverImage}
                            alt={rest.name}
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80";
                            }}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          
                          <div style={{
                            position: "absolute",
                            top: "12px",
                            left: "12px",
                            backgroundColor: "rgba(15, 23, 42, 0.85)",
                            backdropFilter: "blur(4px)",
                            color: "#ffffff",
                            padding: "4px 9px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            <Sparkles size={11} color="#fbbf24" /> Recomendado
                          </div>

                          <button
                            onClick={(e) => toggleFavorite(rest.id, e)}
                            style={{
                              position: "absolute",
                              top: "12px",
                              right: "12px",
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              backgroundColor: "rgba(255, 255, 255, 0.9)",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              color: favorites.includes(rest.id) ? "#ff4757" : "#5f6368"
                            }}
                          >
                            <Heart size={16} fill={favorites.includes(rest.id) ? "#ff4757" : "none"} />
                          </button>
                        </div>

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#202124", margin: 0 }}>
                              {rest.name}
                            </h3>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: "12px",
                              fontWeight: "700",
                              backgroundColor: "#f1f3f4",
                              padding: "2px 6px",
                              borderRadius: "6px"
                            }}>
                              <Star size={12} fill="#ff4757" color="#ff4757" />
                              <span>{rest.rating}</span>
                            </div>
                          </div>
                          <p style={{ fontSize: "12px", color: "#5f6368", margin: "4px 0 0 0" }}>
                            {rest.category} • {rest.deliveryTime} • {rest.deliveryCost}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : userPreferences.length === 0 ? (
                /* Recommendation Teaser Banner */
                <div style={{
                  background: "linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%)",
                  borderRadius: "20px",
                  padding: "24px 28px",
                  border: "1px solid #ffd1d6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                  flexWrap: "wrap",
                }}>
                  <div style={{ maxWidth: "560px" }}>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#e84118",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "6px",
                    }}>
                      <Sparkles size={14} /> Recomendaciones a tu medida
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#2f3640", margin: "0 0 6px 0" }}>
                      ¿Qué se te antoja comer hoy?
                    </h3>
                    <p style={{ fontSize: "13px", color: "#718093", margin: 0, lineHeight: "1.4" }}>
                      Elige tus categorías y comidas preferidas (hamburguesas, pizza, sushi, tacos...) y te recomendaremos los mejores platos y locales destacados.
                    </p>
                  </div>

                  <button
                    onClick={() => setPreferencesModalOpen(true)}
                    style={{
                      background: "linear-gradient(135deg, #ff4757, #ff6b81)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "30px",
                      padding: "12px 22px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(255, 71, 87, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexShrink: 0,
                    }}
                  >
                    <SlidersHorizontal size={15} />
                    Personalizar mis preferencias
                  </button>
                </div>
              ) : null
            )}

            {/* SECTION 1: Favoritos Nacionales (Carousel) */}
            {activeCategory === "all" && !searchQuery && popularRestaurants.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#202124", margin: 0 }}>
                    Favoritos nacionales
                  </h2>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <span style={{ fontSize: "12px", color: "#5f6368", fontWeight: "600", cursor: "pointer" }}>Ver todos</span>
                    <ChevronRight size={16} style={{ color: "#5f6368" }} />
                  </div>
                </div>

                <div className="no-scrollbar" style={{
                  display: "flex",
                  gap: "20px",
                  overflowX: "auto",
                  paddingBottom: "10px",
                  scrollBehavior: "smooth"
                }}>
                  {popularRestaurants.map((rest) => (
                    <Link
                      to={`/r/${rest.slug}`}
                      key={`fav-${rest.id}`}
                      style={{
                        width: "320px",
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        position: "relative"
                      }}
                    >
                      {/* Cover Image Container */}
                      <div style={{
                        position: "relative",
                        width: "100%",
                        height: "170px",
                        borderRadius: "16px",
                        overflow: "hidden",
                        backgroundColor: "#f1f3f4"
                      }}>
                        <img
                          src={rest.coverImage}
                          alt={rest.name}
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80";
                          }}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        
                        {/* Red Promo overlay badge */}
                        {rest.promoText && (
                          <div style={{
                            position: "absolute",
                            top: "15px",
                            left: "0px",
                            backgroundColor: "#ff4757",
                            color: "#ffffff",
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: "700",
                            borderTopRightRadius: "4px",
                            borderBottomRightRadius: "4px",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                          }}>
                            {rest.promoText}
                          </div>
                        )}

                        {/* Heart Button */}
                        <button
                          onClick={(e) => toggleFavorite(rest.id, e)}
                          style={{
                            position: "absolute",
                            top: "15px",
                            right: "15px",
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "none",
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                            transition: "transform 0.15s ease"
                          }}
                        >
                          <Heart
                            size={16}
                            fill={favorites.includes(rest.id) || rest.isFavorite ? "#ff4757" : "none"}
                            color={favorites.includes(rest.id) || rest.isFavorite ? "#ff4757" : "#5f6368"}
                          />
                        </button>
                      </div>

                      {/* Content block */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                            {rest.logo && (
                              <img
                                src={rest.logo}
                                alt={rest.name}
                                onError={(e) => {
                                  e.currentTarget.src = "/logos/prueba.svg";
                                }}
                                style={{
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "6px",
                                  objectFit: "contain",
                                  backgroundColor: "#ffffff",
                                  padding: "2px",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                                  flexShrink: 0
                                }}
                              />
                            )}
                            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#202124", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {rest.name}
                            </h3>
                          </div>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                            backgroundColor: "#f1f3f4",
                            padding: "3px 6px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "700",
                            flexShrink: 0,
                            marginLeft: "8px"
                          }}>
                            <Star size={12} fill="#000000" color="#000000" />
                            <span>{rest.rating}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "5px", fontSize: "12px", color: "#5f6368", marginTop: "3px", alignItems: "center" }}>
                          <span>{rest.reviews}</span>
                          <span>•</span>
                          <span>{rest.deliveryTime}</span>
                          {rest.specialLabel && (
                            <>
                              <span>•</span>
                              <span style={{ color: "#ff4757", fontWeight: "700" }}>{rest.specialLabel}</span>
                            </>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "#80868b", marginTop: "2px" }}>
                          {rest.deliveryCost}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 2: Las ofertas más populares (Carousel) */}
            {activeCategory === "all" && !searchQuery && offerRestaurants.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#202124", margin: 0 }}>
                    Las ofertas más populares
                  </h2>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <span style={{ fontSize: "12px", color: "#5f6368", fontWeight: "600", cursor: "pointer" }}>Ver todos</span>
                    <ChevronRight size={16} style={{ color: "#5f6368" }} />
                  </div>
                </div>

                <div className="no-scrollbar" style={{
                  display: "flex",
                  gap: "20px",
                  overflowX: "auto",
                  paddingBottom: "10px",
                  scrollBehavior: "smooth"
                }}>
                  {offerRestaurants.map((rest) => (
                    <Link
                      to={`/r/${rest.slug}`}
                      key={`offer-${rest.id}`}
                      style={{
                        width: "320px",
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        position: "relative"
                      }}
                    >
                      {/* Cover Image */}
                      <div style={{
                        position: "relative",
                        width: "100%",
                        height: "170px",
                        borderRadius: "16px",
                        overflow: "hidden",
                        backgroundColor: "#f1f3f4"
                      }}>
                        <img
                          src={rest.coverImage}
                          alt={rest.name}
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80";
                          }}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        
                        {/* Red Promo overlay badge */}
                        <div style={{
                          position: "absolute",
                          top: "15px",
                          left: "0px",
                          backgroundColor: "#ff4757",
                          color: "#ffffff",
                          padding: "4px 10px",
                          fontSize: "11px",
                          fontWeight: "700",
                          borderTopRightRadius: "4px",
                          borderBottomRightRadius: "4px",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                        }}>
                          {rest.promoText}
                        </div>

                        {/* Heart Button */}
                        <button
                          onClick={(e) => toggleFavorite(rest.id, e)}
                          style={{
                            position: "absolute",
                            top: "15px",
                            right: "15px",
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "none",
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                            transition: "transform 0.15s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
                          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                          <Heart
                            size={16}
                            fill={favorites.includes(rest.id) || rest.isFavorite ? "#ff4757" : "none"}
                            color={favorites.includes(rest.id) || rest.isFavorite ? "#ff4757" : "#5f6368"}
                          />
                        </button>
                      </div>

                      {/* Content block */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                            {rest.logo && (
                              <img
                                src={rest.logo}
                                alt={rest.name}
                                onError={(e) => {
                                  e.currentTarget.src = "/logos/prueba.svg";
                                }}
                                style={{
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "6px",
                                  objectFit: "contain",
                                  backgroundColor: "#ffffff",
                                  padding: "2px",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                                  flexShrink: 0
                                }}
                              />
                            )}
                            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#202124", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {rest.name}
                            </h3>
                          </div>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                            backgroundColor: "#f1f3f4",
                            padding: "3px 6px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "700",
                            flexShrink: 0,
                            marginLeft: "8px"
                          }}>
                            <Star size={12} fill="#000000" color="#000000" />
                            <span>{rest.rating}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "5px", fontSize: "12px", color: "#5f6368", marginTop: "3px", alignItems: "center" }}>
                          <span>{rest.reviews}</span>
                          <span>•</span>
                          <span>{rest.deliveryTime}</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#80868b", marginTop: "2px" }}>
                          {rest.deliveryCost}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: Grid General de Opciones */}
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#202124", marginBottom: "18px" }}>
                {activeCategory === "all" && !searchQuery ? "Todos los restaurantes" : "Resultados de búsqueda"}
              </h2>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                gap: "30px"
              }}>
                {filteredRestaurants.map((rest) => (
                  <Link
                    to={`/r/${rest.slug}`}
                    key={`grid-${rest.id}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      position: "relative"
                    }}
                  >
                    {/* Cover image card */}
                    <div style={{
                      position: "relative",
                      width: "100%",
                      height: "190px",
                      borderRadius: "16px",
                      overflow: "hidden",
                      backgroundColor: "#f1f3f4"
                    }}>
                      <img
                        src={rest.coverImage}
                        alt={rest.name}
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80";
                        }}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      
                      {/* Red Promo overlay badge */}
                      {rest.promoText && (
                        <div style={{
                          position: "absolute",
                          top: "15px",
                          left: "0px",
                          backgroundColor: "#ff4757",
                          color: "#ffffff",
                          padding: "4px 12px",
                          fontSize: "11px",
                          fontWeight: "700",
                          borderTopRightRadius: "4px",
                          borderBottomRightRadius: "4px",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                        }}>
                          {rest.promoText}
                        </div>
                      )}

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => toggleFavorite(rest.id, e)}
                        style={{
                          position: "absolute",
                          top: "15px",
                          right: "15px",
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
                        }}
                      >
                        <Heart
                          size={16}
                          fill={favorites.includes(rest.id) || rest.isFavorite ? "#ff4757" : "none"}
                          color={favorites.includes(rest.id) || rest.isFavorite ? "#ff4757" : "#5f6368"}
                        />
                      </button>
                    </div>

                    {/* Meta info card */}
                    <div style={{ display: "flex", gap: "15px", alignItems: "flex-start" }}>
                      {/* Official Brand Logo */}
                      {rest.logo ? (
                        <div style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "10px",
                          overflow: "hidden",
                          backgroundColor: "#ffffff",
                          flexShrink: 0,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          border: "1px solid #edf2f7",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <img
                            src={rest.logo}
                            alt={rest.name}
                            onError={(e) => {
                              e.currentTarget.src = "/logos/prueba.svg";
                            }}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "10px",
                          backgroundColor: "#f1f3f4",
                          flexShrink: 0,
                          border: "1px solid #cbd5e1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                          fontWeight: "bold",
                          color: "#ff4757"
                        }}>
                          {rest.name[0].toUpperCase()}
                        </div>
                      )}

                      {/* Details block */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#202124", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {rest.name}
                          </h3>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                            backgroundColor: "#f1f3f4",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "700",
                            flexShrink: 0,
                            marginLeft: "8px"
                          }}>
                            <Star size={12} fill="#000000" color="#000000" />
                            <span>{rest.rating}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "5px", fontSize: "13px", color: "#5f6368", marginTop: "3px", alignItems: "center" }}>
                          <span>{rest.category}</span>
                          <span>•</span>
                          <span>{rest.deliveryTime}</span>
                          <span>•</span>
                          <span>{rest.reviews}</span>
                        </div>

                        <div style={{ fontSize: "12px", color: "#80868b", marginTop: "3px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{rest.deliveryCost}</span>
                          {rest.specialLabel && (
                            <>
                              <span>•</span>
                              <span style={{
                                backgroundColor: "#ffeef0",
                                color: "#ff4757",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: "600",
                                fontSize: "10px"
                              }}>{rest.specialLabel}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Styled Footer */}
      <footer style={{
        marginTop: "100px",
        borderTop: "1px solid #e2e8f0",
        padding: "40px 20px",
        textAlign: "center",
        backgroundColor: "#f8f9fa"
      }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginBottom: "15px" }}>
          <Utensils size={24} color="#ff4757" />
          <strong style={{ fontSize: "18px", color: "#202124" }}>GoEats Marketplace</strong>
        </div>
        <p style={{ color: "#5f6368", fontSize: "13px", margin: "0 0 10px 0" }}>
          &copy; {new Date().getFullYear()} GoEats SaaS Platform. Todos los derechos reservados.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", fontSize: "13px" }}>
          <Link to="/auth" style={{ color: "#ff4757", fontWeight: "600", textDecoration: "underline" }}>
            Inscribir Establecimiento
          </Link>
          <span style={{ color: "#cbd5e1" }}>|</span>
          <Link to="/login" style={{ color: "#5f6368", textDecoration: "underline" }}>
            Panel de Control POS
          </Link>
          <span style={{ color: "#cbd5e1" }}>|</span>
          <button
            onClick={() => setSupportModalOpen(true)}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              fontWeight: "600",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: "13px",
              padding: 0
            }}
          >
            Centro de Ayuda & Soporte
          </button>
        </div>
      </footer>

      {/* Culinary Preferences Modal */}
      <FoodPreferencesModal
        isOpen={preferencesModalOpen}
        onClose={() => setPreferencesModalOpen(false)}
        onPreferencesUpdated={(newPrefs) => setUserPreferences(newPrefs)}
      />

      {/* Support & Help Center Modal */}
      <SupportModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        defaultRole={
          user?.role === "MOTORIZADO" 
            ? "MOTORIZADO" 
            : (user?.role === "RESTAURANT_OWNER" || user?.role === "CAJERO" || user?.role === "MOZO" || user?.role === "PRODUCCION")
              ? "RESTAURANT" 
              : "CUSTOMER"
        }
      />
    </div>
  );
};
