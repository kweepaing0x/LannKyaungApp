import { useState, useEffect } from "react";
import { fetchBusiness, incrementBusinessView } from "../services/supabaseService";

// ── Helpers ───────────────────────────────────────────────────
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_LABELS = { mon:"Mon",tue:"Tue",wed:"Wed",thu:"Thu",fri:"Fri",sat:"Sat",sun:"Sun" };

function isOpenNow(hours) {
  if (!hours) return null;
  const now  = new Date();
  const day  = DAYS[now.getDay()===0?6:now.getDay()-1];
  const dh   = hours[day];
  if (!dh || dh.closed) return false;
  const [oh,om] = dh.open.split(":").map(Number);
  const [ch,cm] = dh.close.split(":").map(Number);
  const mins = now.getHours()*60 + now.getMinutes();
  return mins >= oh*60+om && mins <= ch*60+cm;
}

function MediaViewer({ url, onClose }) {
  const isVid = /\.(mp4|mov|webm|ogg)/i.test(url);
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.97)",
      zIndex:4000,display:"flex",flexDirection:"column"}}>
      <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",
        fontSize:15,cursor:"pointer",padding:"16px",display:"flex",alignItems:"center",gap:6,
        fontFamily:"inherit",fontWeight:600}}>
        <i className="ti ti-arrow-left" style={{fontSize:20}}/>Back
      </button>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        {isVid
          ? <video src={url} controls autoPlay style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12}}/>
          : <img src={url} alt="" style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12,objectFit:"contain"}}/>
        }
      </div>
    </div>
  );
}

export default function BusinessPopup({ business: preview, onClose }) {
  const [biz,     setBiz]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [mediaViewer, setMediaViewer] = useState(null);
  const [showHours, setShowHours] = useState(false);

  useEffect(()=>{
    fetchBusiness(preview.id).then(d=>{ setBiz(d); setLoading(false); });
    incrementBusinessView(preview.id);
  },[preview.id]);

  const data      = biz || preview;
  const openNow   = isOpenNow(data.opening_hours);
  const today     = DAYS[new Date().getDay()===0?6:new Date().getDay()-1];
  const todayHrs  = data.opening_hours?.[today];
  const category  = data.business_categories;
  const media     = biz?.business_media || [];

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",
        zIndex:1500,display:"flex",alignItems:"flex-end"}}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",background:"#1a1a1a",
          borderRadius:"20px 20px 0 0",border:"0.5px solid rgba(255,255,255,0.09)",
          maxHeight:"90vh",display:"flex",flexDirection:"column",
          paddingBottom:"calc(16px + env(safe-area-inset-bottom,0px))"}}>

          {/* Handle */}
          <div style={{width:36,height:4,background:"#2e2e2e",borderRadius:2,margin:"12px auto 0",flexShrink:0}}/>

          <div style={{overflowY:"auto",flex:1}}>

            {/* Cover photo */}
            {data.cover_url && (
              <div onClick={()=>setMediaViewer(data.cover_url)}
                style={{width:"100%",height:180,overflow:"hidden",cursor:"pointer",position:"relative"}}>
                <img src={data.cover_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,rgba(26,26,26,0.8))"}}/>
              </div>
            )}

            <div style={{padding:"16px 20px 0"}}>

              {/* Header */}
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14}}>
                {/* Profile avatar */}
                <div style={{width:52,height:52,borderRadius:"50%",flexShrink:0,
                  background:"rgba(255,255,255,0.05)",border:"2px solid rgba(255,255,255,0.1)",
                  overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
                  {data.cover_url
                    ? <img src={data.cover_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : category?.emoji||"🏪"
                  }
                </div>
                <div style={{flex:1}}>
                  <div style={{color:"#fff",fontSize:17,fontWeight:700,lineHeight:1.3}}>{data.name}</div>
                  <div style={{color:"#666",fontSize:12,marginTop:3}}>
                    {category?.emoji} {category?.name_en}
                  </div>
                  {/* Open/closed badge */}
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
                    <div style={{
                      background: openNow===true?"rgba(168,240,198,0.12)":openNow===false?"rgba(226,75,74,0.12)":"rgba(255,255,255,0.06)",
                      borderRadius:6,padding:"2px 8px",
                      border:`0.5px solid ${openNow===true?"rgba(168,240,198,0.3)":openNow===false?"rgba(226,75,74,0.3)":"rgba(255,255,255,0.1)"}`,
                    }}>
                      <span style={{fontSize:10,fontWeight:700,
                        color:openNow===true?"#a8f0c6":openNow===false?"#e24b4a":"#666"}}>
                        {openNow===true?"● Open Now":openNow===false?"● Closed":"● Hours unknown"}
                      </span>
                    </div>
                    {todayHrs&&!todayHrs.closed&&(
                      <span style={{color:"#555",fontSize:10}}>
                        {todayHrs.open} – {todayHrs.close}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{height:"0.5px",background:"rgba(255,255,255,0.07)",marginBottom:14}}/>

              {/* Description */}
              {data.description&&(
                <div style={{color:"#888",fontSize:12,lineHeight:1.7,marginBottom:14}}>
                  {data.description}
                </div>
              )}

              {/* Contact row */}
              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                {data.phone&&(
                  <a href={`tel:${data.phone}`} style={{
                    display:"flex",alignItems:"center",gap:6,padding:"8px 14px",
                    background:"rgba(74,158,255,0.1)",borderRadius:10,
                    border:"0.5px solid rgba(74,158,255,0.25)",textDecoration:"none"}}>
                    <i className="ti ti-phone" style={{fontSize:15,color:"#4a9eff"}}/>
                    <span style={{color:"#4a9eff",fontSize:12,fontWeight:600}}>{data.phone}</span>
                  </a>
                )}
                {data.phone&&(
                  <a href={`https://wa.me/${data.phone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",
                    background:"rgba(37,211,102,0.1)",borderRadius:10,
                    border:"0.5px solid rgba(37,211,102,0.25)",textDecoration:"none"}}>
                    <span style={{fontSize:15}}>💬</span>
                    <span style={{color:"#25d366",fontSize:12,fontWeight:600}}>WhatsApp</span>
                  </a>
                )}
              </div>

              {/* Address */}
              {data.address&&(
                <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:14}}>
                  <i className="ti ti-map-pin" style={{fontSize:15,color:"#555",marginTop:1,flexShrink:0}}/>
                  <span style={{color:"#888",fontSize:12,lineHeight:1.6}}>{data.address}</span>
                </div>
              )}

              {/* Opening hours toggle */}
              {data.opening_hours&&(
                <div style={{marginBottom:14}}>
                  <button onClick={()=>setShowHours(!showHours)} style={{
                    display:"flex",alignItems:"center",gap:8,width:"100%",
                    background:"rgba(255,255,255,0.04)",border:"0.5px solid rgba(255,255,255,0.08)",
                    borderRadius:10,padding:"10px 14px",cursor:"pointer",fontFamily:"inherit"}}>
                    <i className="ti ti-clock" style={{fontSize:15,color:"#555"}}/>
                    <span style={{color:"#888",fontSize:12,fontWeight:600,flex:1,textAlign:"left"}}>Opening Hours</span>
                    <i className={`ti ti-chevron-${showHours?"up":"down"}`} style={{fontSize:14,color:"#444"}}/>
                  </button>
                  {showHours&&(
                    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:"0 0 10px 10px",
                      border:"0.5px solid rgba(255,255,255,0.06)",borderTop:"none",padding:"10px 14px"}}>
                      {DAYS.map(day=>{
                        const h = data.opening_hours[day];
                        const isToday = day===today;
                        return (
                          <div key={day} style={{display:"flex",justifyContent:"space-between",
                            padding:"5px 0",borderBottom:"0.5px solid rgba(255,255,255,0.04)"}}>
                            <span style={{color:isToday?"#fff":"#666",fontSize:11,fontWeight:isToday?700:400}}>
                              {isToday?"▶ ":""}{DAY_LABELS[day]}
                            </span>
                            <span style={{color:h?.closed?"#e24b4a":isToday?"#a8f0c6":"#555",fontSize:11}}>
                              {h?.closed?"Closed":`${h?.open||"?"} – ${h?.close||"?"}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Media gallery */}
              {loading&&<div style={{color:"#444",fontSize:12,marginBottom:14}}>Loading photos...</div>}
              {media.length>0&&(
                <div style={{marginBottom:16}}>
                  <div style={{color:"#555",fontSize:11,fontWeight:600,marginBottom:8}}>
                    PHOTOS & VIDEOS ({media.length})
                  </div>
                  <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                    {media.map(m=>{
                      const isVid = m.type==="video";
                      return (
                        <div key={m.id} onClick={()=>setMediaViewer(m.url)}
                          style={{flexShrink:0,width:90,height:90,borderRadius:10,overflow:"hidden",
                          cursor:"pointer",position:"relative",
                          border:"0.5px solid rgba(255,255,255,0.08)",background:"#111"}}>
                          {isVid
                            ? <div style={{width:"100%",height:"100%",display:"flex",
                                alignItems:"center",justifyContent:"center",fontSize:24}}>▶️</div>
                            : <img src={m.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          }
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={onClose} style={{width:"100%",padding:"13px",borderRadius:12,
                background:"#222",border:"0.5px solid rgba(255,255,255,0.08)",
                color:"#666",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {mediaViewer&&<MediaViewer url={mediaViewer} onClose={()=>setMediaViewer(null)}/>}
    </>
  );
}
