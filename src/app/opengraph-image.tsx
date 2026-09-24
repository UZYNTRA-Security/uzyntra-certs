import { ImageResponse } from "next/og";
export const alt = "UZYNTRA Certs — Public credential verification";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 90, background: "#080e15", color: "#f3f7fb", fontFamily: "sans-serif" }}><div style={{ color: "#4adeb5", fontSize: 28, letterSpacing: 6 }}>UZYNTRA SECURITY</div><div style={{ fontSize: 88, marginTop: 28 }}>UZYNTRA Certs</div><div style={{ fontSize: 36, color: "#a6b1c0", marginTop: 20 }}>Public credential verification</div><div style={{ fontSize: 24, color: "#4adeb5", marginTop: 60 }}>certs.uzyntra.com</div></div>, size);
}
