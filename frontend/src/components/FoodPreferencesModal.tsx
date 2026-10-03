import React, { useState, useEffect } from "react";
import { Sparkles, Check, X } from "lucide-react";
import { apiRequest } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export interface FoodCategoryOption {
  id: string;
  name: string;
  emoji: string;
  description: string;
  gradient: string;
}

export const FOOD_PREFERENCE_CATEGORIES: FoodCategoryOption[] = [
  { id: "burgers", name: "Hamburguesas", emoji: "🍔", description: "Smash, artesanales y papas", gradient: "linear-gradient(135deg, #ff7675, #d63031)" },
  { id: "pizza", name: "Pizzas", emoji: "🍕", description: "A la leña, mozzarella y masa madre", gradient: "linear-gradient(135deg, #fdcb6e, #e17055)" },
  { id: "sushi", name: "Sushi & Asiática", emoji: "🍣", description: "Rolls, ramen, poke y gyozas", gradient: "linear-gradient(135deg, #e84393, #fd79a8)" },
  { id: "alitas", name: "Pollo & Alitas", emoji: "🍗", description: "Crispy, BBQ y alitas picantes", gradient: "linear-gradient(135deg, #fab1a0, #e17055)" },
  { id: "mexican", name: "Tacos & Mexicana", emoji: "🌮", description: "Burritos, tacos, nachos y guacamole", gradient: "linear-gradient(135deg, #00b894, #00cec9)" },
  { id: "healthy", name: "Saludable & Fit", emoji: "🥗", description: "Bowls, ensaladas y opciones veggie", gradient: "linear-gradient(135deg, #55efc4, #00b894)" },
  { id: "desserts", name: "Postres & Helados", emoji: "🍰", description: "Waffles, pasteles y delicias dulces", gradient: "linear-gradient(135deg, #fd79a8, #6c5ce7)" },
  { id: "bbq", name: "Parrilladas & Asados", emoji: "🥩", description: "Cortes de carne, costillas y carbón", gradient: "linear-gradient(135deg, #636e72, #2d3436)" },
  { id: "italian", name: "Pastas & Italiana", emoji: "🍝", description: "Lasaña, pastas frescas y risottos", gradient: "linear-gradient(135deg, #ffeaa7, #fdcb6e)" },
  { id: "sandwiches", name: "Sándwiches & Cafés", emoji: "🥪", description: "Baguettes, tostadas y desayunos", gradient: "linear-gradient(135deg, #74b9ff, #0984e3)" },
  { id: "tapioca", name: "Bebidas & Bubble Tea", emoji: "🧋", description: "Jugos naturales, batidos y tapioca", gradient: "linear-gradient(135deg, #a29bfe, #6c5ce7)" },
  { id: "fastfood", name: "Comida Rápida & Snacks", emoji: "🍟", description: "Hot dogs, empanadas y piqueos", gradient: "linear-gradient(135deg, #fbc531, #e1b12c)" },
];

interface FoodPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesUpdated?: (preferences: string[]) => void;
  title?: string;
  subtitle?: string;
}

export const FoodPreferencesModal: React.FC<FoodPreferencesModalProps> = ({
  isOpen,
  onClose,
  onPreferencesUpdated,
  title = "Tus Preferencias Gastronómicas",
  subtitle = "Elige tus comidas y antojitos favoritos para que GoEats te recomiende los mejores platos y locales.",
}) => {
  const { user, token, login } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing preferences from user or localStorage
  useEffect(() => {
    if (!isOpen) return;

    if (user && (user as any).preferences && Array.isArray((user as any).preferences)) {
      setSelected((user as any).preferences);
      return;
    }

    try {
      const stored = localStorage.getItem("goeats_food_preferences");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSelected(parsed);
          return;
        }
      }
    } catch (e) {}

    // Default: select 2 popular categories as suggestion
    setSelected(["burgers", "pizza"]);
  }, [isOpen, user]);

  if (!isOpen) return null;

  const toggleCategory = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selected.length === FOOD_PREFERENCE_CATEGORIES.length) {
      setSelected([]);
    } else {
      setSelected(FOOD_PREFERENCE_CATEGORIES.map((c) => c.id));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Guardar en localStorage inmediatamente
      localStorage.setItem("goeats_food_preferences", JSON.stringify(selected));

      // 2. Si el usuario está autenticado, sincronizar con backend
      if (user && token) {
        try {
          await apiRequest("/auth/preferences", {
            method: "POST",
            body: JSON.stringify({ preferences: selected }),
          });

          // Actualizar contexto de usuario local
          login(token, {
            ...user,
            preferences: selected,
          } as any);
        } catch (err) {
          console.warn("No se pudo sincronizar preferencias con el servidor:", err);
        }
      }

      if (onPreferencesUpdated) {
        onPreferencesUpdated(selected);
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(15, 23, 42, 0.75)",
      backdropFilter: "blur(8px)",
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      animation: "fadeIn 0.2s ease-out",
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "24px",
        width: "100%",
        maxWidth: "680px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        maxHeight: "92vh",
        border: "1px solid rgba(226, 232, 240, 0.8)",
      }}>
        {/* Top Header */}
        <div style={{
          padding: "24px 28px 16px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          backgroundColor: "#ffffff"
        }}>
          <div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "20px",
              backgroundColor: "rgba(255, 71, 87, 0.1)",
              color: "#ff4757",
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "8px",
            }}>
              <Sparkles size={14} />
              Recomendaciones Inteligentes
            </div>
            <h2 style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 6px 0",
              letterSpacing: "-0.4px"
            }}>
              {title}
            </h2>
            <p style={{
              fontSize: "13px",
              color: "#64748b",
              margin: 0,
              lineHeight: "1.4"
            }}>
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
              transition: "all 0.2s ease",
            }}
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Bar: Counts & Select all */}
        <div style={{
          padding: "12px 28px",
          backgroundColor: "#f8fafc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #f1f5f9",
          fontSize: "13px",
        }}>
          <span style={{ color: "#475569", fontWeight: 600 }}>
            {selected.length === 0 ? "Selecciona al menos una categoría" : `${selected.length} seleccionada${selected.length > 1 ? "s" : ""}`}
          </span>
          <button
            type="button"
            onClick={handleSelectAll}
            style={{
              background: "none",
              border: "none",
              color: "#ff4757",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            {selected.length === FOOD_PREFERENCE_CATEGORIES.length ? "Deseleccionar todas" : "Seleccionar todas"}
          </button>
        </div>

        {/* Category Grid */}
        <div style={{
          padding: "20px 28px",
          overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "14px",
          flex: 1,
        }}>
          {FOOD_PREFERENCE_CATEGORIES.map((cat) => {
            const isSelected = selected.includes(cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                style={{
                  borderRadius: "16px",
                  padding: "14px",
                  cursor: "pointer",
                  border: isSelected ? "2px solid #ff4757" : "1px solid #e2e8f0",
                  backgroundColor: isSelected ? "rgba(255, 71, 87, 0.04)" : "#ffffff",
                  boxShadow: isSelected ? "0 4px 14px rgba(255, 71, 87, 0.15)" : "0 2px 4px rgba(0, 0, 0, 0.02)",
                  transition: "all 0.18s ease-in-out",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  userSelect: "none",
                }}
              >
                {/* Header row with emoji & check badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "28px" }}>{cat.emoji}</span>
                  <div style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isSelected ? "#ff4757" : "#e2e8f0",
                    color: "#ffffff",
                    transition: "all 0.18s ease",
                  }}>
                    {isSelected ? <Check size={14} strokeWidth={3} /> : null}
                  </div>
                </div>

                <div style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: isSelected ? "#ff4757" : "#1e293b",
                  marginBottom: "4px",
                }}>
                  {cat.name}
                </div>

                <div style={{
                  fontSize: "11px",
                  color: "#64748b",
                  lineHeight: "1.3"
                }}>
                  {cat.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 28px",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          backgroundColor: "#ffffff",
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "12px 20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              backgroundColor: "transparent",
              color: "#64748b",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Ahora no
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1,
              maxWidth: "320px",
              padding: "13px 24px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #ff4757, #ff6b81)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(255, 71, 87, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "transform 0.15s ease",
            }}
          >
            <Sparkles size={16} />
            {isSaving ? "Guardando..." : "Guardar y Personalizar"}
          </button>
        </div>
      </div>
    </div>
  );
};
