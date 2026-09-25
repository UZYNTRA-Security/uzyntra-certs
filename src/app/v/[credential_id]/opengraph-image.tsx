import { ImageResponse } from "next/og";
import { credentialIdSchema } from "@/lib/verification/schema";
import { verifyCredential } from "@/lib/verification/service";

export const runtime = "nodejs";
export const alt = "UZYNTRA Certs verified credential preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ credential_id: string }> };

export default async function CredentialOpenGraphImage({ params }: Props) {
  const parsed = credentialIdSchema.safeParse((await params).credential_id);
  const result = parsed.success ? await verifyCredential(parsed.data) : { outcome: "not_found" as const };
  const credential = result.outcome === "found" ? result.credential : null;
  const recipient = credential?.holder_name ?? "UZYNTRA Credential";
  const title = credential?.title ?? "Verified Digital Credential";
  const issuer = credential?.issuer ?? "UZYNTRA Security";
  const status = credential?.status ?? "VERIFICATION";
  const badge = credential?.badges[0]?.name ?? "Digital Credential Verification";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background: "linear-gradient(135deg, #050a10 0%, #08111b 54%, #0c1a16 100%)",
          color: "#f7fafc",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: 54,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
            border: "2px solid rgba(104, 224, 157, 0.9)",
            boxShadow: "0 0 0 1px rgba(104, 224, 157, 0.25) inset",
            padding: 52,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  display: "flex",
                  height: 72,
                  width: 72,
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #68e09d",
                  borderRadius: 18,
                  color: "#68e09d",
                  fontSize: 34,
                  fontWeight: 900,
                }}
              >
                U
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ color: "#68e09d", fontSize: 28, fontWeight: 800, letterSpacing: 1.2 }}>UZYNTRA CERTS</div>
                <div style={{ color: "#b8c3d1", fontSize: 18, marginTop: 5 }}>Verified by UZYNTRA Security</div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(104, 224, 157, 0.55)",
                borderRadius: 999,
                color: "#68e09d",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 2,
                padding: "12px 20px",
              }}
            >
              {status}
            </div>
          </div>

          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 48 }}>
            <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
              <div style={{ color: "#aeb8c6", fontSize: 28, marginBottom: 12 }}>Credential earned by</div>
              <div style={{ color: "#ffffff", fontSize: 62, fontWeight: 900, lineHeight: 1.05 }}>{recipient}</div>
              <div style={{ color: "#aeb8c6", fontSize: 28, marginTop: 34 }}>earned</div>
              <div style={{ color: "#68e09d", fontSize: 48, fontWeight: 900, lineHeight: 1.12, marginTop: 12 }}>{title}</div>
              <div style={{ color: "#d8dee8", fontSize: 24, marginTop: 30 }}>Verified by {issuer}</div>
            </div>

            <div
              style={{
                display: "flex",
                width: 250,
                height: 250,
                borderRadius: 36,
                border: "2px solid rgba(104, 224, 157, 0.75)",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                background: "rgba(104, 224, 157, 0.06)",
              }}
            >
              <div style={{ color: "#68e09d", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>VERIFIED</div>
              <div style={{ color: "#ffffff", fontSize: 84, fontWeight: 900, lineHeight: 1, marginTop: 8 }}>✓</div>
              <div style={{ color: "#aeb8c6", fontSize: 18, marginTop: 16, textAlign: "center", padding: "0 18px" }}>{badge}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#7f8b9b", fontSize: 18 }}>
            <div>certs.uzyntra.com</div>
            <div>Public credential verification</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
