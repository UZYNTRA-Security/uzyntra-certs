export function GET() {
  // Liveness only: never expose configuration or query the database here.
  return Response.json({ status: "ok", service: "uzyntra-certs" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
