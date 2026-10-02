import React from "react";
import { Mail, CheckCircle2, Gift, ArrowRight, X } from "lucide-react";

interface WelcomeEmailModalProps {
  isOpen: boolean;
  userEmail: string;
  userName: string;
  onClose: () => void;
  onContinue: () => void;
}

export const WelcomeEmailModal: React.FC<WelcomeEmailModalProps> = ({
  isOpen,
  userEmail,
  userName,
  onClose,
  onContinue,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        width: "100%",
        maxWidth: "480px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        overflow: "hidden",
        position: "relative",
        animation: "modalFadeIn 0.3s ease-out",
        fontFamily: "'Segoe UI', Roboto, sans-serif",
      }}>
        {/* Email Header simulation bar */}
        <div style={{
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: "#ff4757",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff"
            }}>
              <Mail size={15} />
            </div>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
              Bandeja de Entrada • Nuevo Correo
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Email Content Body */}
        <div style={{ padding: "28px 24px" }}>
          {/* Email meta */}
          <div style={{
            fontSize: "12px",
            color: "#64748b",
            marginBottom: "20px",
            borderBottom: "1px dashed #e2e8f0",
            paddingBottom: "12px",
            lineHeight: "1.6"
          }}>
            <div><strong>De:</strong> GoEats Notificaciones &lt;bienvenida@goeats.app&gt;</div>
            <div><strong>Para:</strong> {userEmail || "tu-correo@gmail.com"}</div>
            <div><strong>Asunto:</strong> 🎉 ¡Tu cuenta en GoEats ha sido creada con éxito!</div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "22px" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "rgba(46, 213, 115, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2ed573",
              marginBottom: "12px"
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px" }}>
              ¡Cuenta creada con éxito!
            </h2>
            <p style={{ fontSize: "14px", color: "#475569", margin: 0 }}>
              Hola <strong>{userName || "Comensal"}</strong>, te damos la bienvenida a la comunidad de <strong>GoEats</strong>.
            </p>
          </div>

          {/* Welcome coupon card */}
          <div style={{
            backgroundColor: "#fff1f2",
            border: "1px solid #fecdd3",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              backgroundColor: "#ff4757",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Gift size={22} />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#e11d48", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Regalo de Bienvenida
              </div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#881337" }}>
                Cupón: BIENVENIDO15 (15% OFF)
              </div>
              <div style={{ fontSize: "11px", color: "#9f1239" }}>
                Válido en tu primer pedido a domicilio o directo en mesa con código QR.
              </div>
            </div>
          </div>

          {/* Bottom Button */}
          <button
            type="button"
            onClick={onContinue}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: "#ff4757",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(255, 71, 87, 0.4)",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <span>Continuar a mi perfil</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
