import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import {
  fetchMyBusiness, createBusiness, updateBusiness,
  uploadBusinessCover, uploadBusinessMedia, deleteBusinessMedia,
  getBusinessCategories, updateBusinessLocation,
} from "../services/supabaseService";

const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_LABELS = { mon:"Monday",tue:"Tuesday",wed:"Wednesday",
  thu:"Thursday",fri:"Friday",sat:"Saturday",sun:"Sunday" };

const DEFAULT_HOURS = Object.fromEntries(
  DAYS.map(d => [d, { open:"09:00", close:"18:00", closed: d==="sun" }])
);

// ── Time picker row ───────────────────────────────────────────
function HourRow({ day, val, onChange }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,
      padding:"10px 0",borderBottom:"0.5px solid rgba(255,255,255,0.05)"}}>
      <span style={{color:"#888",fontSize:12,width:80,flexShrink:0}}>{DAY_LABELS[day]}</span>
      {val.closed ? (
        <span style={{color:"#e24b4a",fontSize:12,flex:1}}>Closed</span>
      ) : (
        <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
          <input type="time" value={val.open}
            onChange={e=>onChange({...val,open:e.target.value})}
            style={{background:"#111",border:"0.5px solid #333",borderRadius:6,
              color:"#fff",fontSize:12,padding:"4px 8px",fontFamily:"inherit"}}/>
          <span style={{color:"#444",fontSize:11}}>–</span>
          <input type="time" value={val.close}
            onChange={e=>onChange({...val,close:e.target.value})}
            style={{background:"#111",border:"0.5px solid #333",borderRadius:6,
              color:"#fff",fontSize:12,padding:"4px 8px",fontFamily:"inherit"}}/>
        </div>
      )}
      <button onClick={()=>onChange({...val,closed:!val.closed})} style={{
        background:val.closed?"rgba(168,240,198,0.1)":"rgba(226,75,74,0.1)",
        border:`0.5px solid ${val.closed?"rgba(168,240,198,0.3)":"rgba(226,75,74,0.3)"}`,
        borderRadius:6,padding:"4px 8px",cursor:"pointer",
        color:val.closed?"#a8f0c6":"#e24b4a",fontSize:10,fontWeight:700,fontFamily:"inherit"}}>
        {val.closed?"Open":"Close"}
      </button>
    </div>
  );
}

export default function BusinessDashboard() {
  const { user, userDoc, adminConfig } = useAppStore();
  const [biz,        setBiz]        = useState(null);
  const [cats,       setCats]        = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [tab,        setTab]        = useState("info"); // info | hours | media | location
  const [status,     setStatus]     = useState(null);
  const coverRef = useRef();
  const mediaRef = useRef();

  const maxMedia = adminConfig?.business_max_media ?? 10;

  // Form state
  const [form, setForm] = useState({
    name:"", category_id:"", description:"", phone:"", email:"", address:"",
    lat:"", lng:"", opening_hours: DEFAULT_HOURS,
  });

  useEffect(()=>{
    Promise.all([
      fetchMyBusiness(user?.id),
      getBusinessCategories(),
    ]).then(([b,c])=>{
      setCats(c||[]);
      if(b){
        setBiz(b);
        setForm({
          name:         b.name||"",
          category_id:  b.category_id||"",
          description:  b.description||"",
          phone:        b.phone||"",
          email:        b.email||"",
          address:      b.address||"",
          lat:          b.lat||"",
          lng:          b.lng||"",
          opening_hours: b.opening_hours||DEFAULT_HOURS,
        });
      }
      setLoading(false);
    });
  },[user?.id]);

  async function handleSave() {
    if(!form.name.trim()) return alert("Business name is required");
    if(!form.category_id) return alert("Please select a category");
    if(!form.lat||!form.lng) return alert("Please set your business location");
    setSaving(true);
    try {
      if(biz) {
        await updateBusiness(biz.id, {
          name:          form.name,
          category_id:   form.category_id,
          description:   form.description||null,
          phone:         form.phone||null,
          email:         form.email||null,
          address:       form.address||null,
          opening_hours: form.opening_hours,
        });
        setStatus("✓ Saved successfully");
      } else {
        const newBiz = await createBusiness({
          ownerUid:    user.id,
          categoryId:  form.category_id,
          name:        form.name,
          description: form.description||null,
          phone:       form.phone||null,
          email:       form.email||null,
          address:     form.address||null,
          lat:         form.lat,
          lng:         form.lng,
        });
        // Save hours separately
        await updateBusiness(newBiz.id, { opening_hours: form.opening_hours });
        setBiz(newBiz);
        setStatus("✓ Business created! Waiting for admin approval.");
      }
    } catch(e) {
      setStatus("Error: " + e.message);
    } finally {
      setSaving(false);
      setTimeout(()=>setStatus(null), 4000);
    }
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if(!file||!biz) return;
    setSaving(true);
    try {
      await uploadBusinessCover(file, biz.id);
      const fresh = await fetchMyBusiness(user.id);
      setBiz(fresh);
      setStatus("✓ Cover photo updated");
    } catch(err) { setStatus("Error: "+err.message); }
    finally { setSaving(false); setTimeout(()=>setStatus(null),3000); }
  }

  async function handleMediaUpload(e) {
    const files = Array.from(e.target.files||[]);
    if(!files.length||!biz) return;
    const current = biz.business_media?.length||0;
    if(current + files.length > maxMedia) {
      return alert(`Max ${maxMedia} media items allowed. You have ${current}, trying to add ${files.length}.`);
    }
    setSaving(true);
    try {
      for(const file of files) {
        const type = file.type.startsWith("video") ? "video" : "photo";
        await uploadBusinessMedia(file, biz.id, type);
      }
      const fresh = await fetchMyBusiness(user.id);
      setBiz(fresh);
      setStatus(`✓ ${files.length} file(s) uploaded`);
    } catch(err) { setStatus("Error: "+err.message); }
    finally { setSaving(false); setTimeout(()=>setStatus(null),3000); }
  }

  async function handleDeleteMedia(mediaId) {
    if(!confirm("Delete this photo/video?")) return;
    try {
      await deleteBusinessMedia(mediaId);
      setBiz(b=>({...b, business_media: b.business_media.filter(m=>m.id!==mediaId)}));
    } catch(err) { alert("Error: "+err.message); }
  }

  function useCurrentLocation() {
    if(!navigator.geolocation) return alert("GPS not available");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f=>({...f, lat:pos.coords.latitude, lng:pos.coords.longitude}));
        if(biz) updateBusinessLocation(biz.id, pos.coords.latitude, pos.coords.longitude)
          .then(()=>setStatus("✓ Location updated")).catch(e=>setStatus("Error: "+e.message));
      },
      () => alert("Could not get your location")
    );
  }

  if(loading) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
      background:"#0d0d0d",color:"#555",fontSize:13}}>Loading...</div>
  );

  return (
    <div style={{flex:1,overflowY:"auto",background:"#0d0d0d",
      paddingBottom:"calc(80px + env(safe-area-inset-bottom,0px))"}}>

      {/* Header */}
      <div style={{padding:"20px 20px 0"}}>
        <div style={{color:"#fff",fontSize:18,fontWeight:700,marginBottom:4}}>
          🏪 My Business
        </div>
        {biz ? (
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{
              background: biz.is_verified?"rgba(168,240,198,0.1)":"rgba(239,159,39,0.1)",
              border:`0.5px solid ${biz.is_verified?"rgba(168,240,198,0.3)":"rgba(239,159,39,0.3)"}`,
              borderRadius:6,padding:"3px 10px",
            }}>
              <span style={{fontSize:11,fontWeight:700,
                color:biz.is_verified?"#a8f0c6":"#EF9F27"}}>
                {biz.is_verified?"✓ Verified & Live on Map":"⏳ Pending admin approval"}
              </span>
            </div>
          </div>
        ) : (
          <div style={{color:"#555",fontSize:12}}>
            Create your business listing — admin will approve before it shows on map.
          </div>
        )}
      </div>

      {/* Status message */}
      {status&&(
        <div style={{margin:"12px 20px 0",padding:"10px 14px",borderRadius:10,
          background:status.startsWith("Error")?"rgba(226,75,74,0.1)":"rgba(168,240,198,0.1)",
          border:`0.5px solid ${status.startsWith("Error")?"rgba(226,75,74,0.3)":"rgba(168,240,198,0.3)"}`,
          color:status.startsWith("Error")?"#e24b4a":"#a8f0c6",fontSize:12,fontWeight:600}}>
          {status}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:4,padding:"16px 20px 0",overflowX:"auto"}}>
        {["info","hours","media","location"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"7px 14px",borderRadius:20,border:"none",cursor:"pointer",
            background:tab===t?"#534AB7":"rgba(255,255,255,0.06)",
            color:tab===t?"#fff":"#666",fontSize:11,fontWeight:700,
            fontFamily:"inherit",whiteSpace:"nowrap",
          }}>
            {t==="info"?"📋 Info":t==="hours"?"🕐 Hours":t==="media"?"📷 Media":"📍 Location"}
          </button>
        ))}
      </div>

      <div style={{padding:"16px 20px"}}>

        {/* ── INFO TAB ── */}
        {tab==="info"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Cover photo */}
            <div>
              <div style={{color:"#555",fontSize:11,fontWeight:600,marginBottom:8}}>COVER PHOTO</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:72,height:72,borderRadius:12,overflow:"hidden",
                  background:"#111",border:"0.5px solid rgba(255,255,255,0.08)",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>
                  {biz?.cover_url
                    ? <img src={biz.cover_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : "🏪"}
                </div>
                <div>
                  <button onClick={()=>coverRef.current?.click()} disabled={!biz||saving}
                    style={{display:"block",padding:"9px 16px",borderRadius:9,border:"none",
                    background:"#534AB7",color:"#fff",fontSize:12,fontWeight:600,
                    cursor:!biz?"not-allowed":"pointer",fontFamily:"inherit",marginBottom:6,
                    opacity:!biz?0.4:1}}>
                    {saving?"Uploading...":"Upload Cover Photo"}
                  </button>
                  {!biz&&<div style={{color:"#444",fontSize:10}}>Save basic info first</div>}
                </div>
              </div>
              <input ref={coverRef} type="file" accept="image/*" style={{display:"none"}}
                onChange={handleCoverUpload}/>
            </div>

            <div style={{height:"0.5px",background:"rgba(255,255,255,0.06)"}}/>

            {[
              {label:"Business Name *", key:"name", placeholder:"e.g. မြဝတီဆိုင်"},
              {label:"Phone", key:"phone", placeholder:"+95 9..."},
              {label:"Email", key:"email", placeholder:"shop@example.com"},
              {label:"Address", key:"address", placeholder:"Street, Township, City"},
            ].map(({label,key,placeholder})=>(
              <div key={key}>
                <div style={{color:"#555",fontSize:11,fontWeight:600,marginBottom:6}}>{label.toUpperCase()}</div>
                <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                  placeholder={placeholder}
                  style={{width:"100%",background:"#111",border:"0.5px solid #2a2a2a",
                    borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:13,
                    fontFamily:"inherit",outline:"none"}}/>
              </div>
            ))}

            {/* Category */}
            <div>
              <div style={{color:"#555",fontSize:11,fontWeight:600,marginBottom:6}}>CATEGORY *</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {cats.map(c=>(
                  <button key={c.id} onClick={()=>setForm(f=>({...f,category_id:c.id}))}
                    style={{padding:"8px 14px",borderRadius:20,border:"none",cursor:"pointer",
                    background:form.category_id===c.id?"#534AB7":"rgba(255,255,255,0.06)",
                    color:form.category_id===c.id?"#fff":"#888",
                    fontSize:12,fontFamily:"inherit"}}>
                    {c.emoji} {c.name_en}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <div style={{color:"#555",fontSize:11,fontWeight:600,marginBottom:6}}>DESCRIPTION</div>
              <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                placeholder="Tell customers about your business..."
                rows={3}
                style={{width:"100%",background:"#111",border:"0.5px solid #2a2a2a",
                  borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:13,
                  fontFamily:"inherit",outline:"none",resize:"vertical"}}/>
            </div>

            <button onClick={handleSave} disabled={saving} style={{
              width:"100%",padding:"14px",borderRadius:12,border:"none",
              background:saving?"#333":"#534AB7",color:"#fff",fontSize:14,fontWeight:700,
              cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",
              boxShadow:"0 4px 14px rgba(83,74,183,0.4)"}}>
              {saving?"Saving...":biz?"Save Changes":"Create Business Listing"}
            </button>
          </div>
        )}

        {/* ── HOURS TAB ── */}
        {tab==="hours"&&(
          <div>
            <div style={{color:"#555",fontSize:11,fontWeight:600,marginBottom:12}}>
              SET YOUR OPENING HOURS
            </div>
            {DAYS.map(day=>(
              <HourRow key={day} day={day} val={form.opening_hours[day]||{open:"09:00",close:"18:00",closed:false}}
                onChange={v=>setForm(f=>({...f,opening_hours:{...f.opening_hours,[day]:v}}))}/>
            ))}
            <button onClick={handleSave} disabled={saving} style={{
              width:"100%",padding:"14px",borderRadius:12,border:"none",marginTop:20,
              background:saving?"#333":"#534AB7",color:"#fff",fontSize:14,fontWeight:700,
              cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
              {saving?"Saving...":"Save Hours"}
            </button>
          </div>
        )}

        {/* ── MEDIA TAB ── */}
        {tab==="media"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{color:"#555",fontSize:11,fontWeight:600}}>
                PHOTOS & VIDEOS ({biz?.business_media?.length||0}/{maxMedia})
              </div>
              {biz&&(biz.business_media?.length||0)<maxMedia&&(
                <button onClick={()=>mediaRef.current?.click()} disabled={saving}
                  style={{padding:"7px 14px",borderRadius:9,border:"none",background:"#534AB7",
                  color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  + Add
                </button>
              )}
            </div>
            <input ref={mediaRef} type="file" accept="image/*,video/*" multiple style={{display:"none"}}
              onChange={handleMediaUpload}/>

            {!biz&&(
              <div style={{color:"#444",fontSize:12,textAlign:"center",padding:"40px 0"}}>
                Save your business info first
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {(biz?.business_media||[]).map(m=>{
                const isVid = m.type==="video";
                return (
                  <div key={m.id} style={{position:"relative",aspectRatio:"1",
                    borderRadius:10,overflow:"hidden",background:"#111",
                    border:"0.5px solid rgba(255,255,255,0.08)"}}>
                    {isVid
                      ? <div style={{width:"100%",height:"100%",display:"flex",
                          alignItems:"center",justifyContent:"center",fontSize:28}}>▶️</div>
                      : <img src={m.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    }
                    <button onClick={()=>handleDeleteMedia(m.id)} style={{
                      position:"absolute",top:4,right:4,width:22,height:22,
                      borderRadius:"50%",background:"rgba(226,75,74,0.9)",border:"none",
                      color:"#fff",fontSize:12,cursor:"pointer",display:"flex",
                      alignItems:"center",justifyContent:"center"}}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LOCATION TAB ── */}
        {tab==="location"&&(
          <div>
            <div style={{color:"#555",fontSize:11,fontWeight:600,marginBottom:12}}>
              BUSINESS LOCATION
            </div>
            {form.lat&&form.lng ? (
              <div style={{background:"rgba(168,240,198,0.08)",borderRadius:12,
                padding:"14px",marginBottom:14,border:"0.5px solid rgba(168,240,198,0.2)"}}>
                <div style={{color:"#a8f0c6",fontSize:12,fontWeight:600,marginBottom:4}}>
                  ✓ Location set
                </div>
                <div style={{color:"#555",fontSize:11,fontFamily:"monospace"}}>
                  {Number(form.lat).toFixed(6)}, {Number(form.lng).toFixed(6)}
                </div>
              </div>
            ) : (
              <div style={{background:"rgba(239,159,39,0.08)",borderRadius:12,
                padding:"14px",marginBottom:14,border:"0.5px solid rgba(239,159,39,0.2)"}}>
                <div style={{color:"#EF9F27",fontSize:12,fontWeight:600}}>
                  ⚠ No location set yet
                </div>
              </div>
            )}
            <button onClick={useCurrentLocation} style={{
              width:"100%",padding:"13px",borderRadius:12,border:"none",marginBottom:10,
              background:"#4a9eff",color:"#fff",fontSize:13,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit"}}>
              📍 Use my current GPS location
            </button>
            <div style={{color:"#444",fontSize:11,textAlign:"center",lineHeight:1.6}}>
              Make sure you're at your business location when tapping this.
            </div>
            {biz&&form.lat&&form.lng&&(
              <button onClick={handleSave} disabled={saving} style={{
                width:"100%",padding:"13px",borderRadius:12,border:"none",marginTop:14,
                background:"#534AB7",color:"#fff",fontSize:13,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit"}}>
                {saving?"Saving...":"Save Location"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
