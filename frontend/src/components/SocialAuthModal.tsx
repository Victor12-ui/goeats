import React, { useState } from "react";
import { X, Check, Shield, Smartphone } from "lucide-react";

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
  const [selectedEmail, setSelectedEmail] = useState("usuario.demo@gmail.com");
  const [customName, setCustomName] = useState("Juan Pérez");
  const [isCustomAccount, setIsCustomAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !provider) return null;

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const parts = customName.trim().split(" ");
      const firstName = parts[0] || "Juan";
      const lastName = parts.slice(1).join(" ") || "Pérez";
      onSuccess({
        name: customName,
        firstName,
        lastName,
        email: selectedEmail,
        avatar: provider === "google" 
          ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" 
          : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        provider,
      });
    }, 700);
  };

  return (
    <div style={{
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
    }}>
      <div style={{
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
      }}>
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
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.31 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 4px", color: "#202124" }}>
                Acceder con Google
              </h2>
              <p style={{ fontSize: "14px", color: "#5f6368", margin: 0 }}>
                para continuar en <strong style={{ color: "#ff4757" }}>GoEats</strong>
              </p>
            </div>

            {/* Account Selector Card */}
            <div style={{
              border: isCustomAccount ? "1px solid #dadce0" : "2px solid #1a73e8",
              borderRadius: "12px",
              padding: "14px 16px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              backgroundColor: isCustomAccount ? "#f8f9fa" : "#ffffff",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }} onClick={() => setIsCustomAccount(false)}>
              <div style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                backgroundColor: "#1a73e8",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "18px",
              }}>
                {(customName || "U")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: "600", fontSize: "14px", color: "#202124" }}>
                  {customName}
                </div>
                <div style={{ fontSize: "12px", color: "#5f6368", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {selectedEmail}
                </div>
              </div>
              {!isCustomAccount && <Check size={18} color="#1a73e8" />}
            </div>

            {/* Custom Account Toggle */}
            <div
              onClick={() => setIsCustomAccount(!isCustomAccount)}
              style={{
                fontSize: "13px",
                color: "#1a73e8",
                fontWeight: "500",
                padding: "4px",
                cursor: "pointer",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span>+ Usar otra cuenta de Google</span>
            </div>

            {isCustomAccount && (
              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Tu Nombre y Apellido"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #dadce0",
                    borderRadius: "6px",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
                <input
                  type="email"
                  placeholder="tu-correo@gmail.com"
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #dadce0",
                    borderRadius: "6px",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            )}

            {/* Google Disclaimer */}
            <div style={{
              fontSize: "11px",
              color: "#5f6368",
              lineHeight: "1.45",
              marginBottom: "24px",
              backgroundColor: "#f8f9fa",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #e8eaed"
            }}>
              Para continuar, Google compartirá tu nombre, dirección de correo electrónico y foto de perfil con <strong>GoEats</strong>. Antes de usar esta app, puedes revisar la Política de privacidad y los Términos del Servicio de GoEats.
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
                type="button"
                onClick={handleConfirm}
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
          </div>
        )}

        {/* APPLE ID POPUP FLOW */}
        {provider === "apple" && (
          <div style={{ padding: "32px 28px 24px", backgroundColor: "#000000", color: "#ffffff" }}>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#ffffff" style={{ marginBottom: "12px" }}>
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.01-2.88-.96.04-2.13.64-2.79 1.41-.58.68-1.1 1.76-.96 2.81 1.07.08 2.12-.59 2.74-1.34z"/>
              </svg>
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 6px", color: "#ffffff" }}>
                Iniciar sesión con Apple
              </h2>
              <p style={{ fontSize: "13px", color: "#a1a1aa", margin: 0 }}>
                Crea tu cuenta segura en GoEats con tu Apple ID
              </p>
            </div>

            <div style={{
              backgroundColor: "#18181b",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
              border: "1px solid #27272a"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "13px" }}>
                <span style={{ color: "#a1a1aa" }}>Nombre:</span>
                <span style={{ fontWeight: "600" }}>{customName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#a1a1aa" }}>Apple ID:</span>
                <span style={{ fontWeight: "600" }}>usuario@icloud.com</span>
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
                type="button"
                onClick={handleConfirm}
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
                  gap: "8px"
                }}
              >
                <Smartphone size={16} />
                {isLoading ? "Validando Face ID..." : "Continuar con Face ID"}
              </button>
            </div>
          </div>
        )}

        {/* FACEBOOK POPUP FLOW */}
        {provider === "facebook" && (
          <div style={{ padding: "32px 28px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <svg width="46" height="46" viewBox="0 0 24 24" style={{ marginBottom: "12px" }}>
                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                <path fill="#ffffff" d="M16.671 15.543l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.513V4.996s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.643H7.078v3.47h3.047v8.385a12.09 12.09 0 003.75 0v-8.385h2.796z"/>
              </svg>
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 4px", color: "#1c1e21" }}>
                Iniciar sesión con Facebook
              </h2>
              <p style={{ fontSize: "14px", color: "#65676b", margin: 0 }}>
                GoEats recibirá tu nombre y foto de perfil.
              </p>
            </div>

            <div style={{
              border: "1px solid #dadde1",
              borderRadius: "10px",
              padding: "14px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px"
            }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#1877f2",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold"
              }}>
                {(customName || "U")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>{customName}</div>
                <div style={{ fontSize: "12px", color: "#65676b" }}>Continuarás con esta cuenta de Facebook</div>
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
                type="button"
                onClick={handleConfirm}
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
                {isLoading ? "Conectando..." : `Continuar como ${customName.split(" ")[0] || "Usuario"}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
