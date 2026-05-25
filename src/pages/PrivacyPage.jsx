import { useTranslation } from "react-i18next";

export default function PrivacyPage({ onBack }) {
  const { t } = useTranslation();

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "#0d0d0d",
      color: "#fff",
      height: "100vh",
      overflowY: "auto",
      paddingBottom: "env(safe-area-inset-bottom, 20px)"
    }}>
      {/* Header Sticky Bar */}
      <header style={{
        position: "sticky",
        top: 0,
        background: "#0d0d0d",
        borderBottom: "0.5px solid rgba(255,255,255,0.08)",
        height: 60,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        zIndex: 10,
        gap: 16
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            marginLeft: -8
          }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 24 }} />
          </button>
        )}
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          Privacy Policy
        </h1>
      </header>

      {/* Main Content Body */}
      <div style={{
        padding: "24px 20px",
        lineHeight: "1.6",
        fontSize: "14px",
        color: "rgba(255,255,255,0.75)"
      }}>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
          Last Updated: May 25, 2026
        </p>

        <p>
          This Privacy Policy describes how <strong>Lann Kyaung</strong> ("we", "our", or "us") collects, uses, and protects your information when you use our mobile application. By using the app, you agree to the terms outlined here.
        </p>

        <hr style={{ border: "none", borderTop: "0.5px solid rgba(255,255,255,0.08)", margin: "24px 0" }} />

        {/* Section 1 */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span>1.</span> Information Collection & Use
          </h2>
          
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#e24b4a", margin: "12px 0 6px 0" }}>A. Personal Data</h3>
          <p style={{ margin: 0 }}>
            When logging in via Google Authentication, we securely process your email address, full name, and avatar profile picture via <strong>Supabase Auth</strong>. This data is utilized solely to maintain your unique profile state, sync your transaction records, and preserve active wallet ledger credit balances safely.
          </p>

          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#e24b4a", margin: "16px 0 6px 0" }}>B. High-Accuracy Location Metrics</h3>
          <p style={{ margin: 0 }}>
            To deliver primary app features—specifically mapping real-time situation pins, calculating geographical distances, and processing proximity radius searches—this application requires access to your device’s hardware GPS engine (<code>ACCESS_FINE_LOCATION</code>). This location parsing happens while the app is actively running.
          </p>

          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#e24b4a", margin: "16px 0 6px 0" }}>C. Media Hardware Access</h3>
          <p style={{ margin: 0 }}>
            The app requests <code>CAMERA</code> and image gallery read permissions. These configurations are used exclusively when you choose to capture or attach a live photo validation asset while submitting a situational layout report pin.
          </p>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            <span>2.</span> Third-Party Infrastructure Integrations
          </h2>
          <p>
            We deploy secure third-party architecture components to streamline computing resources, security handshakes, and monetization elements:
          </p>
          <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <li><strong>Supabase:</strong> Manages database storage operations, session handling, and Row-Level Security (RLS) enforcement protocols.</li>
            <li><strong>Google OAuth Client:</strong> Facilitates seamless, passwordless user access. We do not handle, store, or see your Google account password.</li>
            <li><strong>Google AdMob:</strong> Serves contextual advertising frameworks to offset cloud database operating expenses. AdMob tracking tags process anonymized device keys to handle interstitial ad-delivery events securely.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            <span>3.</span> Data Retention & Lifespan Rules
          </h2>
          <p style={{ margin: 0 }}>
            Publicly posted mapping pins are structurally temporary and clear from live client views automatically based on systemic decay intervals set by management settings (e.g., 24 hours). User account records persist securely until an explicit purging request is initiated.
          </p>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            <span>4.</span> Account & Data Purge Requests
          </h2>
          <p style={{ margin: 0 }}>
            You maintain full rights over your data identity. If you choose to remove your profile, erase balance histories, or delete your user record data cleanly from our active tables, you can request an immediate manual purge by messaging our core administration node on Telegram directly at <a href="https://t.me/dx0dev" target="_blank" rel="noreferrer" style={{ color: "#ff6b35", textDecoration: "none", fontWeight: "bold" }}>@dx0dev</a>.
          </p>
        </section>

        {/* Footer Brand Node */}
        <div style={{
          marginTop: 40,
          textAlign: "center",
          background: "#1a1a1a",
          borderRadius: 12,
          padding: 20,
          border: "0.5px solid rgba(255,255,255,0.05)"
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>လမ်းကြောင်း</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>Secure & Transparent Mapping Infrastructure</div>
        </div>
      </div>
    </div>
  );
}
