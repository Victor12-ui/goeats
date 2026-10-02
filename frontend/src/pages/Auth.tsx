import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";
import { LogIn, UserPlus, Shield, Store, Mail, Lock, User as UserIcon, Link, ShoppingBag, Truck, ArrowLeft, Eye, EyeOff } from "lucide-react";

export const Auth: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<"customer" | "driver" | "restaurant" | "superadmin" | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [regType, setRegType] = useState<"owner" | "customer" | "driver">("owner");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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

        await apiRequest(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        
        setIsLogin(true);
        setError(null);
        alert(
          regType === "owner"
            ? "Restaurante registrado con éxito. Ahora puedes iniciar sesión."
            : `${regType === "customer" ? "Cliente" : "Conductor"} registrado con éxito. Ahora puedes iniciar sesión.`
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
              {isLogin ? "Iniciar Sesión" : selectedRole === "restaurant" ? "Registrar Restaurante" : "Crear Cuenta"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
              {selectedRole === "restaurant" && isLogin
                ? "Dueños, Cajeros, Cocina y Meseros"
                : selectedRole === "superadmin"
                ? "Administrador Global de la Plataforma"
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

                {/* Cedula (Customer / Driver) */}
                {selectedRole !== "restaurant" && (
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
    </div>
  );
};
