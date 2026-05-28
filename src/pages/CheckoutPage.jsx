import { useState, useRef } from "react";
import { useAppStore } from "../store";
import { placeMarketOrder } from "../services/supabaseService";

export default function CheckoutPage() {
  const {
    user, userDoc, adminConfig,
    cart, customNote, clearCart, setCustomNote,
    savedCustomerName,  setSavedCustomerName,
    savedCustomerPhone, setSavedCustomerPhone,
    savedDeliveryLat,   setSavedDeliveryLat,
    savedDeliveryLng,   setSavedDeliveryLng,
    setActiveTab,
  } = useAppStore();

  const [name,    setName]    = useState(savedCustomerName  || userDoc?.display_name || "");
  const [phone,   setPhone]   = useState(savedCustomerPhone || userDoc?.phone || "");
  const [remark,  setRemark]  = useState("");
  const [lat,     setLat]     = useState(savedDeliveryLat);
  const [lng,     setLng]     = useState(savedDeliveryLng);
  const [gettingGps, setGettingGps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [orderNum, setOrderNum] = useState(null);
  const [error,   setError]   = useState(null);

  const deliveryFee = adminConfig?.delivery_fee_thb ?? 100;
  const subtotal    = cart.reduce((s, i) => s + i.product.price_thb * i.qty, 0);
  const total       = subtotal + (cart.length > 0 || customNote ? deliveryFee : 0);

  const UNIT_LABELS = { kg:"kg", pack:"ထုပ်", bunch:"စည်း", piece:"ခု", box:"သေတ္တာ", bottle:"ပုလင်း" };

  function getGPS() {
    if (!navigator.geolocation) return alert("GPS not available");
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setSavedDeliveryLat(pos.coords.latitude);
        setSavedDeliveryLng(pos.coords.longitude);
        setGettingGps(false);
      },
      () => { setGettingGps(false); alert("Could not get GPS location"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handlePlaceOrder() {
    if (!name.trim())  return setError("Please enter your name");
    if (!phone.trim()) return setError("Please enter your phone number");
    if (!lat || !lng)  return setError("Please set your delivery location via GPS");
    if (cart.length === 0 && !customNote.trim()) return setError("Your cart is empty");

    setError(null);
    setLoading(true);

    // Save customer info
    setSavedCustomerName(name);
    setSavedCustomerPhone(phone);

    try {
      const order = await placeMarketOrder({
        userUid:      user.id,
        customerName: name,
        customerPhone: phone,
        deliveryLat:  lat,
        deliveryLng:  lng,
        items:        cart.map(i => ({
          id:       i.product.id,
          name_my:  i.product.name_my,
          emoji:    i.product.emoji,
          qty:      i.qty,
          unit:     UNIT_LABELS[i.product.unit] || i.product.unit,
          price_thb: i.product.price_thb,
          subtotal: +(i.product.price_thb * i.qty).toFixed(2),
        })),
        customNote:   customNote || null,
        remark:       remark || null,
        deliveryFee,
        subtotalThb:  subtotal,
        totalThb:     total,
      });

      setOrderNum(order.order_number);
      clearCart();
      setCustomNote("");
      setDone(true);
    } catch(e) {
      setError("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ─────────────────────────────────────────
  if (done) return (
    <div style={{ position:"absolute", inset:0, background:"#0d0d0d",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:24, textAlign:"center" }}>
      <div style={{ fontSize:60, marginBottom:16 }}>✅</div>
      <div style={{ color:"#fff", fontSize:20, fontWeight:800, marginBottom:8 }}>
        Order Placed!
      </div>
      <div style={{ color:"#a8f0c6", fontSize:14, fontWeight:700, marginBottom:8 }}>
        Order #{orderNum}
      </div>
      <div style={{ color:"#666", fontSize:13, lineHeight:1.7, marginBottom:32, maxWidth:280 }}>
        Delivery မှ အတည်ပြုဖုန်းဆက်ပါမည်။{"\n"}
        ဖုန်းကို အဆင်သင့် ကိုင်ထားပေးပါ။
      </div>
      <button onClick={() => setActiveTab("map")} style={{
        padding:"14px 40px", borderRadius:12, border:"none",
        background:"#534AB7", color:"#fff", fontSize:14, fontWeight:700,
        cursor:"pointer", fontFamily:"inherit",
        boxShadow:"0 4px 14px rgba(83,74,183,0.4)" }}>
        Back to Map
      </button>
      <button onClick={() => setActiveTab("orders")} style={{
        marginTop:12, padding:"12px 40px", borderRadius:12,
        border:"0.5px solid rgba(255,255,255,0.1)",
        background:"transparent", color:"#888", fontSize:13,
        cursor:"pointer", fontFamily:"inherit" }}>
        View Order History
      </button>
    </div>
  );

  return (
    <div style={{ position:"absolute", inset:0, background:"#0d0d0d",
      display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ flexShrink:0, padding:"14px 16px 10px",
        borderBottom:"0.5px solid rgba(255,255,255,0.07)",
        display:"flex", alignItems:"center", gap:12,
        paddingTop:"calc(14px + env(safe-area-inset-top,0px))" }}>
        <button onClick={() => setActiveTab("market")} style={{
          background:"none", border:"none", color:"#fff",
          cursor:"pointer", display:"flex", alignItems:"center", padding:0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize:22 }}/>
        </button>
        <div style={{ color:"#fff", fontSize:17, fontWeight:700 }}>Checkout</div>
      </div>

      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch",
        padding:"16px 20px", paddingBottom:"calc(100px + env(safe-area-inset-bottom,0px))" }}>

        {/* Order summary */}
        <div style={{ marginBottom:20 }}>
          <div style={{ color:"#555", fontSize:11, fontWeight:600, marginBottom:10 }}>
            ORDER SUMMARY
          </div>
          {cart.map(i => (
            <div key={i.product.id} style={{ display:"flex", justifyContent:"space-between",
              padding:"8px 0", borderBottom:"0.5px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color:"#ccc", fontSize:13 }}>
                {i.product.emoji} {i.product.name_my} × {i.qty} {UNIT_LABELS[i.product.unit]||i.product.unit}
              </span>
              <span style={{ color:"#fff", fontSize:13, fontWeight:600 }}>
                {(i.product.price_thb * i.qty).toFixed(0)} THB
              </span>
            </div>
          ))}
          {customNote && (
            <div style={{ padding:"8px 0", borderBottom:"0.5px solid rgba(255,255,255,0.05)" }}>
              <div style={{ color:"#888", fontSize:11, marginBottom:4 }}>Custom order:</div>
              <div style={{ color:"#ccc", fontSize:13 }}>✏️ {customNote}</div>
            </div>
          )}
        </div>

        {/* Customer info */}
        <div style={{ marginBottom:20 }}>
          <div style={{ color:"#555", fontSize:11, fontWeight:600, marginBottom:10 }}>
            DELIVERY INFO
          </div>

          {[
            { label:"Name", value:name, set:setName, placeholder:"Your name" },
            { label:"Phone", value:phone, set:setPhone, placeholder:"09 xxx xxxx", type:"tel" },
          ].map(({ label, value, set, placeholder, type }) => (
            <div key={label} style={{ marginBottom:12 }}>
              <div style={{ color:"#666", fontSize:11, marginBottom:5 }}>{label}</div>
              <input
                type={type || "text"}
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                style={{ width:"100%", background:"#111",
                  border:"0.5px solid #2a2a2a", borderRadius:10,
                  padding:"12px 14px", color:"#fff", fontSize:13,
                  fontFamily:"inherit", outline:"none" }}
              />
            </div>
          ))}

          {/* GPS location */}
          <div style={{ marginBottom:12 }}>
            <div style={{ color:"#666", fontSize:11, marginBottom:5 }}>Delivery Location</div>
            {lat && lng ? (
              <div style={{ background:"rgba(168,240,198,0.08)", borderRadius:10,
                padding:"12px 14px", border:"0.5px solid rgba(168,240,198,0.2)",
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ color:"#a8f0c6", fontSize:12, fontWeight:600 }}>📍 Location set</div>
                  <div style={{ color:"#555", fontSize:10, fontFamily:"monospace", marginTop:2 }}>
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </div>
                </div>
                <button onClick={getGPS} style={{
                  background:"none", border:"0.5px solid rgba(168,240,198,0.3)",
                  borderRadius:8, padding:"6px 10px", color:"#a8f0c6",
                  fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                  Update
                </button>
              </div>
            ) : (
              <button onClick={getGPS} disabled={gettingGps} style={{
                width:"100%", padding:"13px", borderRadius:10,
                border:"0.5px solid rgba(74,158,255,0.3)",
                background:"rgba(74,158,255,0.08)", color:"#4a9eff",
                fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                {gettingGps ? "Getting GPS..." : "📍 Use my GPS location"}
              </button>
            )}
          </div>

          {/* Remark */}
          <div>
            <div style={{ color:"#666", fontSize:11, marginBottom:5 }}>
              Remark (optional)
            </div>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="Extra instructions, exclusions..."
              rows={2}
              style={{ width:"100%", background:"#111",
                border:"0.5px solid #2a2a2a", borderRadius:10,
                padding:"12px 14px", color:"#fff", fontSize:13,
                fontFamily:"inherit", outline:"none", resize:"none" }}
            />
          </div>
        </div>

        {/* Price breakdown */}
        <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12,
          border:"0.5px solid rgba(255,255,255,0.07)", padding:"14px", marginBottom:16 }}>
          {[
            { label:"Subtotal", value:`${subtotal.toFixed(0)} THB`, color:"#ccc" },
            { label:"Delivery fee", value:`${deliveryFee} THB`, color:"#EF9F27" },
            { label:"Total", value:`${total.toFixed(0)} THB`, color:"#fff", bold:true },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", justifyContent:"space-between",
              padding:"6px 0", borderBottom: row.bold?"none":"0.5px solid rgba(255,255,255,0.04)" }}>
              <span style={{ color:"#666", fontSize:row.bold?14:12 }}>{row.label}</span>
              <span style={{ color:row.color, fontSize:row.bold?15:12,
                fontWeight:row.bold?800:600 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:"rgba(226,75,74,0.1)", border:"0.5px solid rgba(226,75,74,0.3)",
            borderRadius:10, padding:"10px 14px", marginBottom:14,
            color:"#e24b4a", fontSize:12 }}>{error}</div>
        )}

        {/* Place order button */}
        <button onClick={handlePlaceOrder} disabled={loading} style={{
          width:"100%", padding:"15px", borderRadius:12, border:"none",
          background: loading ? "#333" : "linear-gradient(135deg,#a8f0c6,#4a9eff)",
          color: loading ? "#666" : "#0d0d0d",
          fontSize:15, fontWeight:800,
          cursor: loading ? "not-allowed" : "pointer", fontFamily:"inherit" }}>
          {loading ? "Placing order..." : `✓ Place Order · ${total.toFixed(0)} THB`}
        </button>

        <div style={{ color:"#444", fontSize:10, textAlign:"center",
          lineHeight:1.6, marginTop:12 }}>
          Cash on delivery · Delivery မှ ဖုန်းဆက်ပါမည်
        </div>
      </div>
    </div>
  );
}
