import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import {
  getMarketCategories, getMarketProducts, getAllOrders,
  createMarketProduct, updateMarketProduct, toggleMarketProduct,
  updateOrderStatus,
} from "../services/supabaseService";
import { supabase } from "../supabase";
import { formatMMT } from "../services/supabaseService";

const STATUS_CONFIG = {
  pending:    { label:"Pending",    color:"#EF9F27", bg:"rgba(239,159,39,0.12)",  icon:"⏳" },
  confirmed:  { label:"Confirmed",  color:"#4a9eff", bg:"rgba(74,158,255,0.12)",  icon:"✅" },
  delivering: { label:"On the way", color:"#a8f0c6", bg:"rgba(168,240,198,0.12)", icon:"🛵" },
  delivered:  { label:"Delivered",  color:"#888",    bg:"rgba(255,255,255,0.06)", icon:"📦" },
  cancelled:  { label:"Cancelled",  color:"#e24b4a", bg:"rgba(226,75,74,0.12)",  icon:"❌" },
};
const STATUS_FLOW = {
  pending:    ["confirmed","cancelled"],
  confirmed:  ["delivering","cancelled"],
  delivering: ["delivered","cancelled"],
  delivered:  [],
  cancelled:  [],
};
const UNITS = ["kg","pack","bunch","piece","box","bottle"];
const UNIT_MY = { kg:"kg", pack:"ထုပ်", bunch:"စည်း", piece:"ခု", box:"သေတ္တာ", bottle:"ပုလင်း" };

// ── Product drawer (slide up) ─────────────────────────────────
function ProductDrawer({ categories, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? {
    category_id: initial.category_id || "",
    name_my:     initial.name_my || "",
    name_en:     initial.name_en || "",
    emoji:       initial.emoji || "🛒",
    price_thb:   String(initial.price_thb || ""),
    unit:        initial.unit || "kg",
    default_qty: String(initial.default_qty || "1"),
    qty_step:    String(initial.qty_step || "0.5"),
  } : {
    category_id:"", name_my:"", name_en:"", emoji:"🛒",
    price_thb:"", unit:"kg", default_qty:"1", qty_step:"0.5",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if(!form.name_my.trim()) return alert("Product name required");
    if(!form.category_id)    return alert("Select a category");
    if(!form.price_thb)      return alert("Enter price");
    setSaving(true);
    try { await onSave(form); }
    catch(e) { alert("Error: "+e.message); setSaving(false); }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:"fixed",inset:0,
        background:"rgba(0,0,0,0.7)",zIndex:200}}/>

      {/* Drawer */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:201,
        background:"#141414",borderRadius:"20px 20px 0 0",
        border:"0.5px solid rgba(255,255,255,0.09)",
        maxHeight:"90vh",display:"flex",flexDirection:"column",
        paddingBottom:"env(safe-area-inset-bottom,0px)"}}>

        {/* Handle */}
        <div style={{width:36,height:4,background:"#2e2e2e",borderRadius:2,
          margin:"12px auto 0",flexShrink:0}}/>

        {/* Title */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"14px 20px 12px",flexShrink:0,
          borderBottom:"0.5px solid rgba(255,255,255,0.07)"}}>
          <div style={{color:"#fff",fontSize:16,fontWeight:700}}>
            {initial?"Edit Product":"Add Product"}
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",
            border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",color:"#666",fontSize:16}}>
            ×
          </button>
        </div>

        {/* Scrollable form */}
        <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"16px 20px 20px"}}>

          {/* Emoji big picker */}
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{width:72,height:72,borderRadius:20,
              background:"rgba(255,255,255,0.05)",
              border:"1.5px dashed rgba(255,255,255,0.15)",
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              fontSize:36,marginBottom:8}}>
              {form.emoji}
            </div>
            <div>
              <input value={form.emoji} onChange={e=>setForm(p=>({...p,emoji:e.target.value}))}
                placeholder="Paste emoji"
                style={{background:"#111",border:"0.5px solid #333",borderRadius:10,
                  padding:"8px 14px",color:"#fff",fontSize:16,fontFamily:"inherit",
                  outline:"none",textAlign:"center",width:120}}/>
            </div>
          </div>

          {/* Category pills */}
          <div style={{marginBottom:16}}>
            <div style={{color:"#666",fontSize:11,fontWeight:600,marginBottom:8}}>CATEGORY *</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {categories.map(c=>(
                <button key={c.id} onClick={()=>setForm(p=>({...p,category_id:c.id}))}
                  style={{padding:"8px 14px",borderRadius:20,border:"none",cursor:"pointer",
                    background:form.category_id===c.id?"linear-gradient(135deg,#534AB7,#7c6fff)":"rgba(255,255,255,0.06)",
                    color:form.category_id===c.id?"#fff":"#888",
                    fontSize:12,fontFamily:"inherit",fontWeight:form.category_id===c.id?700:400,
                    boxShadow:form.category_id===c.id?"0 2px 10px rgba(83,74,183,0.4)":"none"}}>
                  {c.emoji} {c.name_my}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div style={{marginBottom:12}}>
            <div style={{color:"#666",fontSize:11,fontWeight:600,marginBottom:6}}>NAME (MYANMAR) *</div>
            <input value={form.name_my} onChange={e=>setForm(p=>({...p,name_my:e.target.value}))}
              placeholder="ငရုတ်သီး"
              style={{width:"100%",background:"rgba(255,255,255,0.05)",
                border:"0.5px solid rgba(255,255,255,0.1)",borderRadius:12,
                padding:"13px 14px",color:"#fff",fontSize:14,
                fontFamily:"inherit",outline:"none"}}/>
          </div>

          {/* Price + Unit row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <div style={{color:"#666",fontSize:11,fontWeight:600,marginBottom:6}}>PRICE (THB) *</div>
              <input type="number" value={form.price_thb}
                onChange={e=>setForm(p=>({...p,price_thb:e.target.value}))}
                placeholder="30"
                style={{width:"100%",background:"rgba(255,255,255,0.05)",
                  border:"0.5px solid rgba(255,255,255,0.1)",borderRadius:12,
                  padding:"13px 14px",color:"#EF9F27",fontSize:14,fontWeight:700,
                  fontFamily:"inherit",outline:"none"}}/>
            </div>
            <div>
              <div style={{color:"#666",fontSize:11,fontWeight:600,marginBottom:6}}>UNIT</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {UNITS.map(u=>(
                  <button key={u} onClick={()=>setForm(p=>({...p,unit:u}))}
                    style={{padding:"6px 10px",borderRadius:8,border:"none",cursor:"pointer",
                      background:form.unit===u?"#534AB7":"rgba(255,255,255,0.06)",
                      color:form.unit===u?"#fff":"#666",
                      fontSize:10,fontFamily:"inherit",fontWeight:form.unit===u?700:400}}>
                    {UNIT_MY[u]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Default qty + step */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
            {[
              {label:"DEFAULT QTY",key:"default_qty",placeholder:"1"},
              {label:"QTY STEP",   key:"qty_step",   placeholder:"0.5"},
            ].map(({label,key,placeholder})=>(
              <div key={key}>
                <div style={{color:"#666",fontSize:11,fontWeight:600,marginBottom:6}}>{label}</div>
                <input type="number" value={form[key]}
                  onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                  placeholder={placeholder}
                  style={{width:"100%",background:"rgba(255,255,255,0.05)",
                    border:"0.5px solid rgba(255,255,255,0.1)",borderRadius:12,
                    padding:"13px 14px",color:"#fff",fontSize:14,
                    fontFamily:"inherit",outline:"none"}}/>
              </div>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving} style={{
            width:"100%",padding:"15px",borderRadius:14,border:"none",
            background:saving?"#222":"linear-gradient(135deg,#534AB7,#7c6fff)",
            color:saving?"#555":"#fff",fontSize:14,fontWeight:700,
            cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",
            boxShadow:saving?"none":"0 4px 20px rgba(83,74,183,0.4)"}}>
            {saving?"Saving...":"Save Product"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function AdminPanel() {
  const { setActiveTab } = useAppStore();
  const [tab,         setTab]         = useState("orders");
  const [categories,  setCategories]  = useState([]);
  const [products,    setProducts]    = useState([]);
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showDrawer,  setShowDrawer]  = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [updatingOrder,setUpdatingOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState("pending");
  const [newOrderIds, setNewOrderIds] = useState(new Set());

  // Load initial data
  useEffect(() => {
    Promise.all([getMarketCategories(), getMarketProducts(), getAllOrders()])
      .then(([cats,prods,ords]) => {
        setCategories(cats||[]);
        setProducts(prods||[]);
        setOrders(ords||[]);
        setLoading(false);
      });
  }, []);

  // ── Realtime orders subscription ─────────────────────────
  useEffect(() => {
    const ch = supabase.channel("admin-orders-live")
      .on("postgres_changes",
        {event:"INSERT", schema:"public", table:"market_orders"},
        (payload) => {
          const newOrder = payload.new;
          setOrders(prev => [newOrder, ...prev]);
          setNewOrderIds(ids => new Set([...ids, newOrder.id]));
          // Auto-clear highlight after 10s
          setTimeout(() => {
            setNewOrderIds(ids => { const s=new Set(ids); s.delete(newOrder.id); return s; });
          }, 10000);
        }
      )
      .on("postgres_changes",
        {event:"UPDATE", schema:"public", table:"market_orders"},
        (payload) => {
          setOrders(prev => prev.map(o => o.id===payload.new.id ? payload.new : o));
        }
      )
      .subscribe(status => console.log("Admin orders channel:", status));

    return () => supabase.removeChannel(ch);
  }, []);

  async function handleSaveProduct(form) {
    const payload = {
      category_id: form.category_id,
      name_my:     form.name_my,
      name_en:     form.name_en||null,
      emoji:       form.emoji,
      price_thb:   Number(form.price_thb),
      unit:        form.unit,
      default_qty: Number(form.default_qty),
      qty_step:    Number(form.qty_step),
    };
    if(editProduct) await updateMarketProduct(editProduct.id, payload);
    else             await createMarketProduct(payload);
    const prods = await getMarketProducts();
    setProducts(prods||[]);
    setShowDrawer(false);
    setEditProduct(null);
  }

  async function handleToggleProduct(id, current) {
    await toggleMarketProduct(id, !current);
    setProducts(p => p.map(x => x.id===id ? {...x,is_active:!current} : x));
  }

  async function handleOrderStatus(orderId, status) {
    setUpdatingOrder(orderId);
    try {
      await updateOrderStatus(orderId, status);
      setOrders(o => o.map(x => x.id===orderId ? {...x,status} : x));
    } catch(e) { alert("Error: "+e.message); }
    finally { setUpdatingOrder(null); }
  }

  const filteredOrders = orders.filter(o => orderFilter==="all" || o.status===orderFilter);
  const pendingCount   = orders.filter(o => o.status==="pending").length;

  return (
    <div style={{position:"absolute",inset:0,background:"#0d0d0d",
      display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* Header */}
      <div style={{flexShrink:0,
        background:"linear-gradient(180deg,rgba(20,20,40,0.9) 0%,transparent 100%)",
        borderBottom:"0.5px solid rgba(255,255,255,0.07)",
        paddingTop:"calc(12px + env(safe-area-inset-top,0px))"}}>

        <div style={{display:"flex",alignItems:"center",gap:12,padding:"0 16px 12px"}}>
          <button onClick={()=>setActiveTab("map")} style={{
            width:36,height:36,borderRadius:12,
            background:"rgba(255,255,255,0.06)",
            border:"0.5px solid rgba(255,255,255,0.1)",
            display:"flex",alignItems:"center",justifyContent:"center",
            cursor:"pointer",flexShrink:0}}>
            <i className="ti ti-arrow-left" style={{fontSize:18,color:"#fff"}}/>
          </button>
          <div style={{flex:1}}>
            <div style={{color:"#fff",fontSize:16,fontWeight:700}}>⚙️ Admin Panel</div>
          </div>
          {/* Live indicator */}
          <div style={{display:"flex",alignItems:"center",gap:5,
            background:"rgba(168,240,198,0.1)",borderRadius:20,padding:"4px 10px",
            border:"0.5px solid rgba(168,240,198,0.3)"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#a8f0c6",
              animation:"pulse 2s ease-in-out infinite"}}/>
            <span style={{color:"#a8f0c6",fontSize:10,fontWeight:700}}>LIVE</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",padding:"0 8px"}}>
          {[
            {key:"orders",   icon:"📦", label:"Orders",   badge:pendingCount},
            {key:"products", icon:"🥕", label:"Products", badge:0},
            {key:"categories",icon:"📂",label:"Categories",badge:0},
          ].map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{
              flex:1,padding:"8px 4px 10px",background:"none",border:"none",
              borderBottom:`2px solid ${tab===t.key?"#534AB7":"transparent"}`,
              cursor:"pointer",fontFamily:"inherit",
              display:"flex",flexDirection:"column",alignItems:"center",gap:2,
              position:"relative"}}>
              <span style={{fontSize:15}}>{t.icon}</span>
              <span style={{color:tab===t.key?"#fff":"#555",fontSize:9,fontWeight:700,letterSpacing:0.5}}>
                {t.label.toUpperCase()}
              </span>
              {t.badge>0&&(
                <div style={{position:"absolute",top:4,right:"calc(50% - 14px)",
                  background:"#e24b4a",borderRadius:"50%",
                  width:16,height:16,display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:9,color:"#fff",fontWeight:700}}>
                  {t.badge}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{flex:1,display:"flex",alignItems:"center",
          justifyContent:"center",color:"#444",fontSize:13}}>Loading...</div>
      ) : (
        <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",
          padding:"12px 16px",
          paddingBottom:"calc(20px + env(safe-area-inset-bottom,0px))"}}>

          {/* ── ORDERS TAB ── */}
          {tab==="orders"&&(
            <>
              {/* Filter pills */}
              <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
                {["all","pending","confirmed","delivering","delivered","cancelled"].map(s=>{
                  const count = s==="all" ? orders.length : orders.filter(o=>o.status===s).length;
                  return (
                    <button key={s} onClick={()=>setOrderFilter(s)} style={{
                      padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",
                      background:orderFilter===s?"#534AB7":"rgba(255,255,255,0.06)",
                      color:orderFilter===s?"#fff":"#666",
                      fontSize:10,fontWeight:700,cursor:"pointer",
                      fontFamily:"inherit",whiteSpace:"nowrap",
                      boxShadow:orderFilter===s?"0 2px 10px rgba(83,74,183,0.4)":"none"}}>
                      {STATUS_CONFIG[s]?.icon||"📋"} {s==="all"?"All":STATUS_CONFIG[s]?.label}
                      {count>0&&<span style={{marginLeft:5,opacity:0.7}}>·{count}</span>}
                    </button>
                  );
                })}
              </div>

              {filteredOrders.length===0&&(
                <div style={{textAlign:"center",padding:"60px 0"}}>
                  <div style={{fontSize:40,marginBottom:12}}>📭</div>
                  <div style={{color:"#444",fontSize:13}}>No orders</div>
                </div>
              )}

              {filteredOrders.map(order=>{
                const st      = STATUS_CONFIG[order.status]||STATUS_CONFIG.pending;
                const isNew   = newOrderIds.has(order.id);
                const nextSts = STATUS_FLOW[order.status]||[];
                return (
                  <div key={order.id} style={{
                    marginBottom:12,borderRadius:16,
                    border:`0.5px solid ${isNew?"rgba(239,159,39,0.5)":"rgba(255,255,255,0.07)"}`,
                    background:isNew?"rgba(239,159,39,0.05)":"rgba(255,255,255,0.03)",
                    overflow:"hidden",
                    boxShadow:isNew?"0 0 20px rgba(239,159,39,0.2)":"none",
                    transition:"all 0.3s ease"}}>

                    {/* New badge */}
                    {isNew&&(
                      <div style={{background:"#EF9F27",padding:"4px 14px",
                        display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:"#fff",
                          animation:"pulse 1s ease-in-out infinite"}}/>
                        <span style={{color:"#0d0d0d",fontSize:10,fontWeight:800}}>
                          NEW ORDER — Just arrived
                        </span>
                      </div>
                    )}

                    <div style={{padding:"14px 16px"}}>
                      {/* Top row */}
                      <div style={{display:"flex",justifyContent:"space-between",
                        alignItems:"flex-start",marginBottom:10}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                            <span style={{color:"#fff",fontSize:15,fontWeight:800}}>
                              #{order.order_number}
                            </span>
                            <div style={{background:st.bg,borderRadius:20,
                              padding:"3px 10px",border:`0.5px solid ${st.color}44`}}>
                              <span style={{color:st.color,fontSize:10,fontWeight:700}}>
                                {st.icon} {st.label}
                              </span>
                            </div>
                          </div>
                          <div style={{color:"#fff",fontSize:13,fontWeight:600}}>
                            {order.customer_name}
                          </div>
                          <div style={{color:"#555",fontSize:12,marginTop:2}}>
                            📞 {order.customer_phone}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{color:"#EF9F27",fontSize:16,fontWeight:800}}>
                            {order.total_thb} THB
                          </div>
                          <div style={{color:"#444",fontSize:10,marginTop:2}}>
                            {formatMMT(order.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Map link */}
                      {order.delivery_lat&&order.delivery_lng&&(
                        <a href={`https://maps.google.com/?q=${order.delivery_lat},${order.delivery_lng}`}
                          target="_blank" rel="noreferrer"
                          style={{display:"inline-flex",alignItems:"center",gap:5,
                            color:"#4a9eff",fontSize:12,textDecoration:"none",
                            background:"rgba(74,158,255,0.1)",borderRadius:8,
                            padding:"5px 10px",marginBottom:10,
                            border:"0.5px solid rgba(74,158,255,0.2)"}}>
                          📍 View delivery location →
                        </a>
                      )}

                      {/* Items */}
                      <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,
                        padding:"10px 12px",marginBottom:10,
                        border:"0.5px solid rgba(255,255,255,0.05)"}}>
                        {(order.items||[]).map((item,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",
                            padding:"3px 0",color:"#888",fontSize:12}}>
                            <span>{item.emoji} {item.name_my} × {item.qty} {item.unit}</span>
                            <span style={{color:"#ccc"}}>{item.subtotal} THB</span>
                          </div>
                        ))}
                        {order.custom_note&&(
                          <div style={{color:"#888",fontSize:12,paddingTop:4,
                            borderTop:"0.5px solid rgba(255,255,255,0.05)",marginTop:4}}>
                            ✏️ {order.custom_note}
                          </div>
                        )}
                        {order.remark&&(
                          <div style={{color:"#555",fontSize:11,marginTop:4}}>
                            Note: {order.remark}
                          </div>
                        )}
                        <div style={{display:"flex",justifyContent:"space-between",
                          marginTop:8,paddingTop:8,
                          borderTop:"0.5px solid rgba(255,255,255,0.06)"}}>
                          <span style={{color:"#555",fontSize:11}}>Delivery</span>
                          <span style={{color:"#EF9F27",fontSize:11}}>{order.delivery_fee} THB</span>
                        </div>
                      </div>

                      {/* Action buttons — only next valid statuses */}
                      {nextSts.length>0&&(
                        <div style={{display:"flex",gap:8}}>
                          {nextSts.map(s=>{
                            const sconf = STATUS_CONFIG[s];
                            const isPrimary = s!=="cancelled";
                            return (
                              <button key={s}
                                disabled={updatingOrder===order.id}
                                onClick={()=>handleOrderStatus(order.id,s)}
                                style={{
                                  flex: isPrimary?2:1,
                                  padding:"11px",borderRadius:12,border:"none",
                                  background: isPrimary
                                    ?"linear-gradient(135deg,#534AB7,#7c6fff)"
                                    :"rgba(226,75,74,0.15)",
                                  color: isPrimary?"#fff":"#e24b4a",
                                  fontSize:12,fontWeight:700,cursor:"pointer",
                                  fontFamily:"inherit",
                                  boxShadow:isPrimary?"0 2px 10px rgba(83,74,183,0.4)":"none",
                                  opacity:updatingOrder===order.id?0.5:1}}>
                                {updatingOrder===order.id?"...":`${sconf.icon} ${sconf.label}`}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── PRODUCTS TAB ── */}
          {tab==="products"&&(
            <>
              <button onClick={()=>{setEditProduct(null);setShowDrawer(true);}} style={{
                width:"100%",padding:"13px",borderRadius:14,border:"none",marginBottom:14,
                background:"linear-gradient(135deg,#534AB7,#7c6fff)",
                color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                boxShadow:"0 4px 14px rgba(83,74,183,0.4)",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <span style={{fontSize:18}}>+</span> Add New Product
              </button>

              {/* Group by category */}
              {categories.filter(c=>c.id!=="custom").map(cat=>{
                const catProds = products.filter(p=>p.category_id===cat.id);
                if(catProds.length===0) return null;
                return (
                  <div key={cat.id} style={{marginBottom:20}}>
                    <div style={{color:"#555",fontSize:11,fontWeight:700,
                      marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                      <span>{cat.emoji}</span>{cat.name_my.toUpperCase()}
                      <span style={{color:"#333"}}>· {catProds.length}</span>
                    </div>
                    {catProds.map(p=>(
                      <div key={p.id} style={{
                        display:"flex",alignItems:"center",gap:12,
                        padding:"12px 14px",marginBottom:6,borderRadius:14,
                        background:p.is_active?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.01)",
                        border:`0.5px solid ${p.is_active?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.03)"}`,
                        opacity:p.is_active?1:0.5}}>
                        <div style={{width:44,height:44,borderRadius:12,
                          background:"rgba(255,255,255,0.05)",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:22,flexShrink:0}}>
                          {p.emoji}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:"#fff",fontSize:13,fontWeight:600}}>
                            {p.name_my}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                            <span style={{color:"#EF9F27",fontSize:12,fontWeight:700}}>
                              {p.price_thb} THB
                            </span>
                            <span style={{color:"#444",fontSize:11}}>
                              / {UNIT_MY[p.unit]||p.unit}
                            </span>
                          </div>
                          <div style={{color:"#333",fontSize:10,marginTop:1}}>
                            step: {p.qty_step} · default: {p.default_qty}
                          </div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:5}}>
                          <button onClick={()=>{setEditProduct(p);setShowDrawer(true);}}
                            style={{padding:"6px 12px",borderRadius:8,
                              border:"0.5px solid rgba(255,255,255,0.1)",
                              background:"rgba(255,255,255,0.06)",
                              color:"#ccc",fontSize:10,fontWeight:600,
                              cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
                          <button onClick={()=>handleToggleProduct(p.id,p.is_active)}
                            style={{padding:"6px 12px",borderRadius:8,border:"none",
                              background:p.is_active?"rgba(226,75,74,0.12)":"rgba(168,240,198,0.12)",
                              color:p.is_active?"#e24b4a":"#a8f0c6",
                              fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                            {p.is_active?"Hide":"Show"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {products.length===0&&(
                <div style={{textAlign:"center",padding:"60px 0"}}>
                  <div style={{fontSize:40,marginBottom:12}}>🥕</div>
                  <div style={{color:"#555",fontSize:13}}>No products yet</div>
                  <div style={{color:"#444",fontSize:11,marginTop:6}}>
                    Add your first product above
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── CATEGORIES TAB ── */}
          {tab==="categories"&&(
            <>
              <div style={{background:"rgba(255,255,255,0.03)",borderRadius:12,
                padding:"12px 14px",marginBottom:14,
                border:"0.5px solid rgba(255,255,255,0.06)",
                color:"#555",fontSize:11,lineHeight:1.7}}>
                To add or edit categories, go to Supabase → market_categories table.
                Active categories appear in the market for customers.
              </div>
              {categories.map(cat=>(
                <div key={cat.id} style={{display:"flex",alignItems:"center",gap:14,
                  padding:"14px",marginBottom:8,borderRadius:14,
                  background:"rgba(255,255,255,0.03)",
                  border:"0.5px solid rgba(255,255,255,0.07)"}}>
                  <div style={{width:44,height:44,borderRadius:12,
                    background:"rgba(255,255,255,0.05)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
                    {cat.emoji}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{color:"#fff",fontSize:14,fontWeight:600}}>{cat.name_my}</div>
                    <div style={{color:"#555",fontSize:11,marginTop:2}}>{cat.name_en}</div>
                    <div style={{color:"#444",fontSize:10,marginTop:2}}>
                      {products.filter(p=>p.category_id===cat.id).length} products
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:5,
                      background:cat.is_active?"rgba(168,240,198,0.1)":"rgba(255,255,255,0.04)",
                      borderRadius:20,padding:"4px 10px",
                      border:`0.5px solid ${cat.is_active?"rgba(168,240,198,0.3)":"rgba(255,255,255,0.08)"}`}}>
                      <div style={{width:5,height:5,borderRadius:"50%",
                        background:cat.is_active?"#a8f0c6":"#444"}}/>
                      <span style={{color:cat.is_active?"#a8f0c6":"#444",fontSize:10,fontWeight:700}}>
                        {cat.is_active?"Active":"Hidden"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Product drawer */}
      {showDrawer&&(
        <ProductDrawer
          categories={categories.filter(c=>c.id!=="custom")}
          initial={editProduct}
          onSave={handleSaveProduct}
          onClose={()=>{setShowDrawer(false);setEditProduct(null);}}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(1.2); }
        }
      `}</style>
    </div>
  );
}
