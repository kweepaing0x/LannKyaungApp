import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import {
  fetchMyBusiness, createBusiness, updateBusiness,
  uploadBusinessCover, uploadBusinessMedia, deleteBusinessMedia,
  getBusinessCategories, updateBusinessLocation,
} from "../services/supabaseService";

const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_LABELS = { mon:"Mon",tue:"Tue",wed:"Wed",thu:"Thu",fri:"Fri",sat:"Sat",sun:"Sun" };
const DEFAULT_HOURS = Object.fromEntries(
  DAYS.map(d => [d, { open:"09:00", close:"18:00", closed: d==="sun" }])
);

function HourRow({ day, val, onChange }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,
      padding:"10px 0",borderBottom:"0.5px solid rgba(255,255,255,0.05)"}}>
      <span style={{color:"#666",fontSize:12,width:34,flexShrink:0}}>{DAY_LABELS[day]}</span>
      {val.closed
        ? <span style={{color:"#e24b4a",fontSize:12,flex:1}}>Closed</span>
        : <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
            <input type="time" value={val.open}
              onChange={e=>onChange({...val,open:e.target.value})}
              style={{background:"#111",border:"0.5px solid #333",borderRadius:8,
                color:"#fff",fontSize:12,padding:"6px 8px",fontFamily:"inherit",flex:1}}/>
            <span style={{color:"#333",fontSize:12}}>–</span>
            <input type="time" value={val.close}
              onChange={e=>onChange({...val,close:e.target.value})}
              style={{background:"#111",border:"0.5px solid #333",borderRadius:8,
                color:"#fff",fontSize:12,padding:"6px 8px",fontFamily:"inherit",flex:1}}/>
          </div>
      }
      <button onClick={()=>onChange({...val,closed:!val.closed})} style={{
        background:val.closed?"rgba(168,240,198,0.1)":"rgba(226,75,74,0.1)",
        border:`0.5px solid ${val.closed?"rgba(168,240,198,0.3)":"rgba(226,75,74,0.3)"}`,
        borderRadius:8,padding:"5px 10px",cursor:"pointer",flexShrink:0,
        color:val.closed?"#a8f0c6":"#e24b4a",fontSize:10,fontWeight:700,fontFamily:"inherit"}}>
        {val.closed?"Open":"Close"}
      </button>
    </div>
  );
}

export default function BusinessDashboard() {
  const { user, adminConfig, setActiveTab } = useAppStore();
  const [biz,     setBiz]     = useState(null);
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [tab,     setTab]     = useState("info");
  const [status,  setStatus]  = useState(null);
  const coverRef = useRef();
  const mediaRef = useRef();
  const maxMedia = adminConfig?.business_max_media ?? 10;

  const [form, setForm] = useState({
    name:"", category_id:"", description:"",
    phone:"", email:"", address:"",
    lat:"", lng:"", opening_hours:DEFAULT_HOURS,
  });

  useEffect(()=>{
    Promise.all([fetchMyBusiness(user?.id), getBusinessCategories()])
      .then(([b,c])=>{
        setCats(c||[]);
        if(b){ setBiz(b); setForm({
          name:b.name||"", category_id:b.category_id||"",
          description:b.description||"", phone:b.phone||"",
          email:b.email||"", address:b.address||"",
          lat:b.lat||"", lng:b.lng||"",
          opening_hours:b.opening_hours||DEFAULT_HOURS,
        }); }
        setLoading(false);
      });
  },[user?.id]);

  const showStatus = (msg) => {
    setStatus(msg);
    setTimeout(()=>setStatus(null),3500);
  };

  async function handleSave() {
    if(!form.name.trim()) return alert("Business name is required");
    if(!form.category_id) return alert("Please select a category");
    setSaving(true);
    try {
      if(biz) {
        await updateBusiness(biz.id,{
          name:form.name, category_id:form.category_id,
          description:form.description||null, phone:form.phone||null,
          email:form.email||null, address:form.address||null,
          opening_hours:form.opening_hours,
        });
        showStatus("✓ Saved");
      } else {
        if(!form.lat||!form.lng) return alert("Please set location first (Location tab)");
        const nb = await createBusiness({
          ownerUid:user.id, categoryId:form.category_id,
          name:form.name, description:form.description||null,
          phone:form.phone||null, email:form.email||null,
          address:form.address||null, lat:form.lat, lng:form.lng,
        });
        await updateBusiness(nb.id,{opening_hours:form.opening_hours});
        setBiz({...nb,business_media:[]});
        showStatus("✓ Created! Waiting for admin approval.");
      }
    } catch(e){ showStatus("Error: "+e.message); }
    finally{ setSaving(false); }
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if(!file||!biz) return;
    setSaving(true);
    try{
      await uploadBusinessCover(file,biz.id);
      const fresh = await fetchMyBusiness(user.id);
      setBiz(fresh); showStatus("✓ Cover updated");
    } catch(e){ showStatus("Error: "+e.message); }
    finally{ setSaving(false); }
  }

  async function handleMediaUpload(e) {
    const files = Array.from(e.target.files||[]);
    if(!files.length||!biz) return;
    const cur = biz.business_media?.length||0;
    if(cur+files.length>maxMedia) return alert(`Max ${maxMedia} allowed. You have ${cur}.`);
    setSaving(true);
    try{
      for(const f of files){
        await uploadBusinessMedia(f,biz.id,f.type.startsWith("video")?"video":"photo");
      }
      const fresh = await fetchMyBusiness(user.id);
      setBiz(fresh);
      showStatus(`✓ ${files.length} file(s) uploaded`);
    } catch(e){ showStatus("Error: "+e.message); }
    finally{ setSaving(false); }
  }

  async function handleDeleteMedia(id) {
    if(!confirm("Delete this?")) return;
    try{
      await deleteBusinessMedia(id);
      setBiz(b=>({...b,business_media:b.business_media.filter(m=>m.id!==id)}));
    } catch(e){ alert("Error: "+e.message); }
  }

  function useGPS() {
    if(!navigator.geolocation) return alert("GPS not available");
    navigator.geolocation.getCurrentPosition(
      pos=>{
        setForm(f=>({...f,lat:pos.coords.latitude,lng:pos.coords.longitude}));
        if(biz) updateBusinessLocation(biz.id,pos.coords.latitude,pos.coords.longitude)
          .then(()=>showStatus("✓ Location updated"))
          .catch(e=>showStatus("Error: "+e.message));
      },
      ()=>alert("Could not get location")
    );
  }

  if(loading) return (
    <div style={{position:"absolute",inset:0,background:"#0d0d0d",display:"flex",
      alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#444",fontSize:13}}>Loading...</div>
    </div>
  );

  const TABS = [
    {key:"info",     icon:"📋",label:"Info"},
    {key:"hours",    icon:"🕐",label:"Hours"},
    {key:"media",    icon:"📷",label:"Media"},
    {key:"location", icon:"📍",label:"Location"},
  ];

  return (
    <div style={{position:"absolute",inset:0,background:"#0d0d0d",
      display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* Header */}
      <div style={{flexShrink:0,
        background:"linear-gradient(180deg,rgba(83,74,183,0.15) 0%,transparent 100%)",
        borderBottom:"0.5px solid rgba(255,255,255,0.07)",
        paddingTop:"calc(12px + env(safe-area-inset-top,0px))"}}>

        <div style={{display:"flex",alignItems:"center",gap:12,padding:"0 16px 14px"}}>
          {/* Back */}
          <button onClick={()=>setActiveTab("map")} style={{
            width:36,height:36,borderRadius:12,
            background:"rgba(255,255,255,0.06)",
            border:"0.5px solid rgba(255,255,255,0.1)",
            display:"flex",alignItems:"center",justifyContent:"center",
            cursor:"pointer",flexShrink:0}}>
            <i className="ti ti-arrow-left" style={{fontSize:18,color:"#fff"}}/>
          </button>

          {/* Avatar + info */}
          <div style={{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0}}>
            <div style={{width:46,height:46,borderRadius:14,overflow:"hidden",
              background:"rgba(83,74,183,0.2)",border:"1.5px solid rgba(83,74,183,0.5)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:24,flexShrink:0}}>
              {biz?.cover_url
                ? <img src={biz.cover_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                : "🏪"}
            </div>
            <div style={{minWidth:0}}>
              <div style={{color:"#fff",fontSize:15,fontWeight:700,
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {biz?.name||"My Business"}
              </div>
              <div style={{marginTop:3}}>
                {biz ? (
                  <div style={{display:"inline-flex",alignItems:"center",gap:5,
                    background:biz.is_verified?"rgba(168,240,198,0.1)":"rgba(239,159,39,0.1)",
                    border:`0.5px solid ${biz.is_verified?"rgba(168,240,198,0.3)":"rgba(239,159,39,0.3)"}`,
                    borderRadius:20,padding:"3px 10px"}}>
                    <div style={{width:5,height:5,borderRadius:"50%",
                      background:biz.is_verified?"#a8f0c6":"#EF9F27"}}/>
                    <span style={{fontSize:10,fontWeight:700,
                      color:biz.is_verified?"#a8f0c6":"#EF9F27"}}>
                      {biz.is_verified?"Live on Map":"Pending Approval"}
                    </span>
                  </div>
                ) : (
                  <span style={{color:"#555",fontSize:11}}>Not created yet</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",padding:"0 8px"}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{
              flex:1,padding:"8px 4px 10px",background:"none",border:"none",
              borderBottom:`2px solid ${tab===t.key?"#534AB7":"transparent"}`,
              cursor:"pointer",fontFamily:"inherit",
              display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:15}}>{t.icon}</span>
              <span style={{color:tab===t.key?"#fff":"#555",fontSize:9,fontWeight:700,
                letterSpacing:0.5}}>{t.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status toast */}
      {status&&(
        <div style={{position:"absolute",top:140,left:16,right:16,zIndex:20,
          padding:"11px 16px",borderRadius:12,textAlign:"center",
          background:status.startsWith("Error")?"rgba(226,75,74,0.95)":"rgba(83,74,183,0.95)",
          color:"#fff",fontSize:12,fontWeight:600,
          boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
          {status}
        </div>
      )}

      {/* Scrollable content */}
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",
        padding:"20px 16px",
        paddingBottom:"calc(32px + env(safe-area-inset-bottom,0px))"}}>

        {/* ── INFO TAB ── */}
        {tab==="info"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>

            {/* Cover card */}
            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:16,
              border:"0.5px solid rgba(255,255,255,0.07)",padding:"16px",
              display:"flex",alignItems:"center",gap:14}}>
              <div onClick={()=>biz&&coverRef.current?.click()}
                style={{width:76,height:76,borderRadius:14,overflow:"hidden",
                  background:"rgba(83,74,183,0.1)",
                  border:"1.5px dashed rgba(83,74,183,0.4)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:biz?"pointer":"default",flexShrink:0,fontSize:28}}>
                {biz?.cover_url
                  ? <img src={biz.cover_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : "📸"}
              </div>
              <div style={{flex:1}}>
                <div style={{color:"#fff",fontSize:13,fontWeight:600,marginBottom:3}}>Cover Photo</div>
                <div style={{color:"#555",fontSize:11,lineHeight:1.5,marginBottom:8}}>
                  {biz?"Shown on map marker and business page":"Save your info first to upload"}
                </div>
                {biz&&(
                  <button onClick={()=>coverRef.current?.click()} disabled={saving}
                    style={{padding:"7px 14px",borderRadius:9,border:"none",
                      background:"#534AB7",color:"#fff",fontSize:11,fontWeight:600,
                      cursor:"pointer",fontFamily:"inherit"}}>
                    {saving?"Uploading...":"Change Photo"}
                  </button>
                )}
              </div>
              <input ref={coverRef} type="file" accept="image/*" style={{display:"none"}}
                onChange={handleCoverUpload}/>
            </div>

            {/* Input fields */}
            {[
              {label:"Business Name",key:"name",placeholder:"မြဝတီဆိုင်",icon:"🏪",required:true},
              {label:"Phone",        key:"phone",placeholder:"+95 9...",   icon:"📞"},
              {label:"Email",        key:"email",placeholder:"shop@...",    icon:"📧"},
              {label:"Address",      key:"address",placeholder:"Street, Township",icon:"📌"},
            ].map(({label,key,placeholder,icon,required})=>(
              <div key={key}>
                <div style={{color:"#666",fontSize:11,fontWeight:600,marginBottom:6,
                  display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:13}}>{icon}</span>
                  {label}{required&&<span style={{color:"#534AB7"}}>*</span>}
                </div>
                <input value={form[key]}
                  onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                  placeholder={placeholder}
                  style={{width:"100%",background:"rgba(255,255,255,0.05)",
                    border:"0.5px solid rgba(255,255,255,0.1)",
                    borderRadius:12,padding:"13px 14px",color:"#fff",fontSize:13,
                    fontFamily:"inherit",outline:"none"}}/>
              </div>
            ))}

            {/* Category */}
            <div>
              <div style={{color:"#666",fontSize:11,fontWeight:600,marginBottom:8,
                display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:13}}>🏷️</span>
                Category<span style={{color:"#534AB7"}}>*</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {cats.map(c=>(
                  <button key={c.id} onClick={()=>setForm(f=>({...f,category_id:c.id}))}
                    style={{padding:"9px 16px",borderRadius:20,border:"none",cursor:"pointer",
                      background:form.category_id===c.id
                        ?"linear-gradient(135deg,#534AB7,#7c6fff)"
                        :"rgba(255,255,255,0.06)",
                      color:form.category_id===c.id?"#fff":"#888",
                      fontSize:12,fontFamily:"inherit",fontWeight:form.category_id===c.id?700:400,
                      boxShadow:form.category_id===c.id?"0 2px 10px rgba(83,74,183,0.4)":"none"}}>
                    {c.emoji} {c.name_en}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <div style={{color:"#666",fontSize:11,fontWeight:600,marginBottom:6,
                display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:13}}>📝</span> Description
              </div>
              <textarea value={form.description}
                onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                placeholder="Tell customers about your business..."
                rows={3}
                style={{width:"100%",background:"rgba(255,255,255,0.05)",
                  border:"0.5px solid rgba(255,255,255,0.1)",
                  borderRadius:12,padding:"13px 14px",color:"#fff",fontSize:13,
                  fontFamily:"inherit",outline:"none",resize:"none"}}/>
            </div>

            <button onClick={handleSave} disabled={saving} style={{
              width:"100%",padding:"15px",borderRadius:14,border:"none",
              background:saving?"#222":"linear-gradient(135deg,#534AB7,#7c6fff)",
              color:saving?"#555":"#fff",fontSize:14,fontWeight:700,
              cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",
              boxShadow:saving?"none":"0 4px 20px rgba(83,74,183,0.4)"}}>
              {saving?"Saving...":(biz?"Save Changes":"Create Listing")}
            </button>
          </div>
        )}

        {/* ── HOURS TAB ── */}
        {tab==="hours"&&(
          <div>
            <div style={{color:"#666",fontSize:12,lineHeight:1.6,marginBottom:16,
              background:"rgba(255,255,255,0.03)",borderRadius:12,padding:"12px 14px",
              border:"0.5px solid rgba(255,255,255,0.06)"}}>
              Customers see "Open Now" or "Closed" badge based on these hours.
            </div>
            {DAYS.map(day=>(
              <HourRow key={day}
                day={day}
                val={form.opening_hours[day]||{open:"09:00",close:"18:00",closed:false}}
                onChange={v=>setForm(f=>({...f,opening_hours:{...f.opening_hours,[day]:v}}))}
              />
            ))}
            <button onClick={handleSave} disabled={saving} style={{
              width:"100%",padding:"15px",borderRadius:14,border:"none",marginTop:20,
              background:saving?"#222":"linear-gradient(135deg,#534AB7,#7c6fff)",
              color:saving?"#555":"#fff",fontSize:14,fontWeight:700,
              cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",
              boxShadow:saving?"none":"0 4px 20px rgba(83,74,183,0.4)"}}>
              {saving?"Saving...":"Save Hours"}
            </button>
          </div>
        )}

        {/* ── MEDIA TAB ── */}
        {tab==="media"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{color:"#fff",fontSize:13,fontWeight:600}}>Photos & Videos</div>
                <div style={{color:"#555",fontSize:11,marginTop:2}}>
                  {biz?.business_media?.length||0} / {maxMedia} used
                </div>
              </div>
              {biz&&(biz.business_media?.length||0)<maxMedia&&(
                <button onClick={()=>mediaRef.current?.click()} disabled={saving}
                  style={{padding:"9px 18px",borderRadius:12,border:"none",
                    background:"linear-gradient(135deg,#534AB7,#7c6fff)",
                    color:"#fff",fontSize:12,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",
                    boxShadow:"0 2px 10px rgba(83,74,183,0.4)"}}>
                  + Add
                </button>
              )}
            </div>
            <input ref={mediaRef} type="file" accept="image/*,video/*"
              multiple style={{display:"none"}} onChange={handleMediaUpload}/>

            {!biz&&(
              <div style={{textAlign:"center",padding:"60px 0",color:"#444",fontSize:13}}>
                Save your business info first
              </div>
            )}

            {biz&&(biz.business_media?.length||0)===0&&(
              <div style={{textAlign:"center",padding:"40px 0",
                background:"rgba(255,255,255,0.02)",borderRadius:16,
                border:"0.5px dashed rgba(255,255,255,0.08)"}}>
                <div style={{fontSize:40,marginBottom:12}}>📷</div>
                <div style={{color:"#555",fontSize:13}}>No photos yet</div>
                <div style={{color:"#444",fontSize:11,marginTop:6}}>
                  Add photos to attract customers
                </div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8}}>
              {(biz?.business_media||[]).map(m=>(
                <div key={m.id} style={{position:"relative",aspectRatio:"1",
                  borderRadius:12,overflow:"hidden",background:"#111",
                  border:"0.5px solid rgba(255,255,255,0.07)"}}>
                  {m.type==="video"
                    ? <div style={{width:"100%",height:"100%",display:"flex",
                        alignItems:"center",justifyContent:"center",fontSize:28,
                        background:"rgba(255,255,255,0.03)"}}>▶️</div>
                    : <img src={m.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  }
                  <button onClick={()=>handleDeleteMedia(m.id)} style={{
                    position:"absolute",top:5,right:5,width:24,height:24,
                    borderRadius:"50%",background:"rgba(0,0,0,0.75)",
                    border:"0.5px solid rgba(255,255,255,0.2)",
                    color:"#fff",fontSize:14,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOCATION TAB ── */}
        {tab==="location"&&(
          <div>
            <div style={{color:"#666",fontSize:12,lineHeight:1.7,marginBottom:16,
              background:"rgba(255,255,255,0.03)",borderRadius:12,padding:"12px 14px",
              border:"0.5px solid rgba(255,255,255,0.06)"}}>
              Your business shows as a round photo marker on the map.
              Make sure you're physically at your business when you tap below.
            </div>

            {form.lat&&form.lng ? (
              <div style={{background:"rgba(168,240,198,0.06)",borderRadius:14,
                padding:"16px",marginBottom:16,
                border:"0.5px solid rgba(168,240,198,0.2)",
                display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:40,height:40,borderRadius:12,
                  background:"rgba(168,240,198,0.1)",border:"0.5px solid rgba(168,240,198,0.3)",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                  📍
                </div>
                <div>
                  <div style={{color:"#a8f0c6",fontSize:13,fontWeight:600}}>Location set ✓</div>
                  <div style={{color:"#555",fontSize:10,fontFamily:"monospace",marginTop:3}}>
                    {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{background:"rgba(239,159,39,0.06)",borderRadius:14,
                padding:"16px",marginBottom:16,
                border:"0.5px solid rgba(239,159,39,0.2)"}}>
                <div style={{color:"#EF9F27",fontSize:13,fontWeight:600}}>⚠ No location set</div>
                <div style={{color:"#666",fontSize:11,marginTop:4,lineHeight:1.5}}>
                  Your business won't appear on the map until a location is set.
                </div>
              </div>
            )}

            <button onClick={useGPS} style={{
              width:"100%",padding:"15px",borderRadius:14,border:"none",marginBottom:12,
              background:"linear-gradient(135deg,#4a9eff,#534AB7)",
              color:"#fff",fontSize:14,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit",
              boxShadow:"0 4px 20px rgba(74,158,255,0.3)"}}>
              📍 Use My Current GPS Location
            </button>

            <div style={{color:"#444",fontSize:11,textAlign:"center",
              lineHeight:1.7,padding:"0 20px"}}>
              You can update your location anytime from this tab.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
