import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import {
  getMarketCategories, getMarketProducts, getAllOrders,
  createMarketProduct, updateMarketProduct, toggleMarketProduct,
  updateOrderStatus,
} from "../services/supabaseService";
import { formatMMT } from "../services/supabaseService";

const STATUS_CONFIG = {
  pending:    { label:"Pending",    color:"#EF9F27" },
  confirmed:  { label:"Confirmed",  color:"#4a9eff" },
  delivering: { label:"On the way", color:"#a8f0c6" },
  delivered:  { label:"Delivered",  color:"#888"    },
  cancelled:  { label:"Cancelled",  color:"#e24b4a" },
};
const STATUSES = ["pending","confirmed","delivering","delivered","cancelled"];
const UNITS    = ["kg","pack","bunch","piece","box","bottle"];

// ── Reusable field ────────────────────────────────────────────
function Field({ label, value, onChange, type="text", placeholder="" }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ color:"#555", fontSize:10, fontWeight:600, marginBottom:4 }}>
        {label.toUpperCase()}
      </div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width:"100%", background:"#111", border:"0.5px solid #2a2a2a",
          borderRadius:8, padding:"10px 12px", color:"#fff", fontSize:13,
          fontFamily:"inherit", outline:"none" }}/>
    </div>
  );
}

// ── Product form ──────────────────────────────────────────────
function ProductForm({ categories, onSave, onCancel, initial }) {
  const [form, setForm] = useState(initial || {
    category_id:"", name_my:"", name_en:"", emoji:"🛒",
    price_thb:"", unit:"kg", default_qty:"1", qty_step:"0.5",
  });
  const f = (k) => (v) => setForm(p=>({...p,[k]:v}));

  return (
    <div style={{ background:"#1a1a1a", borderRadius:14,
      border:"0.5px solid rgba(255,255,255,0.08)", padding:"16px", marginBottom:12 }}>
      <div style={{ color:"#fff", fontSize:14, fontWeight:700, marginBottom:14 }}>
        {initial ? "Edit Product" : "Add Product"}
      </div>

      {/* Category select */}
      <div style={{ marginBottom:10 }}>
        <div style={{ color:"#555", fontSize:10, fontWeight:600, marginBottom:4 }}>CATEGORY</div>
        <select value={form.category_id} onChange={e=>setForm(p=>({...p,category_id:e.target.value}))}
          style={{ width:"100%", background:"#111", border:"0.5px solid #2a2a2a",
            borderRadius:8, padding:"10px 12px", color:"#fff", fontSize:13,
            fontFamily:"inherit", outline:"none" }}>
          <option value="">Select category</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.name_my}</option>)}
        </select>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <Field label="Name (Myanmar)" value={form.name_my} onChange={f("name_my")} placeholder="ငရုတ်သီး"/>
        <Field label="Emoji" value={form.emoji} onChange={f("emoji")} placeholder="🌶️"/>
        <Field label="Price (THB)" value={form.price_thb} onChange={f("price_thb")} type="number" placeholder="30"/>
        <div style={{ marginBottom:10 }}>
          <div style={{ color:"#555", fontSize:10, fontWeight:600, marginBottom:4 }}>UNIT</div>
          <select value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))}
            style={{ width:"100%", background:"#111", border:"0.5px solid #2a2a2a",
              borderRadius:8, padding:"10px 12px", color:"#fff", fontSize:13,
              fontFamily:"inherit", outline:"none" }}>
            {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <Field label="Default Qty" value={form.default_qty} onChange={f("default_qty")} type="number" placeholder="1"/>
        <Field label="Qty Step" value={form.qty_step} onChange={f("qty_step")} type="number" placeholder="0.5"/>
      </div>

      <div style={{ display:"flex", gap:8, marginTop:6 }}>
        <button onClick={onCancel} style={{ flex:1, padding:"10px", borderRadius:10,
          border:"0.5px solid rgba(255,255,255,0.1)", background:"#111",
          color:"#666", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
          Cancel
        </button>
        <button onClick={()=>onSave(form)} style={{ flex:2, padding:"10px", borderRadius:10,
          border:"none", background:"#534AB7", color:"#fff",
          fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          Save Product
        </button>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { setActiveTab } = useAppStore();
  const [tab,        setTab]        = useState("orders");
  const [categories, setCategories] = useState([]);
  const [products,   setProducts]   = useState([]);
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editProduct,setEditProduct]= useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [orderFilter,   setOrderFilter]   = useState("pending");

  useEffect(() => {
    Promise.all([getMarketCategories(), getMarketProducts(), getAllOrders()])
      .then(([cats,prods,ords]) => {
        setCategories(cats||[]);
        setProducts(prods||[]);
        setOrders(ords||[]);
        setLoading(false);
      });
  }, []);

  async function handleSaveProduct(form) {
    try {
      if (editProduct) {
        await updateMarketProduct(editProduct.id, {
          category_id: form.category_id,
          name_my:     form.name_my,
          name_en:     form.name_en || null,
          emoji:       form.emoji,
          price_thb:   Number(form.price_thb),
          unit:        form.unit,
          default_qty: Number(form.default_qty),
          qty_step:    Number(form.qty_step),
        });
      } else {
        await createMarketProduct({
          category_id: form.category_id,
          name_my:     form.name_my,
          name_en:     form.name_en || null,
          emoji:       form.emoji,
          price_thb:   Number(form.price_thb),
          unit:        form.unit,
          default_qty: Number(form.default_qty),
          qty_step:    Number(form.qty_step),
        });
      }
      const prods = await getMarketProducts();
      setProducts(prods||[]);
      setShowForm(false);
      setEditProduct(null);
    } catch(e) { alert("Error: " + e.message); }
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

  const filteredOrders = orders.filter(o => orderFilter === "all" || o.status === orderFilter);

  return (
    <div style={{ position:"absolute", inset:0, background:"#0d0d0d",
      display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ flexShrink:0, padding:"14px 16px 10px",
        borderBottom:"0.5px solid rgba(255,255,255,0.07)",
        display:"flex", alignItems:"center", gap:12,
        paddingTop:"calc(14px + env(safe-area-inset-top,0px))" }}>
        <button onClick={()=>setActiveTab("map")} style={{
          background:"none", border:"none", color:"#fff",
          cursor:"pointer", display:"flex", alignItems:"center", padding:0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize:22 }}/>
        </button>
        <div style={{ color:"#fff", fontSize:17, fontWeight:700 }}>⚙️ Admin Panel</div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"0.5px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
        {[
          { key:"orders",     label:"📦 Orders"     },
          { key:"products",   label:"🥕 Products"   },
          { key:"categories", label:"📂 Categories" },
        ].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            flex:1, padding:"12px 0", background:"none", border:"none",
            borderBottom:`2px solid ${tab===t.key?"#534AB7":"transparent"}`,
            color:tab===t.key?"#fff":"#555", fontSize:11, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ flex:1,display:"flex",alignItems:"center",
          justifyContent:"center",color:"#444",fontSize:13 }}>Loading...</div>
      ) : (
        <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"12px 16px" }}>

          {/* ── ORDERS TAB ── */}
          {tab==="orders" && (
            <>
              {/* Status filter */}
              <div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto", paddingBottom:4 }}>
                {["all","pending","confirmed","delivering","delivered","cancelled"].map(s=>(
                  <button key={s} onClick={()=>setOrderFilter(s)} style={{
                    padding:"5px 12px", borderRadius:20, border:"none",
                    background:orderFilter===s?"#534AB7":"rgba(255,255,255,0.06)",
                    color:orderFilter===s?"#fff":"#666",
                    fontSize:10, fontWeight:700, cursor:"pointer",
                    fontFamily:"inherit", whiteSpace:"nowrap" }}>
                    {s.charAt(0).toUpperCase()+s.slice(1)}
                    {s!=="all"&&` (${orders.filter(o=>o.status===s).length})`}
                  </button>
                ))}
              </div>

              {filteredOrders.length===0 && (
                <div style={{ color:"#444",textAlign:"center",padding:"40px 0",fontSize:13 }}>
                  No orders
                </div>
              )}

              {filteredOrders.map(order=>{
                const st = STATUS_CONFIG[order.status]||STATUS_CONFIG.pending;
                return (
                  <div key={order.id} style={{ marginBottom:12, borderRadius:14,
                    border:"0.5px solid rgba(255,255,255,0.07)",
                    background:"rgba(255,255,255,0.03)", padding:"14px 16px" }}>

                    {/* Order info */}
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                      <div>
                        <div style={{ color:"#fff",fontSize:14,fontWeight:700 }}>
                          #{order.order_number} · {order.customer_name}
                        </div>
                        <div style={{ color:"#555",fontSize:11,marginTop:2 }}>
                          📞 {order.customer_phone}
                        </div>
                        <div style={{ color:"#555",fontSize:11 }}>
                          🕐 {formatMMT(order.created_at)}
                        </div>
                        {order.delivery_lat&&order.delivery_lng&&(
                          <a href={`https://maps.google.com/?q=${order.delivery_lat},${order.delivery_lng}`}
                            target="_blank" rel="noreferrer"
                            style={{ color:"#4a9eff",fontSize:11,textDecoration:"none" }}>
                            📍 View on map
                          </a>
                        )}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ color:"#EF9F27",fontSize:14,fontWeight:700 }}>
                          {order.total_thb} THB
                        </div>
                        <div style={{ color:st.color,fontSize:10,fontWeight:700,marginTop:4 }}>
                          {st.label}
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div style={{ borderTop:"0.5px solid rgba(255,255,255,0.05)",
                      paddingTop:8, marginBottom:10 }}>
                      {(order.items||[]).map((item,i)=>(
                        <div key={i} style={{ color:"#888",fontSize:12,padding:"2px 0" }}>
                          {item.emoji} {item.name_my} × {item.qty} {item.unit} — {item.subtotal} THB
                        </div>
                      ))}
                      {order.custom_note&&(
                        <div style={{ color:"#888",fontSize:12,marginTop:4 }}>
                          ✏️ {order.custom_note}
                        </div>
                      )}
                      {order.remark&&(
                        <div style={{ color:"#555",fontSize:11,marginTop:4 }}>
                          Note: {order.remark}
                        </div>
                      )}
                    </div>

                    {/* Status update */}
                    <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                      {STATUSES.filter(s=>s!==order.status).map(s=>(
                        <button key={s} disabled={updatingOrder===order.id}
                          onClick={()=>handleOrderStatus(order.id,s)}
                          style={{ padding:"6px 12px",borderRadius:8,border:"none",
                            background:"rgba(83,74,183,0.2)",
                            border:"0.5px solid rgba(83,74,183,0.3)",
                            color:"#CECBF6",fontSize:10,fontWeight:700,
                            cursor:"pointer",fontFamily:"inherit" }}>
                          → {STATUS_CONFIG[s]?.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── PRODUCTS TAB ── */}
          {tab==="products" && (
            <>
              {!showForm&&!editProduct&&(
                <button onClick={()=>setShowForm(true)} style={{
                  width:"100%",padding:"12px",borderRadius:12,border:"none",
                  background:"#534AB7",color:"#fff",fontSize:13,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",marginBottom:14 }}>
                  + Add Product
                </button>
              )}

              {(showForm||editProduct)&&(
                <ProductForm
                  categories={categories.filter(c=>c.id!=="custom")}
                  initial={editProduct}
                  onSave={handleSaveProduct}
                  onCancel={()=>{setShowForm(false);setEditProduct(null);}}
                />
              )}

              {products.map(p=>(
                <div key={p.id} style={{ display:"flex",alignItems:"center",gap:10,
                  padding:"12px",marginBottom:8,borderRadius:12,
                  background:"rgba(255,255,255,0.03)",
                  border:"0.5px solid rgba(255,255,255,0.07)",
                  opacity:p.is_active?1:0.4 }}>
                  <span style={{ fontSize:24,flexShrink:0 }}>{p.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ color:"#fff",fontSize:13,fontWeight:600 }}>{p.name_my}</div>
                    <div style={{ color:"#EF9F27",fontSize:11 }}>
                      {p.price_thb} THB / {p.unit}
                    </div>
                    <div style={{ color:"#444",fontSize:10 }}>
                      {categories.find(c=>c.id===p.category_id)?.name_my}
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:6 }}>
                    <button onClick={()=>setEditProduct(p)} style={{
                      padding:"6px 10px",borderRadius:8,border:"0.5px solid #333",
                      background:"#111",color:"#888",fontSize:10,
                      cursor:"pointer",fontFamily:"inherit" }}>Edit</button>
                    <button onClick={()=>handleToggleProduct(p.id,p.is_active)} style={{
                      padding:"6px 10px",borderRadius:8,border:"none",
                      background:p.is_active?"rgba(226,75,74,0.15)":"rgba(168,240,198,0.15)",
                      color:p.is_active?"#e24b4a":"#a8f0c6",
                      fontSize:10,cursor:"pointer",fontFamily:"inherit" }}>
                      {p.is_active?"Hide":"Show"}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── CATEGORIES TAB ── */}
          {tab==="categories" && (
            <>
              <div style={{ color:"#555",fontSize:11,lineHeight:1.6,marginBottom:14 }}>
                Categories are managed here. To add new ones, insert directly in Supabase
                → market_categories table.
              </div>
              {categories.map(cat=>(
                <div key={cat.id} style={{ display:"flex",alignItems:"center",gap:12,
                  padding:"14px",marginBottom:8,borderRadius:12,
                  background:"rgba(255,255,255,0.03)",
                  border:"0.5px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontSize:28 }}>{cat.emoji}</span>
                  <div>
                    <div style={{ color:"#fff",fontSize:14,fontWeight:600 }}>{cat.name_my}</div>
                    <div style={{ color:"#555",fontSize:11 }}>{cat.name_en}</div>
                  </div>
                  <div style={{ marginLeft:"auto",
                    color:cat.is_active?"#a8f0c6":"#444",fontSize:10,fontWeight:700 }}>
                    {cat.is_active?"● Active":"● Hidden"}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
