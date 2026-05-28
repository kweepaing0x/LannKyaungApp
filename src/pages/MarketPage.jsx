import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { getMarketCategories, getMarketProducts } from "../services/supabaseService";

const UNIT_LABELS = { kg:"kg", pack:"ထုပ်", bunch:"စည်း", piece:"ခု", box:"သေတ္တာ", bottle:"ပုလင်း" };

function QtyControl({ product, qty, onChange }) {
  const step = product.qty_step || 0.5;
  const unit = UNIT_LABELS[product.unit] || product.unit;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <button
        onClick={() => onChange(Math.max(0, +(qty - step).toFixed(2)))}
        style={{ width:32,height:32,borderRadius:10,border:"0.5px solid #333",
          background:"#1a1a1a",color:"#fff",fontSize:18,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
      <div style={{ textAlign:"center", minWidth:48 }}>
        <div style={{ color:"#fff", fontSize:14, fontWeight:700 }}>{qty}</div>
        <div style={{ color:"#555", fontSize:9 }}>{unit}</div>
      </div>
      <button
        onClick={() => onChange(+(qty + step).toFixed(2))}
        style={{ width:32,height:32,borderRadius:10,border:"0.5px solid #534AB7",
          background:"rgba(83,74,183,0.2)",color:"#CECBF6",fontSize:18,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
    </div>
  );
}

export default function MarketPage() {
  const { setActiveTab, cart, addToCart, customNote, setCustomNote, adminConfig } = useAppStore();
  const [categories,   setCategories]   = useState([]);
  const [products,     setProducts]     = useState([]);
  const [selectedCat,  setSelectedCat]  = useState(null);
  const [loading,      setLoading]      = useState(true);

  const deliveryFee = adminConfig?.delivery_fee_thb ?? 100;

  useEffect(() => {
    Promise.all([getMarketCategories(), getMarketProducts()])
      .then(([cats, prods]) => {
        setCategories(cats || []);
        setProducts(prods || []);
        setLoading(false);
      });
  }, []);

  const filteredProducts = selectedCat
    ? products.filter(p => p.category_id === selectedCat)
    : [];

  const cartTotal   = cart.reduce((s, i) => s + (i.product.price_thb * i.qty), 0);
  const cartCount   = cart.reduce((s, i) => s + 1, 0) + (customNote ? 1 : 0);
  const isCustom    = selectedCat === "custom";

  function getCartQty(productId) {
    return cart.find(i => i.product.id === productId)?.qty || 0;
  }

  function handleQtyChange(product, qty) {
    addToCart(product, qty);
  }

  return (
    <div style={{ position:"absolute", inset:0, background:"#0d0d0d",
      display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ flexShrink:0, padding:"14px 16px 10px",
        borderBottom:"0.5px solid rgba(255,255,255,0.07)",
        display:"flex", alignItems:"center", gap:12,
        paddingTop:"calc(14px + env(safe-area-inset-top,0px))" }}>
        <button onClick={() => setActiveTab("map")} style={{
          background:"none", border:"none", color:"#fff",
          cursor:"pointer", fontSize:22, display:"flex",
          alignItems:"center", padding:0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize:22 }}/>
        </button>
        <div>
          <div style={{ color:"#fff", fontSize:17, fontWeight:700 }}>🛒 စျေးဈေး</div>
          <div style={{ color:"#555", fontSize:11 }}>Fresh market delivery</div>
        </div>
        {cartCount > 0 && (
          <div style={{ marginLeft:"auto", background:"rgba(168,240,198,0.1)",
            border:"0.5px solid rgba(168,240,198,0.3)", borderRadius:20,
            padding:"4px 12px", cursor:"pointer" }}
            onClick={() => setActiveTab("checkout")}>
            <span style={{ color:"#a8f0c6", fontSize:11, fontWeight:700 }}>
              🛒 {cartCount} items · {cartTotal.toFixed(0)} THB →
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ flex:1, display:"flex", alignItems:"center",
          justifyContent:"center", color:"#444", fontSize:13 }}>Loading...</div>
      ) : (
        <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>

          {/* Category grid */}
          {!selectedCat && (
            <div style={{ padding:"20px 16px" }}>
              <div style={{ color:"#555", fontSize:11, fontWeight:600, marginBottom:14 }}>
                SELECT CATEGORY
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCat(cat.id)} style={{
                    background:"rgba(255,255,255,0.04)",
                    border:"0.5px solid rgba(255,255,255,0.08)",
                    borderRadius:16, padding:"20px 16px",
                    cursor:"pointer", fontFamily:"inherit",
                    display:"flex", flexDirection:"column",
                    alignItems:"center", gap:8,
                  }}>
                    <span style={{ fontSize:40 }}>{cat.emoji}</span>
                    <span style={{ color:"#fff", fontSize:14, fontWeight:700 }}>{cat.name_my}</span>
                    <span style={{ color:"#555", fontSize:10 }}>{cat.name_en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product list */}
          {selectedCat && !isCustom && (
            <div style={{ padding:"0 16px 120px" }}>
              <button onClick={() => setSelectedCat(null)} style={{
                display:"flex", alignItems:"center", gap:6,
                background:"none", border:"none", color:"#534AB7",
                cursor:"pointer", fontFamily:"inherit",
                padding:"14px 0", fontSize:13, fontWeight:600 }}>
                <i className="ti ti-chevron-left" style={{ fontSize:16 }}/>
                Back to categories
              </button>
              {filteredProducts.length === 0 && (
                <div style={{ color:"#444", fontSize:13, textAlign:"center", padding:"40px 0" }}>
                  No products in this category yet.
                </div>
              )}
              {filteredProducts.map(product => {
                const qty = getCartQty(product.id);
                return (
                  <div key={product.id} style={{
                    display:"flex", alignItems:"center", gap:12,
                    padding:"14px 0",
                    borderBottom:"0.5px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize:32, flexShrink:0 }}>{product.emoji}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ color:"#fff", fontSize:14, fontWeight:600 }}>{product.name_my}</div>
                      <div style={{ color:"#EF9F27", fontSize:12, fontWeight:700, marginTop:2 }}>
                        {product.price_thb} THB / {UNIT_LABELS[product.unit]||product.unit}
                      </div>
                    </div>
                    {qty > 0
                      ? <QtyControl product={product} qty={qty}
                          onChange={q => handleQtyChange(product, q)}/>
                      : <button onClick={() => handleQtyChange(product, product.default_qty || 1)}
                          style={{ padding:"8px 16px", borderRadius:10, border:"none",
                            background:"#534AB7", color:"#fff", fontSize:12,
                            fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                          + Add
                        </button>
                    }
                  </div>
                );
              })}
            </div>
          )}

          {/* Custom order */}
          {selectedCat && isCustom && (
            <div style={{ padding:"0 16px 120px" }}>
              <button onClick={() => setSelectedCat(null)} style={{
                display:"flex", alignItems:"center", gap:6,
                background:"none", border:"none", color:"#534AB7",
                cursor:"pointer", fontFamily:"inherit",
                padding:"14px 0", fontSize:13, fontWeight:600 }}>
                <i className="ti ti-chevron-left" style={{ fontSize:16 }}/>
                Back to categories
              </button>
              <div style={{ color:"#555", fontSize:11, fontWeight:600, marginBottom:10 }}>
                CUSTOM ORDER
              </div>
              <div style={{ color:"#888", fontSize:12, lineHeight:1.6, marginBottom:14 }}>
                မှာယူလိုသောပစ္စည်းကို မြန်မာဘာသာဖြင့် ရေးသားပါ။
                ဥပမာ - "ငရုတ်သီး 1kg, ကြက်သား 2kg"
              </div>
              <textarea
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                placeholder="မှာယူလိုသောပစ္စည်း ..."
                rows={5}
                style={{ width:"100%", background:"#111",
                  border:"0.5px solid #2a2a2a", borderRadius:12,
                  padding:"14px", color:"#fff", fontSize:14,
                  fontFamily:"inherit", outline:"none", resize:"vertical" }}
              />
              {customNote.trim() && (
                <button onClick={() => setActiveTab("checkout")} style={{
                  width:"100%", padding:"14px", borderRadius:12, border:"none",
                  background:"#534AB7", color:"#fff", fontSize:14, fontWeight:700,
                  cursor:"pointer", fontFamily:"inherit", marginTop:16,
                  boxShadow:"0 4px 14px rgba(83,74,183,0.4)" }}>
                  Proceed to Checkout →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sticky cart bar */}
      {cartCount > 0 && selectedCat !== "custom" && (
        <div style={{ position:"absolute", bottom:0, left:0, right:0,
          background:"rgba(13,13,13,0.97)",
          borderTop:"0.5px solid rgba(255,255,255,0.08)",
          padding:"12px 16px calc(16px + env(safe-area-inset-bottom,0px))" }}>

          {/* Notice */}
          <div style={{ color:"#555", fontSize:10, textAlign:"center",
            lineHeight:1.6, marginBottom:10 }}>
            မှာယူသောအစားအသောက်မှာ မမှားစေရန် delivery မှ အတည်ပြုဖုန်းဆက်ပါမည်။
          </div>

          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:8 }}>
            <span style={{ color:"#888", fontSize:12 }}>Subtotal</span>
            <span style={{ color:"#fff", fontSize:12, fontWeight:600 }}>
              {cartTotal.toFixed(0)} THB
            </span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:12 }}>
            <span style={{ color:"#888", fontSize:12 }}>Delivery fee</span>
            <span style={{ color:"#EF9F27", fontSize:12, fontWeight:600 }}>
              {deliveryFee} THB
            </span>
          </div>

          <button onClick={() => setActiveTab("checkout")} style={{
            width:"100%", padding:"14px", borderRadius:12, border:"none",
            background:"linear-gradient(135deg,#a8f0c6,#4a9eff)",
            color:"#0d0d0d", fontSize:14, fontWeight:800,
            cursor:"pointer", fontFamily:"inherit" }}>
            🛒 Checkout · {(cartTotal + deliveryFee).toFixed(0)} THB
          </button>
        </div>
      )}
    </div>
  );
}
