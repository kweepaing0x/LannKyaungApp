import { useAppStore } from "../store";

export default function QuickActionMenu({ onSelectPin, onSelectCheck, onSelectMarket }) {
  const { showQuickMenu, setShowQuickMenu } = useAppStore();

  if (!showQuickMenu) return null;

  const close = () => setShowQuickMenu(false);

  const actions = [
    {
      icon: "🔍",
      label: "Check Request",
      sublabel: "Ask nearby checkers",
      color: "#4a9eff",
      bg: "rgba(74,158,255,0.12)",
      border: "rgba(74,158,255,0.25)",
      onPress: () => { close(); onSelectCheck(); },
    },
    {
      icon: "📍",
      label: "Update Pin",
      sublabel: "Report road situation",
      color: "#e24b4a",
      bg: "rgba(226,75,74,0.12)",
      border: "rgba(226,75,74,0.25)",
      onPress: () => { close(); onSelectPin(); },
    },
    {
      icon: "🛒",
      label: "စျေးမှာရန်",
      sublabel: "Order from market",
      color: "#a8f0c6",
      bg: "rgba(168,240,198,0.12)",
      border: "rgba(168,240,198,0.25)",
      onPress: () => { close(); onSelectMarket(); },
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 100,
        }}
      />

      {/* Vertical stack — positioned above the + button */}
      <div style={{
        position: "fixed",
        bottom: "calc(70px + env(safe-area-inset-bottom,0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 101,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "center",
      }}>

        {actions.map((a, i) => (
          <button
            key={i}
            onClick={a.onPress}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 20px",
              borderRadius: 16,
              border: `0.5px solid ${a.border}`,
              background: `rgba(20,20,20,0.97)`,
              cursor: "pointer",
              fontFamily: "inherit",
              minWidth: 200,
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
              animation: `slideUp 0.15s ease ${i * 0.05}s both`,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: a.bg,
              border: `0.5px solid ${a.border}`,
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 20, flexShrink: 0,
            }}>
              {a.icon}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{a.label}</div>
              <div style={{ color: "#555", fontSize: 11, marginTop: 1 }}>{a.sublabel}</div>
            </div>
          </button>
        ))}

        {/* Arrow pointing down to + button */}
        <div style={{
          width: 0, height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "8px solid rgba(20,20,20,0.97)",
          marginTop: -4,
        }}/>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
