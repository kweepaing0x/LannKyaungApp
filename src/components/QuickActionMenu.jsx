import { useAppStore } from "../store";

export default function QuickActionMenu({
  userRole,
  onSelectPin, onSelectCheck, onSelectMarket,
  onSelectShop, onSelectAdmin, onSelectOrders,
}) {
  const { showQuickMenu, setShowQuickMenu } = useAppStore();
  if (!showQuickMenu) return null;
  const close = () => setShowQuickMenu(false);

  // Build action list based on role
  const actions = [
    // Always shown
    {
      icon:"🛒", label:"စျေးမှာရန်", sublabel:"Order from market",
      color:"#a8f0c6", bg:"rgba(168,240,198,0.12)", border:"rgba(168,240,198,0.3)",
      onPress: onSelectMarket,
    },
    {
      icon:"📦", label:"Order History", sublabel:"Your past orders",
      color:"#EF9F27", bg:"rgba(239,159,39,0.12)", border:"rgba(239,159,39,0.3)",
      onPress: onSelectOrders,
    },
    {
      icon:"📍", label:"Update Pin", sublabel:"Report road situation",
      color:"#e24b4a", bg:"rgba(226,75,74,0.12)", border:"rgba(226,75,74,0.3)",
      onPress: onSelectPin,
    },
    {
      icon:"🔍", label:"Check Request", sublabel:"Ask nearby checkers",
      color:"#4a9eff", bg:"rgba(74,158,255,0.12)", border:"rgba(74,158,255,0.3)",
      onPress: onSelectCheck,
    },
    // Shop owner only
    ...(userRole==="shop_owner" ? [{
      icon:"🏪", label:"Manage My Shop", sublabel:"Edit business profile",
      color:"#CECBF6", bg:"rgba(83,74,183,0.12)", border:"rgba(83,74,183,0.3)",
      onPress: onSelectShop,
    }] : []),
    // Normal user — show add shop prompt
    ...(userRole==="normal" || !userRole ? [{
      icon:"➕", label:"Add Your Shop", sublabel:"Contact @dx0dev on Telegram",
      color:"#555", bg:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.1)",
      onPress: () => { close(); alert("To list your business, contact @dx0dev on Telegram."); },
    }] : []),
    // Admin only
    ...(userRole==="admin" ? [{
      icon:"⚙️", label:"Admin Panel", sublabel:"Manage orders & products",
      color:"#EF9F27", bg:"rgba(239,159,39,0.12)", border:"rgba(239,159,39,0.3)",
      onPress: onSelectAdmin,
    }] : []),
  ];

  return (
    <>
      {/* Backdrop — high z-index */}
      <div
        onClick={close}
        style={{
          position:"fixed", inset:0,
          background:"rgba(0,0,0,0.6)",
          zIndex:1000,
        }}
      />

      {/* Vertical stack above + button */}
      <div style={{
        position:"fixed",
        bottom:"calc(72px + env(safe-area-inset-bottom,0px))",
        left:"50%",
        transform:"translateX(-50%)",
        zIndex:1001,
        display:"flex",
        flexDirection:"column",
        gap:8,
        alignItems:"center",
        pointerEvents:"all",
      }}>
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => { close(); a.onPress(); }}
            style={{
              display:"flex",
              alignItems:"center",
              gap:14,
              padding:"11px 18px",
              borderRadius:16,
              border:`0.5px solid ${a.border}`,
              background:"rgba(18,18,18,0.98)",
              cursor:"pointer",
              fontFamily:"inherit",
              width:230,
              backdropFilter:"blur(20px)",
              WebkitBackdropFilter:"blur(20px)",
              boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
              animation:`slideUp 0.12s ease ${i*0.04}s both`,
            }}
          >
            <div style={{
              width:38, height:38, borderRadius:11,
              background:a.bg,
              border:`0.5px solid ${a.border}`,
              display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:18, flexShrink:0,
            }}>
              {a.icon}
            </div>
            <div style={{textAlign:"left"}}>
              <div style={{color:"#fff", fontSize:13, fontWeight:700}}>{a.label}</div>
              <div style={{color:"#555", fontSize:10, marginTop:1}}>{a.sublabel}</div>
            </div>
          </button>
        ))}

        {/* Arrow */}
        <div style={{
          width:0, height:0,
          borderLeft:"8px solid transparent",
          borderRight:"8px solid transparent",
          borderTop:"8px solid rgba(18,18,18,0.98)",
          marginTop:-2,
        }}/>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </>
  );
}
