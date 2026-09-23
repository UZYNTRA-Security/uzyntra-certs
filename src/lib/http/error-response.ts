import "server-only";
import { NextResponse } from "next/server";
import { toPublicError } from "@/lib/errors";

export function errorResponse(error: unknown) {
  const requestId = crypto.randomUUID();
  const { status, code, message } = toPublicError(error);
  // Deliberately omit raw errors, tokens, URLs, and user data from logs.
  console.error(JSON.stringify({ event: "request_failed", requestId, code, status }));
  return NextResponse.json({ error: { code, message, requestId } }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
  });
}
