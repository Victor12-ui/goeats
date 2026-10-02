import React, { useState } from "react";
import { X, Shield, Smartphone, User } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isUsingOther, setIsUsingOther] = useState(false);
  const [otherEmail, setOtherEmail] = useState("");
  const [otherName, setOtherName] = useState("");

  const googleAccounts = [
    {
      name: "Cuenta Principal",
      email: "usuario@ejemplo.com",
      avatarColor: "#e65100",
      initial: "U",
    },
    {
      name: "Cuenta Secundaria",
      email: "contacto@ejemplo.com",
      avatarColor: "#00897b",
      initial: "C",
    },
    {
      name: "Demo GoEats",
      email: "demo@goeats.app",
      avatarColor: "#5c6bc0",
      initial: "D",
    },
  ];

  if (!isOpen || !provider) return null;

  const handleSelectAccount = (acc: { name: string; email: string }) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const parts = acc.name.trim().split(" ");
      const firstName = parts[0] || acc.name;
      const lastName = parts.slice(1).join(" ") || "";
      onSuccess({
        name: acc.name,
        firstName,
        lastName,
        email: acc.email,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        provider: "google",
      });
    }, 400);
  };

  const handleOtherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherEmail.trim()) return;
    const nameToUse = otherName.trim() || otherEmail.split("@")[0] || "Usuario";
    const parts = nameToUse.split(" ");
    const firstName = parts[0] || nameToUse;
    const lastName = parts.slice(1).join(" ") || "";

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess({
        name: nameToUse,
        firstName,
        lastName,
        email: otherEmail.trim(),
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        provider: "google",
      });
    }, 400);
  };

  const handleAppleSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess({
        name: "Usuario Apple",
        firstName: "Usuario",
        lastName: "Apple",
        email: "usuario@icloud.com",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        provider: "apple",
      });
    }, 500);
  };

  const handleFacebookSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess({
        name: "Usuario Facebook",
        firstName: "Usuario",
        lastName: "Facebook",
        email: "usuario@facebook.com",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        provider: "facebook",
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
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* GOOGLE OFFICIAL WINDOW (Exact replica of Google Accounts Chooser) */}
      {provider === "google" && (
        <div
          style={{
            backgroundColor: "#131314",
            color: "#e3e3e3",
            borderRadius: "28px",
            width: "100%",
            maxWidth: "760px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px #3c4043",
            overflow: "hidden",
            position: "relative",
            animation: "modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
            fontFamily: "'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top Bar with Google Logo and Close */}
          <div
            style={{
              padding: "20px 28px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span style={{ fontSize: "14px", fontWeight: "500", color: "#c4c7c5" }}>
                Iniciar sesión con Google
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#c4c7c5",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Main 2-Column Body (Identical to Google Accounts Chooser) */}
          <div
            style={{
              padding: "36px 36px 28px",
              display: "grid",
              gridTemplateColumns: "1fr 1.35fr",
              gap: "36px",
            }}
          >
            {/* Left Column: Heading */}
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  letterSpacing: "1.2px",
                  color: "#ff4757",
                  marginBottom: "14px",
                  textTransform: "uppercase",
                }}
              >
                GOEATS
              </div>
              <h1
                style={{
                  fontSize: "30px",
                  fontWeight: "500",
                  color: "#ffffff",
                  lineHeight: "1.2",
                  margin: "0 0 14px",
                  letterSpacing: "-0.5px",
                }}
              >
                Selecciona una cuenta
              </h1>
              <p style={{ fontSize: "14px", color: "#a8c7fa", margin: 0 }}>
                para ir a <strong style={{ color: "#ffffff" }}>GoEats</strong>
              </p>

              {isLoading && (
                <div style={{ marginTop: "24px", display: "flex", alignItems: "center", gap: "10px", color: "#a8c7fa", fontSize: "13px" }}>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid #a8c7fa",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span>Verificando con Google y redirigiendo...</span>
                </div>
              )}
            </div>

            {/* Right Column: Google Accounts List */}
            <div>
              {!isUsingOther ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {googleAccounts.map((acc) => (
                    <div
                      key={acc.email}
                      onClick={() => handleSelectAccount(acc)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "14px 16px",
                        borderRadius: "16px",
                        cursor: "pointer",
                        transition: "background-color 0.18s ease, transform 0.1s ease",
                        backgroundColor: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.07)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          backgroundColor: acc.avatarColor,
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "600",
                          fontSize: "16px",
                          flexShrink: 0,
                        }}
                      >
                        {acc.initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: "500", color: "#ffffff", lineHeight: "1.3" }}>
                          {acc.name}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#c4c7c5",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {acc.email}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Option: Usar otra cuenta */}
                  <div
                    onClick={() => setIsUsingOther(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "14px 16px",
                      borderRadius: "16px",
                      cursor: "pointer",
                      transition: "background-color 0.18s ease",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                      marginTop: "6px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.07)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "50%",
                        backgroundColor: "transparent",
                        border: "1px solid #444746",
                        color: "#c4c7c5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <User size={18} />
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "500", color: "#ffffff" }}>
                      Usar otra cuenta
                    </div>
                  </div>
                </div>
              ) : (
                /* Form for 'Usar otra cuenta' */
                <form onSubmit={handleOtherSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#ffffff", marginBottom: "4px" }}>
                    Ingresar con otra cuenta de Google
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#c4c7c5", display: "block", marginBottom: "4px" }}>
                      Correo electrónico de Gmail:
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="correo@gmail.com"
                      value={otherEmail}
                      onChange={(e) => setOtherEmail(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: "8px",
                        border: "1px solid #444746",
                        backgroundColor: "#1e1f20",
                        color: "#ffffff",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#c4c7c5", display: "block", marginBottom: "4px" }}>
                      Nombre y Apellido:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Tu nombre completo"
                      value={otherName}
                      onChange={(e) => setOtherName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: "8px",
                        border: "1px solid #444746",
                        backgroundColor: "#1e1f20",
                        color: "#ffffff",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setIsUsingOther(false)}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "20px",
                        border: "1px solid #444746",
                        backgroundColor: "transparent",
                        color: "#a8c7fa",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Volver a mis cuentas
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "20px",
                        border: "none",
                        backgroundColor: "#a8c7fa",
                        color: "#062e6f",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      {isLoading ? "Ingresando..." : "Siguiente"}
                    </button>
                  </div>
                </form>
              )}

              {/* Disclaimer */}
              <div
                style={{
                  fontSize: "11px",
                  color: "#8e918f",
                  lineHeight: "1.45",
                  marginTop: "20px",
                  paddingTop: "14px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                Antes de usar esta aplicación, puedes leer la{" "}
                <span style={{ color: "#a8c7fa", cursor: "pointer" }}>Política de Privacidad</span> y los{" "}
                <span style={{ color: "#a8c7fa", cursor: "pointer" }}>Términos del Servicio</span> de GoEats.
              </div>
            </div>
          </div>

          {/* Bottom Bar: Language and Footer Links */}
          <div
            style={{
              padding: "14px 28px",
              backgroundColor: "rgba(0,0,0,0.25)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#8e918f",
            }}
          >
            <div>Español (España)</div>
            <div style={{ display: "flex", gap: "20px" }}>
              <span style={{ cursor: "pointer" }}>Ayuda</span>
              <span style={{ cursor: "pointer" }}>Privacidad</span>
              <span style={{ cursor: "pointer" }}>Términos</span>
            </div>
          </div>
        </div>
      )}

      {/* APPLE ID POPUP (Dark native Apple style) */}
      {provider === "apple" && (
        <div
          style={{
            backgroundColor: "#000000",
            color: "#ffffff",
            borderRadius: "24px",
            width: "100%",
            maxWidth: "440px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px #27272a",
            padding: "36px 30px",
            position: "relative",
            animation: "modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "#1c1c1e",
              border: "none",
              color: "#8e8e93",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>

          <div style={{ textAlign: "center", marginBottom: "26px" }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="#ffffff" style={{ marginBottom: "12px" }}>
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.01-2.88-.96.04-2.13.64-2.79 1.41-.58.68-1.1 1.76-.96 2.81 1.07.08 2.12-.59 2.74-1.34z" />
            </svg>
            <h2 style={{ fontSize: "21px", fontWeight: "600", margin: "0 0 6px" }}>
              Iniciar sesión con Apple
            </h2>
            <p style={{ fontSize: "13px", color: "#8e8e93", margin: 0 }}>
              Crea tu cuenta de comensal en GoEats con tu Apple ID
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#1c1c1e",
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px" }}>
              <span style={{ color: "#8e8e93" }}>Nombre:</span>
              <span style={{ fontWeight: "600" }}>Usuario Apple</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
              <span style={{ color: "#8e8e93" }}>Apple ID:</span>
              <span style={{ fontWeight: "600" }}>usuario@icloud.com</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "26px", fontSize: "12px", color: "#8e8e93" }}>
            <Shield size={16} color="#34d399" />
            <span>Tu correo se mantendrá privado y protegido.</span>
          </div>

          <button
            type="button"
            onClick={handleAppleSubmit}
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "none",
              backgroundColor: "#ffffff",
              color: "#000000",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Smartphone size={18} />
            {isLoading ? "Validando Face ID..." : "Continuar con Face ID"}
          </button>
        </div>
      )}

      {/* FACEBOOK OFFICIAL DIALOG */}
      {provider === "facebook" && (
        <div
          style={{
            backgroundColor: "#ffffff",
            color: "#1c1e21",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "460px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
            overflow: "hidden",
            position: "relative",
            animation: "modalFadeIn 0.22s ease-out",
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #dadde1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24">
              <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              <path fill="#ffffff" d="M16.671 15.543l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.513V4.996s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.643H7.078v3.47h3.047v8.385a12.09 12.09 0 003.75 0v-8.385h2.796z" />
            </svg>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#606770",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: "28px 24px" }}>
            <h2 style={{ fontSize: "19px", fontWeight: "600", margin: "0 0 8px", color: "#1c1e21" }}>
              Iniciar sesión con Facebook
            </h2>
            <p style={{ fontSize: "14px", color: "#606770", margin: "0 0 22px", lineHeight: "1.4" }}>
              GoEats recibirá tu nombre, foto de perfil y dirección de correo electrónico para crear tu cuenta de comensal.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 14px",
                borderRadius: "10px",
                backgroundColor: "#f0f2f5",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  backgroundColor: "#1877f2",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "18px",
                }}
              >
                U
              </div>
              <div>
                <div style={{ fontWeight: "600", fontSize: "15px", color: "#050505" }}>Usuario Facebook</div>
                <div style={{ fontSize: "12px", color: "#65676b" }}>usuario@facebook.com</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "8px",
                  border: "1px solid #dadde1",
                  backgroundColor: "#e4e6eb",
                  color: "#050505",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFacebookSubmit}
                disabled={isLoading}
                style={{
                  flex: 2,
                  padding: "11px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#1877f2",
                  color: "#ffffff",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                {isLoading ? "Conectando..." : "Continuar como Usuario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
