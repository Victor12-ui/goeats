import React, { useState } from "react";

interface OnboardingProfileModalProps {
  isOpen: boolean;
  initialFirstName?: string;
  initialLastName?: string;
  onSkip: () => void;
  onSave: (data: {
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: string;
  }) => void;
}

export const OnboardingProfileModal: React.FC<OnboardingProfileModalProps> = ({
  isOpen,
  initialFirstName = "",
  initialLastName = "",
  onSkip,
  onSave,
}) => {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<string>("Prefiero no decirlo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Auto-format birthDate to DD/MM/AAAA
  const handleDateChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length >= 5) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length >= 3) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setBirthDate(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate.trim(),
        gender,
      });
    }, 400);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(6px)",
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        color: "#111827",
        borderRadius: "24px",
        width: "100%",
        maxWidth: "430px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden",
        position: "relative",
        animation: "modalFadeIn 0.25s ease-out",
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        maxHeight: "92vh",
      }}>
        {/* Top Header with 'Ahora no' */}
        <div style={{
          padding: "20px 24px 8px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center"
        }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              background: "none",
              border: "none",
              color: "#111827",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
          >
            Ahora no
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{
          padding: "8px 24px 24px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          flex: 1
        }}>
          {/* Titles */}
          <div style={{ marginBottom: "26px" }}>
            <h1 style={{
              fontSize: "24px",
              fontWeight: "800",
              color: "#111827",
              margin: "0 0 6px",
              letterSpacing: "-0.5px"
            }}>
              Cuéntanos más de ti
            </h1>
            <p style={{
              fontSize: "13px",
              color: "#4b5563",
              margin: 0,
              lineHeight: "1.4"
            }}>
              Completa tus datos para terminar de crear tu cuenta.
            </p>
          </div>

          {/* Section: ¿Cómo te llamas? */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#111827",
              marginBottom: "12px"
            }}>
              ¿Cómo te llamas?
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Nombre (s)* */}
              <div style={{
                position: "relative",
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "8px 14px 6px",
                backgroundColor: "#ffffff",
                transition: "border-color 0.2s ease"
              }}>
                <label style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  display: "block",
                  fontWeight: "500",
                  marginBottom: "2px"
                }}>
                  Nombre (s)*
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej: Juan"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    fontSize: "15px",
                    fontWeight: "500",
                    color: "#111827",
                    padding: "2px 0 4px",
                    backgroundColor: "transparent"
                  }}
                />
              </div>

              {/* Apellido (s)* */}
              <div style={{
                position: "relative",
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "8px 14px 6px",
                backgroundColor: "#ffffff",
                transition: "border-color 0.2s ease"
              }}>
                <label style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  display: "block",
                  fontWeight: "500",
                  marginBottom: "2px"
                }}>
                  Apellido (s)*
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej: Pérez"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    fontSize: "15px",
                    fontWeight: "500",
                    color: "#111827",
                    padding: "2px 0 4px",
                    backgroundColor: "transparent"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section: ¿Cuándo naciste? */}
          <div style={{ marginBottom: "26px" }}>
            <div style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#111827",
              marginBottom: "12px"
            }}>
              ¿Cuándo naciste?
            </div>

            <div style={{
              border: "1px solid #d1d5db",
              borderRadius: "14px",
              padding: "12px 14px",
              backgroundColor: "#ffffff"
            }}>
              <input
                type="text"
                value={birthDate}
                onChange={(e) => handleDateChange(e.target.value)}
                placeholder="DD/MM/AAAA"
                maxLength={10}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  fontSize: "15px",
                  fontWeight: "500",
                  color: "#111827",
                  backgroundColor: "transparent",
                  letterSpacing: "1px"
                }}
              />
            </div>
          </div>

          {/* Section: ¿Con qué género te identificás? */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#111827",
              marginBottom: "14px"
            }}>
              ¿Con qué género te identificás?
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {["Femenino", "Masculino", "No binario", "Prefiero no decirlo"].map((option) => {
                const isSelected = gender === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setGender(option)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      fontSize: "13px",
                      fontWeight: isSelected ? "700" : "500",
                      backgroundColor: isSelected ? "#000000" : "#f3f4f6",
                      color: isSelected ? "#ffffff" : "#1f2937",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Fixed Action: Guardar datos */}
          <div style={{ marginTop: "auto", paddingTop: "8px" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "16px",
                backgroundColor: "#e21b70",
                color: "#ffffff",
                border: "none",
                borderRadius: "30px",
                fontSize: "16px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(226, 27, 112, 0.35)",
                transition: "opacity 0.2s ease",
              }}
            >
              {isSubmitting ? "Guardando..." : "Guardar datos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
