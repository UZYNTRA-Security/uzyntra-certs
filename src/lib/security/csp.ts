export function contentSecurityPolicy(nonce: string, development: boolean, supabaseUrl?: string) {
  const origin = supabaseUrl ? new URL(supabaseUrl).origin : "";
  const websocketOrigin = origin.replace(/^http/, "ws");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${origin} ${websocketOrigin}${development ? " ws: http://localhost:*" : ""}`,
    `img-src 'self' data: blob: ${origin}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!development ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
