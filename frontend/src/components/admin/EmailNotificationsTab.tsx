import React, { useState, useEffect } from "react";
import { apiRequest } from "../../utils/api";
import {
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface EmailLog {
  id: number;
  userId: number | null;
  recipientEmail: string;
  type: string;
  template: string;
  subject: string;
  status: "PENDING" | "SENDING" | "SENT" | "FAILED";
  providerMessageId: string | null;
  error: string | null;
  eventId: string | null;
  metadataJson: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  gmailConfig: {
    isReady: boolean;
    user: string | null;
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasRefreshToken: boolean;
  };
}

export const EmailNotificationsTab: React.FC = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  // Test email state
  const [testEmail, setTestEmail] = useState("");
  const [testRole, setTestRole] = useState<"CUSTOMER" | "DRIVER" | "RESTAURANT">("CUSTOMER");
  const [sendingTest, setSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Retry state
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes] = await Promise.all([
        apiRequest(`/notifications/logs?status=${filterStatus}&search=${encodeURIComponent(searchTerm)}`),
        apiRequest("/notifications/stats"),
      ]);
      setLogs(logsRes.logs || []);
      setStats(statsRes.stats || null);
    } catch (err: any) {
      console.error("Error loading email notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;

    try {
      setSendingTest(true);
      setTestMessage(null);
      const res = await apiRequest("/notifications/test-email", {
        method: "POST",
        body: JSON.stringify({ to: testEmail, role: testRole }),
      });
      setTestMessage({ text: res.message || "Correo de prueba enviado con éxito", type: "success" });
      loadData();
    } catch (err: any) {
      setTestMessage({ text: err.message || "Error al enviar correo de prueba", type: "error" });
    } finally {
      setSendingTest(false);
    }
  };

  const handleRetry = async (id: number) => {
    try {
      setRetryingId(id);
      await apiRequest(`/notifications/retry/${id}`, { method: "POST" });
      loadData();
    } catch (err: any) {
      alert("Error al reintentar: " + err.message);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. STATUS CARD & OAUTH HEALTH */}
      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-light)",
        borderRadius: "16px",
        padding: "24px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                padding: "8px",
                borderRadius: "10px",
                background: "rgba(255, 71, 87, 0.1)",
                color: "#ff4757"
              }}>
                <Mail size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: "18px", margin: 0, fontWeight: 700 }}>
                  Sistema de Correos con Gmail API & OAuth2
                </h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                  Arquitectura unificada por Roles (Clientes, Repartidores, Restaurantes) y prevención de duplicados
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: 700,
              backgroundColor: stats?.gmailConfig.isReady ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
              color: stats?.gmailConfig.isReady ? "#10b981" : "#f59e0b",
              border: stats?.gmailConfig.isReady ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)"
            }}>
              {stats?.gmailConfig.isReady ? (
                <>
                  <ShieldCheck size={16} />
                  <span>Gmail OAuth2 Activo ({stats.gmailConfig.user})</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={16} />
                  <span>Gmail OAuth2 Pendiente (Usando SMTP Fallback)</span>
                </>
              )}
            </div>

            <button
              onClick={() => setShowConfigGuide(!showConfigGuide)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border-light)",
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Info size={14} />
              <span>Instrucciones OAuth2</span>
              {showConfigGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* GUÍA DE CONFIGURACIÓN DESPLEGABLE */}
        {showConfigGuide && (
          <div style={{
            marginTop: "20px",
            padding: "20px",
            borderRadius: "12px",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#e2e8f0",
            fontSize: "13px",
            lineHeight: 1.6
          }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#38bdf8", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Info size={16} /> Lo que debes hacer tú en Google Cloud Console para activar Gmail API con OAuth2:
            </h4>
            <ol style={{ paddingLeft: "20px", margin: "0 0 16px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>
                <strong>Habilitar la Gmail API:</strong> Entra a <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>Google Cloud Console &gt; Biblioteca</a> y pulsa <strong>"Habilitar"</strong> en Gmail API.
              </li>
              <li>
                <strong>Pantalla de Consentimiento OAuth:</strong> En <em>OAuth consent screen</em>, agrega tu correo como usuario de prueba y añade el permiso/scope: <code>https://mail.google.com/</code> o <code>https://www.googleapis.com/auth/gmail.send</code>.
              </li>
              <li>
                <strong>Crear ID de Cliente OAuth:</strong> En <em>Credenciales &gt; Crear credenciales &gt; ID de cliente de OAuth</em>:
                Tipo: <strong>Aplicación web</strong>. En URIs de redireccionamiento autorizados agrega: <code>https://developers.google.com/oauthplayground</code>
              </li>
              <li>
                <strong>Generar el Refresh Token permanente:</strong>
                <br />
                - Entra a <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>Google OAuth2 Playground <ExternalLink size={12} style={{ display: "inline" }} /></a>.
                <br />
                - Arriba a la derecha pulsa el engranaje ⚙️, marca <strong>"Use your own OAuth credentials"</strong> y pega tu <strong>Client ID</strong> y <strong>Client Secret</strong>.
                <br />
                - A la izquierda en Paso 1, busca <strong>Gmail API v1</strong> y selecciona <code>https://mail.google.com/</code>.
                <br />
                - Haz clic en <strong>Authorize APIs</strong> e inicia sesión con el Gmail con el que enviarás correos.
                <br />
                - En Paso 2, haz clic en <strong>"Exchange authorization code for tokens"</strong> y copia el <strong>Refresh token</strong>.
              </li>
              <li>
                <strong>Pegar en <code>backend/.env</code>:</strong>
                <pre style={{ background: "#020617", padding: "10px 14px", borderRadius: "8px", margin: "8px 0 0 0", color: "#38bdf8" }}>
{`GMAIL_USER="tucorreo@gmail.com"
GMAIL_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GMAIL_CLIENT_SECRET="tu-client-secret"
GMAIL_REFRESH_TOKEN="tu-refresh-token"`}
                </pre>
              </li>
            </ol>
          </div>
        )}

        {/* METRICS ROW */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginTop: "20px"
        }}>
          <div style={{ padding: "16px", background: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>TOTAL CORREOS</div>
            <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px" }}>{stats?.total ?? 0}</div>
          </div>
          <div style={{ padding: "16px", background: "rgba(16, 185, 129, 0.05)", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
            <div style={{ fontSize: "12px", color: "#10b981", fontWeight: 600 }}>ENVIADOS CON ÉXITO</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>{stats?.sent ?? 0}</div>
          </div>
          <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.05)", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <div style={{ fontSize: "12px", color: "#ef4444", fontWeight: 600 }}>FALLIDOS / ERRORES</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#ef4444", marginTop: "4px" }}>{stats?.failed ?? 0}</div>
          </div>
          <div style={{ padding: "16px", background: "rgba(59, 130, 246, 0.05)", borderRadius: "12px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
            <div style={{ fontSize: "12px", color: "#3b82f6", fontWeight: 600 }}>PROTECCIÓN DUPLICADOS</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#3b82f6", marginTop: "8px" }}>Activa (EventId Lock)</div>
          </div>
        </div>
      </div>

      {/* 2. SEND TEST EMAIL FORM */}
      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-light)",
        borderRadius: "16px",
        padding: "20px 24px",
      }}>
        <h3 style={{ fontSize: "15px", margin: "0 0 14px 0", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
          <Send size={16} color="var(--accent-primary)" />
          Probar Envío en Vivo
        </h3>
        <form onSubmit={handleSendTest} style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
          <input
            type="email"
            placeholder="Introduce tu correo personal para recibir la prueba..."
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            required
            style={{
              flex: "1 1 260px",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid var(--border-light)",
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              fontSize: "13px"
            }}
          />
          <select
            value={testRole}
            onChange={(e: any) => setTestRole(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid var(--border-light)",
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              fontSize: "13px"
            }}
          >
            <option value="CUSTOMER">Plantilla: Cliente (Bienvenida)</option>
            <option value="DRIVER">Plantilla: Repartidor (Bienvenida)</option>
            <option value="RESTAURANT">Plantilla: Restaurante (Solicitud recibida)</option>
          </select>
          <button
            type="submit"
            disabled={sendingTest}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#ff4757",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "13px",
              cursor: sendingTest ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(255, 71, 87, 0.3)"
            }}
          >
            {sendingTest ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {sendingTest ? "Enviando..." : "Enviar Prueba"}
          </button>
        </form>

        {testMessage && (
          <div style={{
            marginTop: "12px",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            backgroundColor: testMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: testMessage.type === "success" ? "#10b981" : "#ef4444",
            border: testMessage.type === "success" ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)"
          }}>
            {testMessage.text}
          </div>
        )}
      </div>

      {/* 3. LOGS TABLE */}
      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-light)",
        borderRadius: "16px",
        overflow: "hidden"
      }}>
        {/* Table Filters Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-light)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 style={{ fontSize: "16px", margin: 0, fontWeight: 700 }}>Historial de Notificaciones</h3>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>({logs.length} registros)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                fontSize: "12px"
              }}
            >
              <option value="ALL">Todos los Estados</option>
              <option value="SENT">Enviados (SENT)</option>
              <option value="FAILED">Fallidos (FAILED)</option>
              <option value="SENDING">En Proceso (SENDING)</option>
            </select>

            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                placeholder="Buscar correo o asunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  width: "180px"
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Buscar
              </button>
            </form>

            <button
              onClick={loadData}
              title="Refrescar"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                cursor: "pointer"
              }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-light)" }}>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Fecha / Hora</th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Destinatario</th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Evento / Asunto</th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Plantilla</th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Estado</th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                    Cargando historial de correos...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                    No se encontraron correos registrados con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-light)", transition: "background 0.15s" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {new Date(log.createdAt).toLocaleString("es-EC", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {log.recipientEmail}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{log.subject}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>
                        {log.type} {log.eventId ? `• [${log.eventId}]` : ""}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "12px", fontFamily: "monospace" }}>
                      {log.template}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {log.status === "SENT" && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "rgba(16, 185, 129, 0.1)",
                          color: "#10b981",
                        }}>
                          <CheckCircle size={12} /> ENVIADO
                        </span>
                      )}
                      {log.status === "FAILED" && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          color: "#ef4444",
                        }} title={log.error || undefined}>
                          <XCircle size={12} /> FALLÓ
                        </span>
                      )}
                      {(log.status === "PENDING" || log.status === "SENDING") && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          color: "#3b82f6",
                        }}>
                          <Clock size={12} /> PROCESANDO
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {log.status === "FAILED" && (
                        <button
                          onClick={() => handleRetry(log.id)}
                          disabled={retryingId === log.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            cursor: retryingId === log.id ? "not-allowed" : "pointer"
                          }}
                        >
                          <RefreshCw size={10} className={retryingId === log.id ? "animate-spin" : ""} />
                          {retryingId === log.id ? "Reintentando..." : "Reintentar"}
                        </button>
                      )}
                      {log.status === "SENT" && (
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          {log.providerMessageId ? "ID: " + log.providerMessageId.substring(0, 16) + "..." : "Completado"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
