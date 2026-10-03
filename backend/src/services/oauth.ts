import { env } from "../config/env";

export interface VerifiedSocialProfile {
  email: string;
  name: string;
  avatar?: string;
  provider: "google" | "facebook";
  providerId: string;
}

/**
 * Valida de forma estricta un Google ID Token (JWT emitido y firmado por Google).
 * Principio ético y de seguridad:
 * 1. Verifica la firma contra los certificados públicos de Google (oauth2.googleapis.com).
 * 2. Verifica que el correo esté validado por Google (email_verified === true).
 * 3. Si GOOGLE_CLIENT_ID está configurado, comprueba que la audiencia (aud) corresponda a nuestra app.
 */
export async function verifyGoogleToken(idToken: string): Promise<VerifiedSocialProfile> {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Token de Google no proporcionado o formato inválido.");
  }

  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({}))) as any;
      throw new Error(errorData.error_description || "Token de Google inválido, expirado o manipulado.");
    }

    const payload = (await res.json()) as any;

    if (!payload.email) {
      throw new Error("El token de Google no contiene una dirección de correo válida.");
    }

    // Regla de seguridad: el correo debe haber sido verificado por Google
    const isEmailVerified = payload.email_verified === true || payload.email_verified === "true";
    if (!isEmailVerified) {
      throw new Error("La cuenta de Google no tiene el correo electrónico verificado.");
    }

    // Regla de seguridad: verificar audiencia si el Client ID está configurado
    if (env.GOOGLE_CLIENT_ID && payload.aud && payload.aud !== env.GOOGLE_CLIENT_ID) {
      throw new Error("El token de Google no fue emitido para este cliente (audiencia no coincide).");
    }

    const name = payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim() || payload.email.split("@")[0];

    return {
      email: payload.email.toLowerCase().trim(),
      name,
      avatar: payload.picture || undefined,
      provider: "google",
      providerId: payload.sub,
    };
  } catch (error: any) {
    console.error("Fallo de seguridad en verificación de Google:", error.message);
    throw new Error(error.message || "Error al verificar credenciales con Google.");
  }
}

/**
 * Valida de forma estricta un User Access Token de Facebook con Meta Graph API.
 * Principio ético y de seguridad:
 * 1. Consulta la Graph API de Meta en vivo con el token.
 * 2. Si FACEBOOK_APP_ID y SECRET están configurados, inspecciona debug_token para validar que la app origen sea la nuestra.
 * 3. Extrae nombre, correo y foto directamente de la respuesta autenticada de Meta.
 */
export async function verifyFacebookToken(accessToken: string): Promise<VerifiedSocialProfile> {
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Token de acceso de Facebook no proporcionado o formato inválido.");
  }

  try {
    // 1. Opcional: verificación de depuración de token de aplicación
    if (env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET) {
      const appToken = `${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`;
      const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`;
      const debugRes = await fetch(debugUrl);
      if (debugRes.ok) {
        const debugData = (await debugRes.json()) as any;
        if (debugData?.data?.is_valid === false) {
          throw new Error("El token de Facebook no es válido o ha expirado.");
        }
        if (debugData?.data?.app_id && debugData.data.app_id !== env.FACEBOOK_APP_ID) {
          throw new Error("El token de Facebook fue emitido para otra aplicación.");
        }
      }
    }

    // 2. Obtener datos del perfil autenticado
    const fields = "id,name,first_name,last_name,email,picture.type(large)";
    const url = `https://graph.facebook.com/me?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({}))) as any;
      throw new Error(errorData?.error?.message || "Token de Facebook rechazado por Meta.");
    }

    const payload = (await res.json()) as any;

    if (!payload.id) {
      throw new Error("Respuesta inválida recibida desde Meta Graph API.");
    }

    // Si el usuario se registró en Facebook con solo teléfono móvil, construimos un alias seguro basado en su ID único de Meta
    const email = payload.email
      ? payload.email.toLowerCase().trim()
      : `fb_${payload.id}@facebook.goeats.app`;
    const name = payload.name || `${payload.first_name || ""} ${payload.last_name || ""}`.trim() || "Usuario Facebook";
    const avatar = payload.picture?.data?.url || undefined;

    return {
      email,
      name,
      avatar,
      provider: "facebook",
      providerId: payload.id,
    };
  } catch (error: any) {
    console.error("Fallo de seguridad en verificación de Facebook:", error.message);
    throw new Error(error.message || "Error al verificar credenciales con Facebook.");
  }
}
