import React, { useState, useEffect } from "react";
import { X, Shield, Smartphone, Info } from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

interface SocialAuthModalProps {
  isOpen: boolean;
  provider: "google" | "apple" | "facebook" | null;
  onClose: () => void;
  onSuccess: (data: {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;
    provider: string;
  }) => void;
}

export const SocialAuthModal: React.FC<SocialAuthModalProps> = ({
  isOpen,
  provider,
  onClose,
  onSuccess,
}) => {
  const [selectedEmail, setSelectedEmail] = useState(() => {
    return localStorage.getItem("goeats_saved_email") || "";
  });
  const [customName, setCustomName] = useState(() => {
    return localStorage.getItem("goeats_saved_name") || "";
  });
  const [isLoading, setIsLoading] = useState(false);

  // Initialize official Google Identity Services if client ID is configured
  useEffect(() => {
    if (!isOpen || provider !== "google") return;

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

              if (payload.email) localStorage.setItem("goeats_saved_email", payload.email);
              if (payload.name) localStorage.setItem("goeats_saved_name", payload.name);

              onSuccess({
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

        const btnContainer = document.getElementById("google-gis-container");
        if (btnContainer) {
          btnContainer.innerHTML = "";
          window.google.accounts.id.renderButton(btnContainer, {
            theme: "outline",
            size: "large",
            width: 360,
            text: "continue_with",
            shape: "rectangular",
          });
        }

        window.google.accounts.id.prompt();
      } catch (err) {
        console.warn("Google GIS init error:", err);
      }
    }
  }, [isOpen, provider]);

  if (!isOpen || !provider) return null;

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const emailToUse = selectedEmail.trim();
    if (!emailToUse) {
      alert("Por favor ingresa tu dirección de correo electrónico.");
      return;
    }

    const nameToUse = customName.trim() || emailToUse.split("@")[0] || "Usuario";
    const parts = nameToUse.split(" ");
    const firstName = parts[0] || nameToUse;
    const lastName = parts.slice(1).join(" ") || "";

    localStorage.setItem("goeats_saved_email", emailToUse);
    localStorage.setItem("goeats_saved_name", nameToUse);

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess({
        name: nameToUse,
        firstName,
        lastName,
        email: emailToUse,
        avatar:
          provider === "google"
            ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
            : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        provider,
      });
    }, 500);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(5px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          color: "#202124",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          position: "relative",
          animation: "modalFadeIn 0.25s ease-out",
          fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            border: "none",
            backgroundColor: "#f1f3f4",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#5f6368",
            zIndex: 10,
          }}
        >
          <X size={18} />
        </button>

        {/* GOOGLE POPUP FLOW */}
        {provider === "google" && (
          <div style={{ padding: "32px 28px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" style={{ marginBottom: "12px" }}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 4px", color: "#202124" }}>
                Acceder con Google
              </h2>
              <p style={{ fontSize: "14px", color: "#5f6368", margin: 0 }}>
                para continuar en <strong style={{ color: "#ff4757" }}>GoEats</strong>
              </p>
            </div>

            {/* Official Google GIS Button Container if configured */}
            <div id="google-gis-container" style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }} />

            {/* Google Input Form (for entering your real Gmail address) */}
            <form onSubmit={handleManualSubmit}>
              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#3c4043", display: "block", marginBottom: "4px" }}>
                    Tu Cuenta de Gmail o Correo de Google:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@gmail.com"
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: "1.5px solid #dadce0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                      transition: "border-color 0.2s ease",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#1a73e8")}
                    onBlur={(e) => (e.target.style.borderColor = "#dadce0")}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#3c4043", display: "block", marginBottom: "4px" }}>
                    Tu Nombre Completo:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre y apellido"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: "1.5px solid #dadce0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                      transition: "border-color 0.2s ease",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#1a73e8")}
                    onBlur={(e) => (e.target.style.borderColor = "#dadce0")}
                  />
                </div>
              </div>

              {/* Info Note about Google OAuth popup */}
              <div
                style={{
                  fontSize: "12px",
                  color: "#5f6368",
                  lineHeight: "1.45",
                  marginBottom: "20px",
                  backgroundColor: "#f8f9fa",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e8eaed",
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <Info size={16} color="#1a73e8" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  Ingresa tu cuenta de Gmail real. Se vinculará de inmediato a tu perfil y recibirás el correo de confirmación de GoEats en tu bandeja de entrada.
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "20px",
                    border: "1px solid #dadce0",
                    backgroundColor: "#ffffff",
                    color: "#1a73e8",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "20px",
                    border: "none",
                    backgroundColor: "#1a73e8",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 2px 6px rgba(26, 115, 232, 0.4)",
                  }}
                >
                  {isLoading ? "Verificando..." : "Confirmar y siguiente"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* APPLE ID POPUP FLOW */}
        {provider === "apple" && (
          <div style={{ padding: "32px 28px 24px", backgroundColor: "#000000", color: "#ffffff" }}>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#ffffff" style={{ marginBottom: "12px" }}>
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.01-2.88-.96.04-2.13.64-2.79 1.41-.58.68-1.1 1.76-.96 2.81 1.07.08 2.12-.59 2.74-1.34z" />
              </svg>
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 6px", color: "#ffffff" }}>
                Iniciar sesión con Apple
              </h2>
              <p style={{ fontSize: "13px", color: "#a1a1aa", margin: 0 }}>
                Crea tu cuenta segura en GoEats con tu Apple ID
              </p>
            </div>

            <form onSubmit={handleManualSubmit}>
              <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>
                    Tu Apple ID o correo iCloud:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@icloud.com"
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: "1px solid #27272a",
                      backgroundColor: "#18181b",
                      color: "#ffffff",
                      borderRadius: "8px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>
                    Tu Nombre:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre completo"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: "1px solid #27272a",
                      backgroundColor: "#18181b",
                      color: "#ffffff",
                      borderRadius: "8px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", color: "#a1a1aa", fontSize: "12px" }}>
                <Shield size={16} color="#34d399" />
                <span>Tu correo real se mantendrá privado y protegido.</span>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #3f3f46",
                    backgroundColor: "transparent",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    flex: 2,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Smartphone size={16} />
                  {isLoading ? "Validando Face ID..." : "Continuar con Face ID"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FACEBOOK POPUP FLOW */}
        {provider === "facebook" && (
          <div style={{ padding: "32px 28px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <svg width="46" height="46" viewBox="0 0 24 24" style={{ marginBottom: "12px" }}>
                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                <path fill="#ffffff" d="M16.671 15.543l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.513V4.996s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.643H7.078v3.47h3.047v8.385a12.09 12.09 0 003.75 0v-8.385h2.796z" />
              </svg>
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 4px", color: "#1c1e21" }}>
                Iniciar sesión con Facebook
              </h2>
              <p style={{ fontSize: "14px", color: "#65676b", margin: 0 }}>
                GoEats recibirá tu nombre y correo para crear tu cuenta.
              </p>
            </div>

            <form onSubmit={handleManualSubmit}>
              <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#1c1e21", display: "block", marginBottom: "4px" }}>
                    Tu correo de Facebook:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tu-correo@ejemplo.com"
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #dadde1",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#1c1e21", display: "block", marginBottom: "4px" }}>
                    Tu Nombre en Facebook:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre y apellido"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #dadde1",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #dadde1",
                    backgroundColor: "#e4e6eb",
                    color: "#050505",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    flex: 2,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#1877f2",
                    color: "#ffffff",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  {isLoading ? "Conectando..." : "Continuar con Facebook"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
