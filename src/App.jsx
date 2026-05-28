import { useEffect, useState } from "react";
import { useAppStore } from "./store";
import { onAuthChange, getUserDoc, getAdminConfig, getSituationTypes } from "./services/supabaseService";
import { isConfigured, supabase } from "./supabase";
import { useTranslation } from "react-i18next";
import LoginPage         from "./pages/LoginPage";
import MapPage           from "./pages/MapPage";
import ProfilePage       from "./pages/ProfilePage";
import BusinessDashboard from "./pages/BusinessDashboard";
import MarketPage        from "./pages/MarketPage";
import CheckoutPage      from "./pages/CheckoutPage";
import OrderHistory      from "./pages/OrderHistory";
import AdminPanel        from "./pages/AdminPanel";
import PlusModal         from "./components/PlusModal";
import QuickActionMenu   from "./components/QuickActionMenu";

import { App as CapacitorApp } from "@capacitor/app";
import { AdMob, InterstitialAdPluginEvents } from "@capacitor-community/admob";

// Tabs that hide the nav bar and have their own back button
const FULLSCREEN_TABS = ["market","checkout","orders","admin","business"];

export default function App() {
  const { t } = useTranslation();
  const {
    user, setUser, setUserDoc, setAdminConfig, setSituationTypes,
    activeTab, setActiveTab,
    showPlusModal, setShowPlusModal,
    showQuickMenu, setShowQuickMenu,
  } = useAppStore();

  const userRole = useAppStore(s => s.userDoc?.role);
  const [ready, setReady] = useState(false);

  // ── Deep link ─────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured) return;
    CapacitorApp.addListener("appUrlOpen", async (event) => {
      try {
        const url  = new URL(event.url);
        const hash = url.hash;
        if (hash) {
          const params      = new URLSearchParams(hash.replace("#","?"));
          const accessToken  = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            setReady(false);
            const { error } = await supabase.auth.setSession({ access_token:accessToken, refresh_token:refreshToken });
            if (error) { console.error("Deep link error:", error.message); setReady(true); }
          }
        }
      } catch(err) { console.error("Deep link:", err); setReady(true); }
    });
    return () => { CapacitorApp.removeAllListeners(); };
  }, []);

  // ── AdMob ─────────────────────────────────────────────────
  useEffect(() => {
    AdMob.initialize().catch(e => console.error("AdMob:", e));
    const l = AdMob.addListener(InterstitialAdPluginEvents.Closed, preloadAd);
    preloadAd();
    return () => l.remove();
  }, []);

  const preloadAd = async () => {
    try { await AdMob.prepareInterstitial({ adId:"ca-app-pub-4379269817546913/1770419841", isTesting:true }); }
    catch(e) {}
  };

  const showAdThenOpenPin = async () => {
    setShowQuickMenu(false);
    setActiveTab("map");
    setShowPlusModal(true);
    try { await AdMob.showInterstitial(); } catch(e) {}
  };

  // ── Auth ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured) { setReady(true); return; }
    const t = setTimeout(() => setReady(true), 8000);
    const unsub = onAuthChange(async (u) => {
      clearTimeout(t);
      setUser(u);
      if (u) {
        try {
          const [uDoc, cfg, types] = await Promise.all([
            getUserDoc(u.id), getAdminConfig(), getSituationTypes()
          ]);
          setUserDoc(uDoc);
          setAdminConfig(cfg);
          if (types?.length) setSituationTypes(types);
        } catch(e) { console.warn("load user:", e.message); }
      }
      setReady(true);
    });
    return () => { clearTimeout(t); unsub(); };
  }, []);

  if (!isConfigured) return <SetupScreen/>;
  if (!ready)        return <Spinner/>;
  if (!user)         return <LoginPage/>;

  const isFullscreen = FULLSCREEN_TABS.includes(activeTab);

  return (
    <>
      <div style={{ flex:1, overflow:"hidden", position:"relative", minHeight:0 }}>
        {activeTab==="map"      && <MapPage/>}
        {activeTab==="profile"  && <ProfilePage/>}
        {activeTab==="business" && <BusinessDashboard/>}
        {activeTab==="market"   && <MarketPage/>}
        {activeTab==="checkout" && <CheckoutPage/>}
        {activeTab==="orders"   && <OrderHistory/>}
        {activeTab==="admin"    && <AdminPanel/>}
      </div>

      {/* Nav bar — hidden on fullscreen tabs */}
      {!isFullscreen && (
        <nav style={{
          flexShrink:0, height:60,
          paddingBottom:"env(safe-area-inset-bottom,0px)",
          background:"#0d0d0d",
          borderTop:"0.5px solid rgba(255,255,255,0.08)",
          display:"flex", alignItems:"center", zIndex:20,
        }}>
          <TabBtn active={activeTab==="map"} icon="ti-map-pin"
            label={t("tabs.checkpoints")} onClick={()=>setActiveTab("map")}/>

          {/* + button — opens quick action menu */}
          <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              style={{
                width:54, height:54, borderRadius:"50%",
                background: showQuickMenu
                  ? "linear-gradient(135deg,#534AB7,#7c6fff)"
                  : "linear-gradient(135deg,#e24b4a,#ff6b35)",
                border:"3px solid #0d0d0d",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", marginTop:-20,
                boxShadow: showQuickMenu
                  ? "0 4px 18px rgba(83,74,183,0.6)"
                  : "0 4px 18px rgba(226,75,74,0.5)",
                transition:"all 0.2s ease",
              }}>
              <i className={`ti ${showQuickMenu?"ti-x":"ti-plus"}`}
                style={{ fontSize:28, color:"#fff" }} aria-hidden="true"/>
            </button>
          </div>

          <TabBtn active={activeTab==="profile"} icon="ti-user-circle"
            label={t("tabs.profile")} onClick={()=>setActiveTab("profile")}/>
        </nav>
      )}

      {/* Quick action menu */}
      <QuickActionMenu
        userRole={userRole}
        onSelectPin={showAdThenOpenPin}
        onSelectCheck={() => {
          setShowQuickMenu(false);
          setActiveTab("map");
          setShowPlusModal(true);
        }}
        onSelectMarket={() => {
          setShowQuickMenu(false);
          setActiveTab("market");
        }}
        onSelectShop={() => {
          setShowQuickMenu(false);
          setActiveTab("business");
        }}
        onSelectAdmin={() => {
          setShowQuickMenu(false);
          setActiveTab("admin");
        }}
        onSelectOrders={() => {
          setShowQuickMenu(false);
          setActiveTab("orders");
        }}
      />

      {showPlusModal && <PlusModal onClose={()=>setShowPlusModal(false)}/>}
    </>
  );
}

function TabBtn({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex:1, display:"flex", flexDirection:"column", alignItems:"center",
      gap:3, padding:"6px 0", background:"none", border:"none",
      cursor:"pointer", opacity:active?1:0.38,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize:22, color:"#fff" }} aria-hidden="true"/>
      <span style={{ fontSize:9, fontWeight:700, color:"#fff", letterSpacing:.5 }}>
        {label.toUpperCase()}
      </span>
    </button>
  );
}

function Spinner() {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", background:"#0d0d0d", gap:14 }}>
      <div style={{ fontSize:32, fontWeight:800, color:"#fff" }}>လမ်းကြောင်း</div>
      <div style={{ width:28, height:28, border:"3px solid #222",
        borderTopColor:"#e24b4a", borderRadius:"50%",
        animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function SetupScreen() {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", background:"#0d0d0d", padding:28, textAlign:"center", gap:16 }}>
      <div style={{ fontSize:36, fontWeight:800, color:"#fff" }}>လမ်းကြောင်း</div>
      <div style={{ background:"#1a1a1a", borderRadius:14, padding:20,
        border:"0.5px solid rgba(255,165,0,0.4)", maxWidth:340, width:"100%" }}>
        <div style={{ color:"#EF9F27", fontWeight:700, fontSize:14, marginBottom:10 }}>⚙️ Setup Required</div>
        <div style={{ background:"#0d0d0d", borderRadius:10, padding:14, textAlign:"left",
          fontFamily:"monospace", fontSize:11, color:"#4a9eff", lineHeight:2, border:"0.5px solid #222" }}>
          <div style={{ color:"#555", marginBottom:4 }}># create .env in project root</div>
          <div>VITE_SUPABASE_URL=https://xxx.supabase.co</div>
          <div>VITE_SUPABASE_ANON=eyJhbGci...</div>
          <div style={{ marginTop:8 }}>VITE_TELEGRAM_BOT_TOKEN=xxx</div>
          <div>VITE_TELEGRAM_CHAT_ID=xxx</div>
        </div>
      </div>
    </div>
  );
}
