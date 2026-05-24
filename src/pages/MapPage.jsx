import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store";
import { subscribePins, subscribeCheckRequests, subscribeHistoryPins } from "../services/supabaseService";
import PinPopup from "../components/PinPopup";

// 1. Hardcode your CURRENT app build version here
const CURRENT_VERSION = "1.1.0"; 

// 2. Semantic version comparison helper
function isOutdated(current, minimum) {
  if (!minimum) return false;
  const currParts = current.split('.').map(Number);
  const minParts = minimum.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currParts.length, minParts.length); i++) {
    const curr = currParts[i] || 0;
    const min = minParts[i] || 0;
    if (curr < min) return true;
    if (curr > min) return false;
  }
  return false;
}

function PickCrosshair(){
  return(
    <div style={{position:"absolute",top:"50%",left:"50%",
      transform:"translate(-50%,-100%)",zIndex:800,pointerEvents:"none",
      display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:36,height:36,borderRadius:"50%",background:"#534AB7",
        border:"3px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:18,boxShadow:"0 4px 16px rgba(83,74,183,0.8)"}}>📍</div>
      <div style={{width:3,height:14,background:"#534AB7",borderRadius:"0 0 2px 2px",marginTop:-1}}/>
      <div style={{width:10,height:4,background:"rgba(0,0,0,0.35)",borderRadius:"50%"}}/>
    </div>
  );
}

export default function MapPage(){
  const mapRef        = useRef(null);
  const mapInstance   = useRef(null);
  const markersRef    = useRef([]);
  const userMarkerRef = useRef(null);
  const dropMarkerRef = useRef(null);

  const {
    userLocation,setUserLocation,
    pins,setPins,
    checkRequests,setCheckRequests,
    showHistory,setShowHistory,
    showPlusModal,setShowPlusModal,
    pickingLocation,setPickingLocation,
    setPickedLocation,
    adminConfig,
    situationTypes,
    userDoc,
  } = useAppStore();

  const [mapReady,setMapReady]       = useState(false);
  const [historyPins,setHistoryPins] = useState([]);
  const [selectedPin,setSelectedPin] = useState(null);
  const [gpsStatus,setGpsStatus]     = useState("pending"); 
  const [showGpsPopup,setShowGpsPopup] = useState(false);

  const accountType = userDoc?.account_type || "normal";

  // 3. Evaluate version validity against Supabase config data
  const isRequiredToUpdate = isOutdated(CURRENT_VERSION, adminConfig?.min_required_version);
  const downloadUrl = adminConfig?.update_url || "https://drive.google.com/file/d/16nNlo39y_d-MCAbAN1qe_znwlHC6VCOA/view?usp=drive_link";

  // Init map (Only proceeds if application version matches requirements)
  useEffect(()=>{
    if(mapInstance.current || !mapRef.current || isRequiredToUpdate) return;
    
    const init=()=>{
      const L=window.L;
      const map=L.map(mapRef.current,{
        center:[16.8409,96.1735],zoom:14,
        zoomControl:false,attributionControl:true,tap:true,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{
        attribution:'&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM',
        subdomains:"abcd",maxZoom:19,
      }).addTo(map);
      mapInstance.current=map;
      setMapReady(true);

      if(!navigator.geolocation){
        setGpsStatus("unavailable");
        setShowGpsPopup(true);
        return;
      }
      navigator.geolocation.watchPosition(
        (pos) => {
          setGpsStatus("granted");
          setShowGpsPopup(false);
          const ll=[pos.coords.latitude,pos.coords.longitude];
          setUserLocation({lat:pos.coords.latitude,lng:pos.coords.longitude});
          if(userMarkerRef.current){
            userMarkerRef.current.setLatLng(ll);
          } else {
            const icon=L.divIcon({className:"",
              html:`<div style="position:relative;width:20px;height:20px">
                <div style="position:absolute;top:-8px;left:-8px;width:36px;height:36px;border-radius:50%;
                  border:2px solid rgba(74,158,255,0.35);animation:lkPulse 2s ease-out infinite"></div>
                <div style="width:20px;height:20px;background:#fff;border-radius:50%;
                  border:3px solid #4a9eff;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>
              </div>`,iconSize:[20,20],iconAnchor:[10,10],
            });
            userMarkerRef.current=L.marker(ll,{icon,zIndexOffset:1000}).addTo(map);
            map.setView(ll,15);
          }
        },
        (err) => {
          setGpsStatus(err.code===1?"denied":"unavailable");
          setShowGpsPopup(true);
        },
        {enableHighAccuracy:true,timeout:10000}
      );
    };
    if(window.L) init();
    else{const id=setInterval(()=>{if(window.L){clearInterval(id);init();}},100);return()=>clearInterval(id);}
  },[isRequiredToUpdate]);

  // Confirm map pick
  function confirmPickLocation(){
    const map=mapInstance.current;
    if(!map) return;
    const center=map.getCenter();
    const loc={lat:center.lat,lng:center.lng};
    const L=window.L;
    if(dropMarkerRef.current){dropMarkerRef.current.remove();dropMarkerRef.current=null;}
    const icon=L.divIcon({className:"",
      html:`<div style="display:flex;flex-direction:column;align-items:center">
        <div style="width:30px;height:30px;background:#534AB7;border-radius:50%;
          border:3px solid #fff;display:flex;align-items:center;justify-content:center;
          font-size:15px;box-shadow:0 4px 14px rgba(83,74,183,0.8)">📍</div>
        <div style="width:3px;height:10px;background:#534AB7;margin-top:-2px;border-radius:2px"></div>
        <div style="width:8px;height:3px;background:rgba(0,0,0,0.3);border-radius:50%"></div>
      </div>`,iconSize:[30,46],iconAnchor:[15,46],
    });
    dropMarkerRef.current=L.marker([loc.lat,loc.lng],{icon}).addTo(map);
    setPickedLocation(loc);
    setPickingLocation(false);
    setTimeout(()=>setShowPlusModal(true),100);
  }

  function cancelPick(){
    setPickingLocation(false);
    if(dropMarkerRef.current){dropMarkerRef.current.remove();dropMarkerRef.current=null;}
    setTimeout(()=>setShowPlusModal(true),100);
  }

  useEffect(()=>{
    if(!showPlusModal&&!pickingLocation&&dropMarkerRef.current){
      dropMarkerRef.current.remove();dropMarkerRef.current=null;
    }
  },[showPlusModal,pickingLocation]);

  // Subscriptions
  useEffect(()=>{
    if(isRequiredToUpdate) return;
    const u=subscribePins(setPins);
    return u;
  },[isRequiredToUpdate]);

  useEffect(()=>{
    if(isRequiredToUpdate) return;
    const u=subscribeCheckRequests(setCheckRequests);
    return u;
  },[isRequiredToUpdate]);

  useEffect(()=>{
    if(isRequiredToUpdate) return;
    if(showHistory){const u=subscribeHistoryPins(setHistoryPins, adminConfig?.pin_history_days??7);return u;}
    else setHistoryPins([]);
  },[showHistory, isRequiredToUpdate]);

  // Draw pins
  useEffect(()=>{
    if(!mapReady||!mapInstance.current||!window.L||isRequiredToUpdate) return;
    const L=window.L;
    markersRef.current.forEach(m=>m.remove());
    markersRef.current=[];
    const all=showHistory?[...pins,...historyPins]:pins;
    all.forEach(pin=>{
      const hist = !!pin.is_history;
      const hasTip = !!pin.tip_enabled && !hist;

      const typeInfo = situationTypes?.find(t => t.id === pin.type);
      const emoji    = pin.emoji || typeInfo?.emoji || "📍";
      const color    = typeInfo?.color || "#888780";

      const icon = hasTip
        ? L.divIcon({
            className:"",
            html:`<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
              <div style="
                background:linear-gradient(135deg,#e24b4a,#EF9F27);
                border-radius:20px;padding:3px 8px 3px 6px;
                border:2px solid rgba(255,255,255,0.8);
                box-shadow:0 3px 12px rgba(239,159,39,0.6);
                display:flex;align-items:center;gap:4px;
                white-space:nowrap;
              ">
                <span style="font-size:14px;line-height:1">${emoji}</span>
                <span style="color:#fff;font-size:10px;font-weight:800;letter-spacing:0.5px">??</span>
              </div>
              <div style="width:2px;height:6px;background:#EF9F27;border-radius:0 0 2px 2px;margin-top:-1px"></div>
              <div style="width:6px;height:3px;background:rgba(0,0,0,0.3);border-radius:50%"></div>
            </div>`,
            iconSize:[60,32], iconAnchor:[30,38],
          })
        : L.divIcon({
            className:"",
            html:`<div style="
              display:flex;flex-direction:column;align-items:center;
              cursor:pointer;opacity:${hist?0.5:1};
            ">
              <div style="
                width:${hist?28:36}px;height:${hist?28:36}px;
                background:${hist?"rgba(40,40,40,0.9)":"rgba(20,20,20,0.92)"};
                border-radius:50%;
                border:2px solid ${hist?"rgba(255,255,255,0.15)":color};
                display:flex;align-items:center;justify-content:center;
                font-size:${hist?12:18}px;
                box-shadow:${hist?"none":"0 2px 12px "+color+"66"};
              ">${emoji}</div>
              ${hist?"":"<div style='width:2px;height:5px;background:"+color+";border-radius:0 0 2px 2px;margin-top:-1px'></div><div style='width:6px;height:3px;background:rgba(0,0,0,0.3);border-radius:50%'></div>"}
            </div>`,
            iconSize:[hist?28:36, hist?28:44], iconAnchor:[hist?14:18, hist?14:44],
          });
      const m=L.marker([pin.lat,pin.lng],{icon}).addTo(mapInstance.current)
        .on("click",()=>setSelectedPin(pin));
      markersRef.current.push(m);
    });
  },[pins,historyPins,mapReady,showHistory,isRequiredToUpdate]);

  function centerOnUser(){
    if(userLocation&&mapInstance.current){
      mapInstance.current.setView([userLocation.lat,userLocation.lng],16);
    } else {
      setShowGpsPopup(true);
    }
  }

  function requestGpsAgain(){
    if(!navigator.geolocation){ setGpsStatus("unavailable"); return; }
    setGpsStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsStatus("granted");
        setShowGpsPopup(false);
        const ll=[pos.coords.latitude,pos.coords.longitude];
        setUserLocation({lat:pos.coords.latitude,lng:pos.coords.longitude});
        if(mapInstance.current) mapInstance.current.setView(ll,16);
        const L=window.L;
        if(userMarkerRef.current){
          userMarkerRef.current.setLatLng(ll);
        } else {
          const icon=L.divIcon({className:"",
            html:`<div style="position:relative;width:20px;height:20px">
              <div style="position:absolute;top:-8px;left:-8px;width:36px;height:36px;border-radius:50%;
                border:2px solid rgba(74,158,255,0.35);animation:lkPulse 2s ease-out infinite"></div>
              <div style="width:20px;height:20px;background:#fff;border-radius:50%;
                border:3px solid #4a9eff;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>
            </div>`,iconSize:[20,20],iconAnchor:[10,10],
          });
          userMarkerRef.current=L.marker(ll,{icon,zIndexOffset:1000}).addTo(mapInstance.current);
        }
      },
      (err) => { setGpsStatus(err.code===1?"denied":"unavailable"); },
      {enableHighAccuracy:true,timeout:10000}
    );
  }

  const handleUpdateRedirect = () => {
    // 1. Check if native Telegram WebApp object handles external routing
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(downloadUrl);
    } else {
      // 2. Clean browser fallback environment
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  const openReqs=checkRequests.filter(r=>r.status==="pending");

  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:"#0d0d0d"}}>
      <style>{`@keyframes lkPulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}`}</style>
      <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
      {!mapReady&&!isRequiredToUpdate&&(
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
          justifyContent:"center",background:"#0d0d0d",color:"#fff",fontSize:14,zIndex:5}}>
          မြေပုံ တင်နေသည်...
        </div>
      )}

      {accountType==="normal"&&!pickingLocation&&!isRequiredToUpdate&&(
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:600,
          background:"rgba(20,20,20,0.92)",padding:"7px 14px",
          borderBottom:"0.5px solid rgba(255,255,255,0.07)",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{color:"#888",fontSize:11}}>
            ⚡ Live pins · <span style={{color:"#EF9F27"}}>Normal account</span>
          </span>
          <span style={{color:"#534AB7",fontSize:10,fontWeight:700,cursor:"pointer"}}
            onClick={()=>alert("Upgrade to Business to see real-time pins.\nContact @dx0dev on Telegram.")}>
            Upgrade →
          </span>
        </div>
      )}

      {pickingLocation&&(<>
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:900,
          background:"rgba(83,74,183,0.97)",padding:"12px 16px 10px",
          boxShadow:"0 2px 20px rgba(0,0,0,0.5)"}}>
          <div style={{color:"#fff",fontSize:13,fontWeight:700,textAlign:"center"}}>Pan map to your location</div>
          <div style={{color:"rgba(206,203,246,0.75)",fontSize:11,textAlign:"center",marginTop:3}}>
            The 📍 pin marks the center — pan until it's on your spot
          </div>
        </div>
        <PickCrosshair/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:900,
          background:"rgba(13,13,13,0.97)",padding:"14px 16px",
          borderTop:"0.5px solid rgba(255,255,255,0.08)",display:"flex",gap:10}}>
          <button onClick={cancelPick} style={{flex:1,padding:"13px",borderRadius:12,
            border:"0.5px solid rgba(255,255,255,0.12)",
            background:"#1a1a1a",color:"#aaa",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Cancel
          </button>
          <button onClick={confirmPickLocation} style={{flex:2,padding:"13px",borderRadius:12,
            border:"none",background:"#534AB7",color:"#fff",fontSize:14,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(83,74,183,0.5)"}}>
            ✓ Confirm this location
          </button>
        </div>
      </>)}

      {!pickingLocation&&!isRequiredToUpdate&&(<>
        <div onClick={()=>setShowHistory(!showHistory)} style={{
          position:"absolute",top:accountType==="normal"?42:14,
          left:"50%",transform:"translateX(-50%)",
          background:"rgba(20,20,20,0.95)",borderRadius:20,padding:"5px 14px",
          border:"0.5px solid rgba(255,255,255,0.08)",zIndex:500,
          whiteSpace:"nowrap",cursor:"pointer"}}>
          <span style={{color:"#EF9F27",fontSize:11,fontWeight:600}}>
            {showHistory?`🕐 History ON · tap to hide`:`🕐 History · ${historyPins.length} pins`}
          </span>
        </div>
        <div style={{position:"absolute",top:accountType==="normal"?90:60,right:12,zIndex:500}}>
          <button onClick={centerOnUser} style={{
            width:36,height:36,background:"rgba(20,20,20,0.96)",
            borderRadius:9,border:`0.5px solid ${gpsStatus==="granted"?"rgba(74,158,255,0.4)":gpsStatus==="denied"?"rgba(226,75,74,0.4)":"rgba(255,255,255,0.1)"}`,
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
            position:"relative"}}>
            <i className="ti ti-navigation" style={{
              fontSize:16,
              color:gpsStatus==="granted"?"#4a9eff":gpsStatus==="denied"?"#e24b4a":"#ccc",
            }} aria-hidden="true"/>
            {gpsStatus!=="granted"&&(
              <div style={{position:"absolute",top:-3,right:-3,width:8,height:8,
                borderRadius:"50%",background:gpsStatus==="denied"?"#e24b4a":"#EF9F27",
                border:"1.5px solid #0d0d0d"}}/>
            )}
          </button>
        </div>
        {openReqs.length>0&&(
          <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:400,
            background:"rgba(13,13,13,0.97)",borderTop:"0.5px solid rgba(255,255,255,0.07)",
            padding:"10px 14px 12px",maxHeight:160,overflowY:"auto"}}>
            <div style={{color:"#4a9eff",fontSize:11,fontWeight:700,marginBottom:6}}>
              Check requests nearby — {openReqs.length} open
            </div>
            {openReqs.slice(0,3).map(req=>(
              <div key={req.id} style={{display:"flex",alignItems:"center",gap:10,
                borderTop:"0.5px solid rgba(255,255,255,0.05)",padding:"7px 0"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"#534AB7",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10,color:"#CECBF6",fontWeight:700,flexShrink:0}}>CK</div>
                <div>
                  <div style={{fontSize:11,color:"#ddd",fontWeight:600}}>{req.target_label||"Nearby"}</div>
                  <div style={{fontSize:10,color:"#666"}}>{req.window_minutes} min · {req.credits_cost} pts</div>
                </div>
                <button style={{background:"#534AB7",border:"none",borderRadius:7,marginLeft:"auto",
                  padding:"5px 10px",color:"#CECBF6",fontSize:10,cursor:"pointer",fontWeight:600}}>
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}
      </>)}

      {showGpsPopup&&!pickingLocation&&(
        <div onClick={()=>setShowGpsPopup(false)} style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",
          zIndex:2000,display:"flex",alignItems:"flex-end",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            width:"100%",background:"#1a1a1a",
            borderRadius:"20px 20px 0 0",
            border:"0.5px solid rgba(255,255,255,0.09)",
            padding:"20px 20px calc(24px + env(safe-area-inset-bottom,0px))",
          }}>
            <div style={{width:36,height:4,background:"#2e2e2e",borderRadius:2,margin:"0 auto 20px"}}/>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{
                width:64,height:64,borderRadius:"50%",
                background:gpsStatus==="denied"?"rgba(226,75,74,0.12)":"rgba(239,159,39,0.12)",
                border:`1.5px solid ${gpsStatus==="denied"?"rgba(226,75,74,0.3)":"rgba(239,159,39,0.3)"}`,
                display:"inline-flex",alignItems:"center",justifyContent:"center",
                fontSize:28,marginBottom:12,
              }}>
                {gpsStatus==="denied"?"🚫":"📍"}
              </div>
              <div style={{color:"#fff",fontSize:16,fontWeight:700,marginBottom:6}}>
                {gpsStatus==="denied"?"Location access blocked":"Getting your location..."}
              </div>
              <div style={{color:"#666",fontSize:12,lineHeight:1.6,maxWidth:280,margin:"0 auto"}}>
                {gpsStatus==="denied"
                  ? <span>You blocked location access.<br/>Settings → Browser → Location → Allow</span>
                  : gpsStatus==="unavailable"
                  ? "GPS is not available on this device or connection."
                  : "Waiting for GPS signal..."}
              </div>
            </div>

            {gpsStatus==="denied"?(
              <>
                <div style={{
                  background:"rgba(226,75,74,0.08)",borderRadius:12,
                  padding:"12px 14px",marginBottom:16,
                  border:"0.5px solid rgba(226,75,74,0.2)",
                }}>
                  <div style={{color:"#ccc",fontSize:11,lineHeight:1.8}}>
                    <div>📱 <strong style={{color:"#fff"}}>iOS:</strong> Settings → Safari/Chrome → Location → Allow</div>
                    <div>🤖 <strong style={{color:"#fff"}}>Android:</strong> Settings → Apps → Browser → Permissions → Location</div>
                  </div>
                </div>
                <button onClick={requestGpsAgain} style={{
                  width:"100%",padding:"13px",borderRadius:12,border:"none",
                  background:"#4a9eff",color:"#fff",fontSize:14,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",marginBottom:10,
                }}>
                  Try again
                </button>
              </>
            ):(
              <button onClick={requestGpsAgain} disabled={gpsStatus==="pending"} style={{
                width:"100%",padding:"13px",borderRadius:12,border:"none",
                background:gpsStatus==="pending"?"#333":"#4a9eff",
                color:"#fff",fontSize:14,fontWeight:700,
                cursor:gpsStatus==="pending"?"not-allowed":"pointer",
                fontFamily:"inherit",marginBottom:10,
              }}>
                {gpsStatus==="pending"?"Getting location...":"Enable GPS"}
              </button>
            )}
            <button onClick={()=>setShowGpsPopup(false)} style={{
              width:"100%",padding:"12px",borderRadius:12,
              background:"#222",border:"0.5px solid rgba(255,255,255,0.08)",
              color:"#666",fontSize:13,fontWeight:600,
              cursor:"pointer",fontFamily:"inherit",
            }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {selectedPin&&<PinPopup pin={selectedPin} onClose={()=>setSelectedPin(null)}/>}

      {/* Force Update Modal Blockade */}
      {isRequiredToUpdate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(13,13,13,0.98)",
          zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px"
        }}>
          <div style={{
            width: "100%", maxWidth: "340px", background: "#1a1a1a",
            borderRadius: "20px", border: "0.5px solid rgba(255,255,255,0.09)",
            padding: "28px 24px", textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.7)"
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(83,74,183,0.15)", border: "1.5px solid rgba(83,74,183,0.4)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, marginBottom: 16
            }}>
              🚀
            </div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Update Required
            </div>
            <div style={{ color: "#aaa", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              A new version of the app is available. Please update to continue using the map and receiving live pins.
            </div>
            <button 
              onClick={handleUpdateRedirect} 
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: "#534AB7", color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", 
                boxShadow: "0 4px 14px rgba(83,74,183,0.4)"
              }}
            >
              Update Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
