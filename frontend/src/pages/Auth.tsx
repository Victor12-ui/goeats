import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";
import { LogIn, UserPlus, Shield, Store, Mail, Lock, User as UserIcon, Link, ShoppingBag, Truck, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { SocialAuthModal } from "../components/SocialAuthModal";
import { OnboardingProfileModal } from "../components/OnboardingProfileModal";

declare global {
  interface Window {
    google?: any;
  }
}

export const Auth: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<"customer" | "driver" | "restaurant" | "superadmin" | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [regType, setRegType] = useState<"owner" | "customer" | "driver">("owner");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Social Auth & Onboarding states
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [socialProvider, setSocialProvider] = useState<"google" | "apple" | "facebook" | null>(null);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [profileData, setProfileData] = useState<{
    name: string;
    firstName: string;
    lastName: string;
    email: string;
  }>({ name: "", firstName: "", lastName: "", email: "" });

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");
  const [cedula, setCedula] = useState("");

  const handleSlugChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(cleaned);
  };

  const handleBack = () => {
    setSelectedRole(null);
    setError(null);
    setUsername("");
    setPassword("");
    setName("");
    setEmail("");
    setRestaurantName("");
    setSlug("");
    setCedula("");
  };

  const handleSocialSuccess = async (data: {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;
    provider: string;
  }) => {
    setProfileData({
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
    });
    setSocialModalOpen(false);

    let loggedUser: any = null;
    let token = "token-" + Date.now();
    try {
      const res = await apiRequest("/auth/social-login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (res?.user) {
        loggedUser = res.user;
        token = res.token || token;
      }
    } catch (e) {
      // Handled by resilient fallback
    }

    if (!loggedUser) {
      loggedUser = {
        id: Date.now(),
        username: data.email.split("@")[0] || "comensal",
        name: data.name,
        email: data.email,
        role: "CUSTOMER",
        avatar: data.avatar,
        walletBalance: 0,
        isPlus: false,
      };
    }

    login(token, loggedUser);
    setOnboardingModalOpen(true);
  };

  // Google Identity Services (GIS) automatic prompt
  useEffect(() => {
    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            try {
              const base64Url = response.credential.split(".")[1];
              const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split("")
                  .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                  .join("")
              );
              const payload = JSON.parse(jsonPayload);
              const firstName = payload.given_name || payload.name?.split(" ")[0] || "Usuario";
              const lastName = payload.family_name || payload.name?.split(" ").slice(1).join(" ") || "";

              handleSocialSuccess({
                name: payload.name || `${firstName} ${lastName}`.trim(),
                firstName,
                lastName,
                email: payload.email,
                avatar: payload.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                provider: "google",
              });
            } catch (err) {
              console.error("Error decodificando token de Google:", err);
            }
          },
        });

        if (selectedRole === "customer") {
          window.google.accounts.id.prompt();
        }
      } catch (err) {
        console.warn("Google GIS init error:", err);
      }
    }
  }, [selectedRole]);

  const handleGoogleClick = () => {
    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setSocialProvider("google");
      setSocialModalOpen(true);
    }
  };

  const handleOnboardingSave = async (data: {
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: string;
  }) => {
    setOnboardingModalOpen(false);
    try {
      await apiRequest("/auth/complete-profile", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (e) {}

    const storedUser = localStorage.getItem("goeats_user");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        u.name = `${data.firstName} ${data.lastName}`.trim();
        u.birthDate = data.birthDate;
        u.gender = data.gender;
        localStorage.setItem("goeats_user", JSON.stringify(u));
      } catch (err) {}
    }
    navigate("/");
  };

  const handleOnboardingSkip = () => {
    setOnboardingModalOpen(false);
    navigate("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });
        login(res.token, res.user);
        if (res.user.role === "SUPER_ADMIN") {
          navigate("/admin/restaurants");
        } else if (res.user.role === "PRODUCCION") {
          navigate("/kitchen");
        } else if (res.user.role === "MOTORIZADO") {
          navigate("/delivery");
        } else if (res.user.role === "CUSTOMER") {
          navigate("/");
        } else if (res.user.role === "RESTAURANT_OWNER") {
          navigate("/reports");
        } else {
          navigate("/pos");
        }
      } else {
        let endpoint = "/auth/register-owner";
        let payload: any = { username, password, name, email };

        if (regType === "owner") {
          payload.restaurantName = restaurantName;
          payload.slug = slug;
        } else if (regType === "customer") {
          endpoint = "/auth/register-customer";
          payload.cedula = cedula;
        } else if (regType === "driver") {
          endpoint = "/auth/register-driver";
          payload.cedula = cedula;
        }

        const res = await apiRequest(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (regType === "customer") {
          const parts = (name || "").trim().split(" ");
          const firstName = parts[0] || name || "";
          const lastName = parts.slice(1).join(" ") || "";
          setProfileData({
            name: name || username,
            firstName,
            lastName,
            email: email || `${username}@gmail.com`,
          });
          login(res?.token || ("token-" + Date.now()), res?.user || {
            id: Date.now(),
            username,
            name: name || username,
            email: email || `${username}@gmail.com`,
            role: "CUSTOMER",
            cedula,
            walletBalance: 0,
            isPlus: false,
          });
          setError(null);
          setOnboardingModalOpen(true);
          return;
        }
        
        setIsLogin(true);
        setError(null);
        alert(
          regType === "owner"
            ? "Restaurante registrado con éxito. Ahora puedes iniciar sesión."
            : "Conductor registrado con éxito. Ahora puedes iniciar sesión."
        );
      }
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container animate-fade-in" style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "20px",
      background: "linear-gradient(135deg, var(--bg-primary) 0%, #e2e8f0 100%)"
    }}>
      {selectedRole === null ? (
        <div style={{ width: "100%", maxWidth: "900px", textAlign: "center" }} className="animate-fade-in">
          <h1 style={{
            fontSize: "42px",
            fontWeight: "800",
            background: "var(--accent-gradient)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "10px",
            fontFamily: "var(--font-title)"
          }}>
            GoEats
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "16px", marginBottom: "40px" }}>
            Selecciona tu perfil de ingreso para comenzar
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "25px",
            marginBottom: "30px"
          }}>
            {/* CARD 1: CLIENTE */}
            <div
              onClick={() => {
                setSelectedRole("customer");
                setIsLogin(true);
                setRegType("customer");
              }}
              style={{
                backgroundColor: "#ffffff",
                padding: "40px 30px",
                borderRadius: "var(--radius-lg)",
                cursor: "pointer",
                textAlign: "center",
                transition: "all var(--transition-fast)",
                border: "1px solid var(--border-light)",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "15px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                e.currentTarget.style.borderColor = "#ff4757";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                e.currentTarget.style.borderColor = "var(--border-light)";
              }}
            >
              <div style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 71, 87, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ff4757"
              }}>
                <ShoppingBag size={28} />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                Cliente Comensal
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.4" }}>
                Pide comida a domicilio, agenda retiros en local o pide desde tu mesa con códigos QR.
              </p>
            </div>

            {/* CARD 2: REPARTIDOR */}
            <div
              onClick={() => {
                setSelectedRole("driver");
                setIsLogin(true);
                setRegType("driver");
              }}
              style={{
                backgroundColor: "#ffffff",
                padding: "40px 30px",
                borderRadius: "var(--radius-lg)",
                cursor: "pointer",
                textAlign: "center",
                transition: "all var(--transition-fast)",
                border: "1px solid var(--border-light)",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "15px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                e.currentTarget.style.borderColor = "#2ed573";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                e.currentTarget.style.borderColor = "var(--border-light)";
              }}
            >
              <div style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: "rgba(46, 213, 115, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2ed573"
              }}>
                <Truck size={28} />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                Motorizado / Repartidor
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.4" }}>
                Entrega pedidos a domicilio, recarga tu saldo de billetera y gestiona tus ganancias.
              </p>
            </div>

            {/* CARD 3: RESTAURANTE */}
            <div
              onClick={() => {
                setSelectedRole("restaurant");
                setIsLogin(true);
                setRegType("owner");
              }}
              style={{
                backgroundColor: "#ffffff",
                padding: "40px 30px",
                borderRadius: "var(--radius-lg)",
                cursor: "pointer",
                textAlign: "center",
                transition: "all var(--transition-fast)",
                border: "1px solid var(--border-light)",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "15px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                e.currentTarget.style.borderColor = "#fbbf24";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                e.currentTarget.style.borderColor = "var(--border-light)";
              }}
            >
              <div style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: "rgba(251, 191, 36, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fbbf24"
              }}>
                <Store size={28} />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                Restaurante (Interno)
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.4" }}>
                Ingreso para Dueños de Restaurante, Cajeros, Cocineros y personal de Meseros.
              </p>
            </div>

          </div>
          
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "10px 20px",
              borderRadius: "30px",
              backgroundColor: "transparent",
              border: "1px solid var(--border-light)",
              color: "var(--text-secondary)",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Volver a la Página Principal
          </button>
        </div>
      ) : (
        <div className="glass-card animate-fade-in mobile-p-md mobile-full-width" style={{
          width: "100%",
          maxWidth: "480px",
          padding: "40px",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "#ffffff",
          boxShadow: "var(--shadow-lg)"
        }}>
          {/* Header & Back Button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <button
              onClick={handleBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                fontSize: "13px"
              }}
            >
              <ArrowLeft size={16} />
              Volver
            </button>
            <span style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1px",
              backgroundColor: "var(--bg-tertiary)",
              padding: "4px 10px",
              borderRadius: "12px",
              color: selectedRole === "customer" ? "#ff4757" : selectedRole === "driver" ? "#2ed573" : selectedRole === "superadmin" ? "#8b5cf6" : "#fbbf24"
            }}>
              {selectedRole === "customer" ? "Comensal" : selectedRole === "driver" ? "Motorizado" : selectedRole === "superadmin" ? "SuperAdmin" : "Restaurante"}
            </span>
          </div>

          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <h2 style={{ fontSize: "24px", color: "var(--text-primary)", fontWeight: "800", margin: "0 0 5px 0" }}>
              {isLogin ? "Iniciar Sesión" : selectedRole === "restaurant" ? "Registrar Restaurante" : selectedRole === "driver" ? "Registrar Conductor" : "Crear Cuenta"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
              {selectedRole === "restaurant" && isLogin
                ? "Dueños, Cajeros, Cocina y Meseros"
                : selectedRole === "superadmin"
                ? "Administrador Global de la Plataforma"
                : selectedRole === "customer" && !isLogin
                ? "Regístrate al instante con tu cuenta de Google, Apple o Facebook"
                : "Ingresa tus credenciales para continuar"}
            </p>
          </div>

          {/* Tab Selector (only for Customer/Driver OR Restaurant (as owner register)) */}
          {selectedRole !== "superadmin" && (
            <div style={{
              display: "flex",
              background: "var(--bg-tertiary)",
              borderRadius: "var(--radius-md)",
              padding: "4px",
              marginBottom: "25px",
              border: "1px solid var(--border-light)"
            }}>
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(null); }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor: isLogin ? "#ffffff" : "transparent",
                  color: isLogin ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: isLogin ? "var(--shadow-sm)" : "none",
                  transition: "all var(--transition-fast)"
                }}
              >
                <LogIn size={15} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                  if (selectedRole === "customer") setRegType("customer");
                  else if (selectedRole === "driver") setRegType("driver");
                  else setRegType("owner");
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor: !isLogin ? "#ffffff" : "transparent",
                  color: !isLogin ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: !isLogin ? "var(--shadow-sm)" : "none",
                  transition: "all var(--transition-fast)"
                }}
              >
                <UserPlus size={15} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                {selectedRole === "restaurant" ? "Registrar Local" : "Registrarse"}
              </button>
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: "rgba(255, 71, 87, 0.08)",
              border: "1px solid rgba(255, 71, 87, 0.2)",
              color: "var(--accent-primary)",
              padding: "12px",
              borderRadius: "var(--radius-md)",
              marginBottom: "20px",
              fontSize: "13px"
            }}>
              {error}
            </div>
          )}

          {/* Social Auth Buttons for Customers */}
          {selectedRole === "customer" && (
            <div style={{ marginBottom: "26px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    width: "100%",
                    height: "48px",
                    padding: "0 20px",
                    borderRadius: "12px",
                    border: "1.5px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                    color: "#1e293b",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continuar con Google</span>
                </button>

                {/* Apple ID Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSocialProvider("apple");
                    setSocialModalOpen(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    width: "100%",
                    height: "48px",
                    padding: "0 20px",
                    borderRadius: "12px",
                    border: "1.5px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                    color: "#1e293b",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000" style={{ flexShrink: 0 }}>
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.01-2.88-.96.04-2.13.64-2.79 1.41-.58.68-1.1 1.76-.96 2.81 1.07.08 2.12-.59 2.74-1.34z"/>
                  </svg>
                  <span>Continuar con Apple</span>
                </button>

                {/* Facebook Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSocialProvider("facebook");
                    setSocialModalOpen(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    width: "100%",
                    height: "48px",
                    padding: "0 20px",
                    borderRadius: "12px",
                    border: "1.5px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                    color: "#1e293b",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    <path fill="#ffffff" d="M16.671 15.543l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.513V4.996s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.643H7.078v3.47h3.047v8.385a12.09 12.09 0 003.75 0v-8.385h2.796z"/>
                  </svg>
                  <span>Continuar con Facebook</span>
                </button>
              </div>

              {/* Minimalist modern divider (only shown when login form or non-customer forms follow) */}
              {(isLogin || selectedRole !== "customer") && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  margin: "24px 0 16px",
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "500"
                }}>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
                  <span style={{ padding: "0 14px", color: "#64748b" }}>o continúa con credenciales</span>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
                </div>
              )}
            </div>
          )}

          {/* Hide form when customer is registering, as customer registration is exclusively via Social Auth (Google, Apple, Facebook) */}
          {!(selectedRole === "customer" && !isLogin) ? (
            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  {/* Name */}
                  <div className="input-group">
                    <label>{selectedRole === "restaurant" ? "Nombre del Dueño" : "Nombre Completo"}</label>
                    <div style={{ position: "relative" }}>
                      <UserIcon size={18} style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)"
                      }} />
                      <input
                        type="text"
                        className="input-field"
                        style={{ paddingLeft: "45px" }}
                        placeholder="Ej. Juan Pérez"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="input-group">
                    <label>Correo Electrónico</label>
                    <div style={{ position: "relative" }}>
                      <Mail size={18} style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)"
                      }} />
                      <input
                        type="email"
                        className="input-field"
                        style={{ paddingLeft: "45px" }}
                        placeholder="correo@ejemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Cedula (Driver only) */}
                  {selectedRole === "driver" && (
                    <div className="input-group">
                      <label>Cédula Ecuatoriana (10 dígitos)</label>
                      <div style={{ position: "relative" }}>
                        <Shield size={18} style={{
                          position: "absolute",
                          left: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--text-muted)"
                        }} />
                        <input
                          type="text"
                          className="input-field"
                          style={{ paddingLeft: "45px" }}
                          placeholder="Ej. 1712345678"
                          value={cedula}
                          maxLength={10}
                          onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Restaurant Owner specific fields */}
                  {selectedRole === "restaurant" && (
                    <>
                      {/* Restaurant Name */}
                      <div className="input-group">
                        <label>Nombre del Restaurante</label>
                        <div style={{ position: "relative" }}>
                          <Store size={18} style={{
                            position: "absolute",
                            left: "14px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)"
                          }} />
                          <input
                            type="text"
                            className="input-field"
                            style={{ paddingLeft: "45px" }}
                            placeholder="Ej. La Parrilla de Juan"
                            value={restaurantName}
                            onChange={(e) => setRestaurantName(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Restaurant Slug */}
                      <div className="input-group">
                        <label>Subdominio / Slug URL</label>
                        <div style={{ position: "relative" }}>
                          <Link size={18} style={{
                            position: "absolute",
                            left: "14px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)"
                          }} />
                          <input
                            type="text"
                            className="input-field"
                            style={{ paddingLeft: "45px" }}
                            placeholder="ej-la-parrilla"
                            value={slug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            required
                          />
                        </div>
                        <small style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "2px", display: "block" }}>
                          URL: http://localhost:5173/r/{slug || "slug"}
                        </small>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Username */}
              <div className="input-group">
                <label>Nombre de Usuario</label>
                <div style={{ position: "relative" }}>
                  <UserIcon size={18} style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)"
                  }} />
                  <input
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: "45px" }}
                    placeholder="Nombre de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="input-group" style={{ marginBottom: "30px" }}>
                <label>Contraseña</label>
                <div style={{ position: "relative" }}>
                  <Lock size={18} style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)"
                  }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input-field"
                    style={{ paddingLeft: "45px", paddingRight: "45px" }}
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: showPassword ? "var(--accent-primary, #ff4757)" : "var(--text-muted, #718096)",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="glow-btn"
                style={{ width: "100%", padding: "14px", fontSize: "16px" }}
                disabled={loading}
              >
                {loading ? "Procesando..." : isLogin ? "Ingresar al Sistema" : selectedRole === "restaurant" ? "Crear Restaurante" : "Registrarse"}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: "center", marginTop: "18px" }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 10px 0" }}>
                ¿Ya tienes una cuenta creada?
              </p>
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                style={{
                  background: "none",
                  border: "1px solid var(--border-light, #e2e8f0)",
                  borderRadius: "10px",
                  padding: "10px 20px",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  backgroundColor: "#ffffff",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-primary, #ff4757)";
                  e.currentTarget.style.color = "var(--accent-primary, #ff4757)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-light, #e2e8f0)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
              >
                <LogIn size={14} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                Iniciar sesión con usuario y contraseña
              </button>
            </div>
          )}

          {/* Sandbox Quick Access (Only when in Login tab) */}
          {isLogin && (
            <div style={{
              marginTop: "25px",
              paddingTop: "20px",
              borderTop: "1px solid var(--border-light)",
              textAlign: "center"
            }}>
              <h3 style={{
                fontSize: "11px",
                color: "var(--accent-secondary)",
                marginBottom: "10px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 800
              }}>
                Acceso Rápido Sandbox
              </h3>
              
              {selectedRole === "customer" && (
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    setLoading(true);
                    try {
                      let loginRes;
                      try {
                        loginRes = await apiRequest("/auth/login", {
                          method: "POST",
                          body: JSON.stringify({ username: "cliente", password: "cliente" }),
                        });
                      } catch (loginErr) {
                        await apiRequest("/auth/register-customer", {
                          method: "POST",
                          body: JSON.stringify({
                            username: "cliente",
                            password: "cliente",
                            name: "Cliente Sandbox",
                            email: "cliente@sandbox.com",
                            cedula: "1712345678"
                          })
                        });
                        loginRes = await apiRequest("/auth/login", {
                          method: "POST",
                          body: JSON.stringify({ username: "cliente", password: "cliente" }),
                        });
                      }
                      login(loginRes.token, loginRes.user);
                      navigate("/");
                    } catch (err: any) {
                      setError(err.message || "Error sandbox");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(255, 71, 87, 0.05)",
                    border: "1px solid rgba(255, 71, 87, 0.15)",
                    color: "var(--accent-primary)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Ingresar como Cliente (cliente / cliente)
                </button>
              )}

              {selectedRole === "driver" && (
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    setLoading(true);
                    try {
                      let loginRes;
                      try {
                        loginRes = await apiRequest("/auth/login", {
                          method: "POST",
                          body: JSON.stringify({ username: "driver", password: "driver" }),
                        });
                      } catch (loginErr) {
                        await apiRequest("/auth/register-driver", {
                          method: "POST",
                          body: JSON.stringify({
                            username: "driver",
                            password: "driver",
                            name: "Motorizado Sandbox",
                            email: "driver@sandbox.com",
                            cedula: "1787654321"
                          })
                        });
                        loginRes = await apiRequest("/auth/login", {
                          method: "POST",
                          body: JSON.stringify({ username: "driver", password: "driver" }),
                        });
                      }
                      login(loginRes.token, loginRes.user);
                      navigate("/delivery");
                    } catch (err: any) {
                      setError(err.message || "Error sandbox");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(46, 213, 115, 0.05)",
                    border: "1px solid rgba(46, 213, 115, 0.15)",
                    color: "var(--success)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Ingresar como Motorizado (driver / driver)
                </button>
              )}

              {selectedRole === "restaurant" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  {[
                    { label: "Dueño", user: "owner", color: "#fbbf24" },
                    { label: "Cajero", user: "cajero", color: "var(--success)" },
                    { label: "Cocinero", user: "cocina", color: "var(--warning)" },
                    { label: "Mesero", user: "mesero", color: "#3498db" }
                  ].map((roleInfo) => (
                    <button
                      key={roleInfo.user}
                      type="button"
                      onClick={async () => {
                        setError(null);
                        setLoading(true);
                        try {
                          const res = await apiRequest("/auth/login", {
                            method: "POST",
                            body: JSON.stringify({ username: roleInfo.user, password: roleInfo.user }),
                          });
                          login(res.token, res.user);
                          if (res.user.role === "PRODUCCION") navigate("/kitchen");
                          else navigate("/pos");
                        } catch (err: any) {
                          setError(err.message || "Error sandbox");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      style={{
                        padding: "8px 5px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border-light)",
                        color: "var(--text-primary)",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {roleInfo.label} ({roleInfo.user})
                    </button>
                  ))}
                </div>
              )}

              {selectedRole === "superadmin" && (
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    setLoading(true);
                    try {
                      const res = await apiRequest("/auth/login", {
                        method: "POST",
                        body: JSON.stringify({ username: "admin", password: "admin" }),
                      });
                      login(res.token, res.user);
                      navigate("/admin/restaurants");
                    } catch (err: any) {
                      setError(err.message || "Error sandbox");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(139, 92, 246, 0.05)",
                    border: "1px solid rgba(139, 92, 246, 0.15)",
                    color: "#8b5cf6",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Ingresar como SuperAdmin (admin / admin)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {selectedRole === null && (
        <button
          onClick={() => {
            setSelectedRole("superadmin");
            setIsLogin(true);
          }}
          style={{
            position: "fixed",
            bottom: "20px",
            left: "20px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            border: "1px solid var(--border-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-secondary)",
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
            transition: "all var(--transition-fast)",
            zIndex: 1000
          }}
          title="Panel de Administración"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.boxShadow = "var(--shadow-md)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          }}
        >
          <Shield size={16} />
        </button>
      )}

      {/* Modals for Google/Apple/Facebook and PedidosYa Onboarding */}
      <SocialAuthModal
        isOpen={socialModalOpen}
        provider={socialProvider}
        onClose={() => setSocialModalOpen(false)}
        onSuccess={handleSocialSuccess}
      />

      <OnboardingProfileModal
        isOpen={onboardingModalOpen}
        initialFirstName={profileData.firstName}
        initialLastName={profileData.lastName}
        onSkip={handleOnboardingSkip}
        onSave={handleOnboardingSave}
      />
    </div>
  );
};
