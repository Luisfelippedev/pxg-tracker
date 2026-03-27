import type { UserRole } from "@/types";

export type DecodedJwtPayload = Partial<{
  sub: string;
  email: string;
  role: UserRole;
}>;

/**
 * Decodifica o payload do JWT sem validar assinatura (apenas para UI/roteamento).
 */
export function decodeJwt(token: string): DecodedJwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(base64 + pad);
    return JSON.parse(json) as DecodedJwtPayload;
  } catch {
    return null;
  }
}

