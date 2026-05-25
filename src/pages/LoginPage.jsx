import { useState } from "react";
import { signIn, signInWithGoogle } from "../services/supabaseService";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { t }                     = useTranslation();
  const [email,    setEmail]      = useState("");
  const [password, setPassword]   = useState("");
  const [error,    setError]      = useState("");
  const [loading,  setLoading]    = useState(false);
  const [gLoading, setGLoading]   = useState(false);
  const [showEmail,setShowEmail]  = useState(false); // toggle email form

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await signIn(email, password); }
    catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleGoogle() {
    setError(""); setGLoading(true);
    try { await signInWithGoogle(); }
    catch(err) { setError(err.message); setGLoading(false); }
    // Don't setGLoading(false) on success — page will redirect
  }

  return (
    <div style={{
      flex:1, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"#0d0d0d", padding:"0 28px",
      overflowY:"auto",
    }}>
      {/* Logo */}
      <div style={{marginBottom:52,textAlign:"center"}}>
        <div style={{fontSize:42,fontWeight:800,color:"#fff",letterSpacing:-1}}>
          လမ်းကြောင်း
        </div>
        <div style={{fontSize:11,color:"#444",letterSpacing:4,marginTop:6}}>
          LANN KYAING
        </div>
      </div>

      <div style={{width:"100%",maxWidth:360}}>

        {/* ── Google Sign In (primary) ── */}
        <button
          onClick={handleGoogle}
          disabled={gLoading}
          style={{
            width:"100%", padding:"14px 16px",
            border:"0.5px solid rgba(255,255,255,0.15)",
            borderRadius:14, marginBottom:12,
            background: gLoading ? "#1a1a1a" : "#fff",
            color: gLoading ? "#555" : "#111",
            fontSize:15, fontWeight:700,
            cursor: gLoading ? "not-allowed" : "pointer",
            fontFamily:"inherit",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            transition:"background 0.2s",
          }}
        >
          {gLoading ? (
            <>
              <div style={{
                width:18,height:18,border:"2px solid #555",
                borderTopColor:"#e24b4a",borderRadius:"50%",
                animation:"spin 0.8s linear infinite",flexShrink:0,
              }}/>
              Signing in...
            </>
          ) : (
            <>
              {/* Google G logo */}
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* ── Divider ── */}
        <div style={{
          display:"flex", alignItems:"center", gap:12, marginBottom:12,
        }}>
          <div style={{flex:1,height:"0.5px",background:"rgba(255,255,255,0.08)"}}/>
          <span style={{color:"#444",fontSize:12}}>or</span>
          <div style={{flex:1,height:"0.5px",background:"rgba(255,255,255,0.08)"}}/>
        </div>

        {/* ── Email/Password toggle ── */}
        {!showEmail ? (
          <button
            onClick={()=>setShowEmail(true)}
            style={{
              width:"100%", padding:"13px 16px",
              border:"0.5px solid rgba(255,255,255,0.1)",
              borderRadius:14, marginBottom:12,
              background:"transparent",
              color:"#888", fontSize:14, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit",
            }}
          >
            Sign in with Email
          </button>
        ) : (
          <form onSubmit={handleLogin}>
            <input
              type="email" placeholder={t("auth.email")}
              value={email} onChange={e=>setEmail(e.target.value)} required
              style={inputStyle}
            />
            <input
              type="password" placeholder={t("auth.password")}
              value={password} onChange={e=>setPassword(e.target.value)} required
              style={{...inputStyle, marginBottom:14}}
            />
            <button type="submit" disabled={loading} style={{
              width:"100%", padding:14, border:"none", borderRadius:14,
              background: loading ? "#444" : "#e24b4a",
              color:"#fff", fontSize:15, fontWeight:700,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily:"inherit",
              boxShadow:"0 4px 20px rgba(226,75,74,0.3)",
              marginBottom:8,
            }}>
              {loading ? "Signing in..." : t("auth.sign_in")}
            </button>
            <button
              type="button"
              onClick={()=>{ setShowEmail(false); setError(""); }}
              style={{
                width:"100%", padding:"10px", border:"none",
                background:"none", color:"#555", fontSize:12,
                cursor:"pointer", fontFamily:"inherit",
              }}
            >
              ← Back
            </button>
          </form>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop:10, padding:"10px 14px", borderRadius:10,
            background:"rgba(226,75,74,0.12)", border:"0.5px solid #e24b4a",
            color:"#e24b4a", fontSize:12, textAlign:"center",
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Contact */}
      <div style={{marginTop:44,textAlign:"center"}}>
        <div style={{color:"#333",fontSize:11,lineHeight:1.8}}>
          ပြဿနာ ရှိပါက Telegram မှ ဆက်သွယ်ပါ
        </div>
        <a href="https://t.me/dx0dev" target="_blank" rel="noreferrer"
          style={{color:"#534AB7",fontSize:12,fontWeight:700,textDecoration:"none"}}>
          @dx0dev
        </a>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const inputStyle = {
  width:"100%", background:"#1a1a1a",
  border:"0.5px solid rgba(255,255,255,0.08)",
  borderRadius:12, padding:"14px 16px",
  color:"#fff", fontSize:15, marginBottom:12,
  outline:"none", fontFamily:"inherit",
  WebkitAppearance:"none",
};
