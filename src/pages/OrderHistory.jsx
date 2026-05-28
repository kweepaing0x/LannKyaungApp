import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { getMyOrders } from "../services/supabaseService";
import { formatMMT } from "../services/supabaseService";

const STATUS_CONFIG = {
  pending:    { label:"Pending",    color:"#EF9F27", bg:"rgba(239,159,39,0.1)"  },
  confirmed:  { label:"Confirmed",  color:"#4a9eff", bg:"rgba(74,158,255,0.1)"  },
  delivering: { label:"On the way", color:"#a8f0c6", bg:"rgba(168,240,198,0.1)" },
  delivered:  { label:"Delivered",  color:"#a8f0c6", bg:"rgba(168,240,198,0.1)" },
  cancelled:  { label:"Cancelled",  color:"#e24b4a", bg:"rgba(226,75,74,0.1)"   },
};

export default function OrderHistory() {
  const { user, setActiveTab } = useAppStore();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getMyOrders(user?.id).then(d => { setOrders(d||[]); setLoading(false); });
  }, [user?.id]);

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
          cursor:"pointer", display:"flex", alignItems:"center", padding:0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize:22 }}/>
        </button>
        <div style={{ color:"#fff", fontSize:17, fontWeight:700 }}>📦 Order History</div>
      </div>

      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"12px 16px" }}>
        {loading && <div style={{ color:"#444", textAlign:"center", padding:"40px 0" }}>Loading...</div>}

        {!loading && orders.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📦</div>
            <div style={{ color:"#555", fontSize:14 }}>No orders yet</div>
            <button onClick={() => setActiveTab("market")} style={{
              marginTop:16, padding:"12px 24px", borderRadius:12, border:"none",
              background:"#534AB7", color:"#fff", fontSize:13, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit" }}>
              Go to Market
            </button>
          </div>
        )}

        {orders.map(order => {
          const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
          const isOpen = expanded === order.id;
          return (
            <div key={order.id} style={{ marginBottom:12, borderRadius:14,
              border:"0.5px solid rgba(255,255,255,0.07)",
              background:"rgba(255,255,255,0.03)", overflow:"hidden" }}>

              {/* Order header */}
              <div onClick={() => setExpanded(isOpen ? null : order.id)}
                style={{ padding:"14px 16px", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ color:"#fff", fontSize:14, fontWeight:700 }}>
                      Order #{order.order_number}
                    </span>
                    <div style={{ background:st.bg, borderRadius:6,
                      padding:"2px 8px", border:`0.5px solid ${st.color}33` }}>
                      <span style={{ color:st.color, fontSize:10, fontWeight:700 }}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <div style={{ color:"#555", fontSize:11, marginTop:3 }}>
                    {formatMMT(order.created_at)}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:"#EF9F27", fontSize:14, fontWeight:700 }}>
                    {order.total_thb} THB
                  </div>
                  <i className={`ti ti-chevron-${isOpen?"up":"down"}`}
                    style={{ fontSize:14, color:"#444" }}/>
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ borderTop:"0.5px solid rgba(255,255,255,0.05)",
                  padding:"12px 16px 16px" }}>
                  {(order.items||[]).map((item, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between",
                      padding:"5px 0", color:"#888", fontSize:12 }}>
                      <span>{item.emoji} {item.name_my} × {item.qty} {item.unit}</span>
                      <span style={{ color:"#ccc" }}>{item.subtotal} THB</span>
                    </div>
                  ))}
                  {order.custom_note && (
                    <div style={{ color:"#888", fontSize:12, marginTop:6,
                      padding:"8px", background:"rgba(255,255,255,0.03)",
                      borderRadius:8 }}>
                      ✏️ {order.custom_note}
                    </div>
                  )}
                  {order.remark && (
                    <div style={{ color:"#555", fontSize:11, marginTop:6 }}>
                      Note: {order.remark}
                    </div>
                  )}
                  <div style={{ display:"flex", justifyContent:"space-between",
                    marginTop:10, paddingTop:10,
                    borderTop:"0.5px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color:"#555", fontSize:12 }}>Delivery fee</span>
                    <span style={{ color:"#EF9F27", fontSize:12 }}>{order.delivery_fee} THB</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                    <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>Total</span>
                    <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>{order.total_thb} THB</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
