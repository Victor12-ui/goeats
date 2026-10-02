import { signInvoiceXml } from "ec-sri-invoice-signer";

export interface SignResult {
  success: boolean;
  xmlSigned?: string;
  xmlSignedBase64?: string;
  error?: string;
}

/**
 * Wrapper para firmar documentos XML de manera nativa en Node.js
 * utilizando el certificado digital PKCS#12 (.p12) guardado en formato Base64.
 */
export function signDocument(
  xmlUnsigned: string,
  p12Base64: string,
  p12Password: string
): SignResult {
  try {
    // 1. Decodificar el certificado .p12 desde Base64 a Buffer
    // Si viene con prefijo data:..., limpiarlo
    const cleanBase64 = p12Base64.replace(/^data:.*?;base64,/, "");
    const p12Buffer = Buffer.from(cleanBase64, "base64");

    if (p12Buffer.length === 0) {
      return {
        success: false,
        error: "El certificado .p12 decodificado está vacío. Verifica que el archivo sea válido.",
      };
    }

    // 2. Realizar la firma digital XAdES-BES nativa
    const xmlSigned = signInvoiceXml(xmlUnsigned, p12Buffer, {
      pkcs12Password: p12Password,
    });

    if (!xmlSigned) {
      return {
        success: false,
        error: "La librería de firma devolvió un documento vacío sin arrojar error.",
      };
    }

    // 3. Generar la versión Base64 del XML firmado (necesaria para el Web Service de Recepción)
    const xmlSignedBase64 = Buffer.from(xmlSigned, "utf-8").toString("base64");

    return {
      success: true,
      xmlSigned,
      xmlSignedBase64,
    };
  } catch (error: any) {
    console.error("Error en signDocument:", error);
    return {
      success: false,
      error: `Fallo al firmar el XML con el certificado .p12: ${error.message || error}`,
    };
  }
}

export async function signXml(
  xmlUnsigned: string,
  p12Base64: string,
  p12Password: string
): Promise<string> {
  const result = signDocument(xmlUnsigned, p12Base64, p12Password);
  if (!result.success || !result.xmlSigned) {
    throw new Error(result.error || "Firma fallida");
  }
  return result.xmlSigned;
}
