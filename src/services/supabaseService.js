import { supabase, isConfigured } from "../supabase";
import dayjs from "dayjs";

// ── TIME HELPERS ──────────────────────────────────────────────
export function getNowMMT() {
  const now = new Date();
  const mmt = new Date(now.getTime() + (6.5*60 + now.getTimezoneOffset())*60000);
  return `${String(mmt.getHours()).padStart(2,"0")}:${String(mmt.getMinutes()).padStart(2,"0")} (MMT)`;
}
export function formatMMT(isoString) {
  if (!isoString) return "Unknown time";
  const d   = new Date(isoString);
  const mmt = new Date(d.getTime() + (6.5*60 + d.getTimezoneOffset())*60000);
  const h   = String(mmt.getHours()).padStart(2,"0");
  const m   = String(mmt.getMinutes()).padStart(2,"0");
  const day = mmt.toLocaleDateString("en-GB",{day:"2-digit",month:"short"});
  return `${day} · ${h}:${m} MMT`;
}
export function maskEmail(email) {
  if (!email) return "unknown";
  const [name, domain] = email.split("@");
  if (!domain) return "@" + name.slice(0,2) + "***";
  return `@${name.slice(0,2)}***`;
}

function guard() {
  if (!isConfigured || !supabase)
    throw new Error("Supabase not configured. Add keys to .env");
}

// ── AUTH ──────────────────────────────────────────────────────
export async function signIn(email, password) {
  guard();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
export async function signOut() {
  if (!isConfigured || !supabase) return;
  await supabase.auth.signOut();
}
export function onAuthChange(callback) {
  if (!isConfigured || !supabase) { setTimeout(()=>callback(null),0); return ()=>{}; }
  let resolved = false;
  supabase.auth.getSession().then(({data:{session}})=>{
    if (!resolved) { resolved=true; callback(session?.user??null); }
  }).catch(()=>{ if(!resolved){resolved=true;callback(null);} });
  const {data:{subscription}} = supabase.auth.onAuthStateChange((event,session)=>{
    if (event==="INITIAL_SESSION") return; // already handled above
    callback(session?.user??null);
  });
  return ()=>subscription.unsubscribe();
}

// ── GPS ───────────────────────────────────────────────────────
export function requestGPS() {
  return new Promise((resolve,reject)=>{
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos)=>resolve({lat:pos.coords.latitude,lng:pos.coords.longitude}),
      (err)=>reject(err),
      {enableHighAccuracy:true,timeout:10000}
    );
  });
}

// ── USER DOC ──────────────────────────────────────────────────
export async function getUserDoc(authUid) {
  guard();
  if (!authUid) return null;
  const {data,error} = await supabase.from("users").select("*").eq("uid",authUid).maybeSingle();
  if (error) { console.error("getUserDoc:",error.message); return null; }
  return data;
}
export async function updateUserDoc(uid,updates) {
  guard();
  const {error} = await supabase.from("users").update(updates).eq("uid",uid);
  if (error) throw error;
}

// ── ADMIN CONFIG ──────────────────────────────────────────────
export async function getAdminConfig() {
  if (!isConfigured||!supabase) return null;
  const {data} = await supabase.from("admin_config").select("*").maybeSingle();
  return data;
}

// ── SITUATION TYPES ───────────────────────────────────────────
export async function getSituationTypes() {
  if (!isConfigured||!supabase) return null;
  const {data} = await supabase.from("situation_types").select("*")
    .eq("is_active",true).order("severity",{ascending:false});
  return data;
}

// ── MEDIA UPLOAD ──────────────────────────────────────────────
export async function uploadPinMedia(file,pinId) {
  guard();
  const ext  = file.name.split(".").pop();
  const path = `pins/${pinId||Date.now()}.${ext}`;
  const {error} = await supabase.storage.from("pin-media").upload(path,file,{upsert:true});
  if (error) throw error;
  const {data} = supabase.storage.from("pin-media").getPublicUrl(path);
  return data.publicUrl;
}

// ── PINS — live for all users ─────────────────────────────────
export function subscribePins(callback) {
  if (!isConfigured||!supabase) { callback([]); return ()=>{}; }
  const fetch = () => {
    supabase.from("pins").select("*")
      .gt("expires_at", new Date().toISOString())
      .order("posted_at",{ascending:false})
      .then(({data})=>callback(data||[]));
  };
  fetch();
  const ch = supabase.channel("pins-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"pins"},fetch)
    .subscribe();
  return ()=>supabase.removeChannel(ch);
}

export function subscribeHistoryPins(callback, historyDays=7) {
  if (!isConfigured||!supabase) { callback([]); return ()=>{}; }
  supabase.from("pins").select("*")
    .lte("expires_at", new Date().toISOString())
    .gte("expires_at", dayjs().subtract(historyDays,"day").toISOString())
    .order("posted_at",{ascending:false})
    .then(({data,error})=>{
      if(error){ console.error("subscribeHistoryPins:",error.message); callback([]); return; }
      callback((data||[]).map(p=>({...p,is_history:true})));
    });
  return ()=>{};
}

// ── POST PIN ──────────────────────────────────────────────────
export async function postPin({
  type, emoji, lat, lng, postedBy, postedByEmail,
  labelMy, labelEn, mediaUrl,
  isPaidPin=false, tipEnabled=false, tipAmount=25,
  expiryHours=24,
}) {
  guard();
  const now = new Date();
  const expiryMs = expiryHours * 60 * 60 * 1000;
  const {error} = await supabase.from("pins").insert({
    type, emoji,
    label_my:        labelMy,
    label_en:        labelEn,
    lat:             Number(lat),
    lng:             Number(lng),
    posted_by:       postedBy,
    posted_by_email: postedByEmail||null,
    media_url:       mediaUrl||null,
    is_paid_pin:     isPaidPin,
    tip_enabled:     !!tipEnabled,
    tip_amount:      tipEnabled ? tipAmount : null,
    tip_receiver:    tipEnabled ? postedBy : null,
    posted_at:       now.toISOString(),
    expires_at:      new Date(now.getTime() + expiryMs).toISOString(),
    is_history:      false,
  });
  if (error) throw error;
}

// ── CHECK IF ALREADY TIPPED (double-tip guard) ───────────────
export async function checkAlreadyTipped(fromUid, pinId) {
  if (!isConfigured||!supabase) return false;
  const {data} = await supabase.from("transactions")
    .select("id").eq("uid",fromUid).eq("type","tip_sent").eq("ref_id",pinId).limit(1);
  return (data?.length ?? 0) > 0;
}

// ── TIP A PIN POSTER ──────────────────────────────────────────
export async function sendTip({ fromUid, toUid, pinId, tipAmount, commissionRate=0.20 }) {
  guard();
  const now = new Date();

  // 0. Double-tip guard
  const {data:existing} = await supabase.from("transactions")
    .select("id").eq("uid",fromUid).eq("type","tip_sent").eq("ref_id",pinId).limit(1);
  if (existing?.length > 0) throw new Error("You have already tipped this pin.");

  // 1. Check sender balance
  const {data:sender,error:se} = await supabase
    .from("users").select("balance_credits,total_spent").eq("uid",fromUid).single();
  if (se) throw new Error("Could not fetch your balance");
  if ((sender.balance_credits||0) < tipAmount)
    throw new Error(`Not enough credits. Have ${sender.balance_credits}, need ${tipAmount}`);

  // 2. Calculate split
  const commission   = Math.round(tipAmount * commissionRate);
  const receiverGets = tipAmount - commission;

  // 3. Deduct from sender
  const {error:de} = await supabase.from("users")
    .update({ balance_credits: sender.balance_credits - tipAmount, total_spent: (sender.total_spent||0) + tipAmount })
    .eq("uid",fromUid);
  if (de) throw new Error("Failed to deduct balance: " + de.message);

  // 4. Credit receiver via RPC (bypasses RLS)
  const {error:re} = await supabase.rpc("increment_user_credits", {
    target_uid: toUid, credit_delta: receiverGets, earned_delta: receiverGets,
  });
  if (re) {
    await supabase.from("users")
      .update({ balance_credits: sender.balance_credits, total_spent: sender.total_spent||0 })
      .eq("uid", fromUid);
    throw new Error("Failed to credit poster. Your balance has been restored.");
  }

  // 5. Log transactions
  const txRows = [
    { uid:fromUid, type:"tip_sent",       amount:-tipAmount,   description:"☕ Tea tip sent",     ref_id:pinId, created_at:now.toISOString() },
    { uid:toUid,   type:"tip_received",   amount:receiverGets, description:"☕ Tea tip received",  ref_id:pinId, created_at:now.toISOString() },
    { uid:"admin", type:"tip_commission", amount:commission,   description:"☕ Tip commission",    ref_id:pinId, created_at:now.toISOString() },
  ];
  await supabase.from("transactions").insert(txRows).then(()=>{}).catch(()=>{});

  return { tipAmount, receiverGets, commission };
}

// ── TRANSACTIONS (for profile activity) ──────────────────────
export async function getUserTransactions(uid, limit=20) {
  guard();
  const {data,error} = await supabase.from("transactions")
    .select("*").eq("uid",uid)
    .order("created_at",{ascending:false}).limit(limit);
  if (error) return [];
  return data||[];
}

// ── CHECK REQUESTS ────────────────────────────────────────────
export function subscribeCheckRequests(callback) {
  if (!isConfigured||!supabase) { callback([]); return ()=>{}; }
  const fetch = ()=>
    supabase.from("check_requests").select("*")
      .eq("status","pending").order("created_at",{ascending:false})
      .then(({data})=>callback(data||[]));
  fetch();
  const ch = supabase.channel("checkreqs-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"check_requests"},fetch)
    .subscribe();
  return ()=>supabase.removeChannel(ch);
}
export async function postCheckRequest({
  requesterUid, targetLat, targetLng, targetLabel, windowMinutes, creditsCost,
}) {
  guard();
  const now = new Date();
  const {data:u,error:fe} = await supabase
    .from("users").select("balance_credits,total_spent").eq("uid",requesterUid).single();
  if (fe) throw new Error("Could not fetch balance: "+fe.message);
  const bal = u.balance_credits||0;
  if (bal<creditsCost) throw new Error(`Not enough credits. Have ${bal}, need ${creditsCost}`);
  const {error:re} = await supabase.from("check_requests").insert({
    requester_uid:  requesterUid,
    target_lat:     Number(targetLat), target_lng: Number(targetLng),
    target_label:   targetLabel||"Custom location",
    window_minutes: windowMinutes, credits_cost: creditsCost,
    status:"pending", created_at:now.toISOString(),
    expires_at:new Date(now.getTime()+windowMinutes*60*1000).toISOString(),
  });
  if (re) throw re;
  const {error:ue} = await supabase.from("users")
    .update({balance_credits:bal-creditsCost,total_spent:(u.total_spent||0)+creditsCost})
    .eq("uid",requesterUid);
  if (ue) throw ue;
  supabase.from("transactions").insert({
    uid:requesterUid,type:"spend",amount:-creditsCost,
    description:`Check request · ${windowMinutes} min`,created_at:now.toISOString(),
  }).then(()=>{}).catch(()=>{});
}


// ================================================================
// BUSINESS LAYER FUNCTIONS
// ================================================================

export async function getBusinessCategories() {
  if (!isConfigured||!supabase) return [];
  const {data} = await supabase.from("business_categories")
    .select("*").eq("is_active",true).order("sort_order");
  return data||[];
}

export function subscribeBusinesses(callback) {
  if (!isConfigured||!supabase) { callback([]); return ()=>{}; }
  const fetch = () => {
    supabase.from("businesses")
      .select("*, business_categories(emoji,name_en,name_my)")
      .eq("is_verified",true).eq("is_active",true)
      .then(({data,error})=>{
        if(error){ console.error("subscribeBusinesses:",error.message); return; }
        callback(data||[]);
      });
  };
  fetch();
  const ch = supabase.channel("businesses-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"businesses"},fetch)
    .subscribe();
  return ()=>supabase.removeChannel(ch);
}

export async function fetchBusiness(id) {
  if (!isConfigured||!supabase) return null;
  const {data,error} = await supabase.from("businesses")
    .select("*, business_categories(*), business_media(*)")
    .eq("id",id).single();
  if (error) { console.error("fetchBusiness:",error.message); return null; }
  return data;
}

export async function fetchMyBusiness(ownerUid) {
  if (!isConfigured||!supabase||!ownerUid) return null;
  const {data,error} = await supabase.from("businesses")
    .select("*, business_categories(*), business_media(*)")
    .eq("owner_uid",ownerUid).maybeSingle();
  if (error) { console.error("fetchMyBusiness:",error.message); return null; }
  return data;
}

export async function createBusiness({ ownerUid, categoryId, name, description, phone, email, address, lat, lng }) {
  guard();
  const {data,error} = await supabase.from("businesses").insert({
    owner_uid: ownerUid, category_id: categoryId,
    name, description:description||null,
    phone:phone||null, email:email||null, address:address||null,
    lat:Number(lat), lng:Number(lng),
    is_active:true, is_verified:false,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateBusiness(id, updates) {
  guard();
  const {error} = await supabase.from("businesses")
    .update({...updates, updated_at:new Date().toISOString()}).eq("id",id);
  if (error) throw error;
}

export async function updateBusinessLocation(id, lat, lng) {
  guard();
  const {error} = await supabase.from("businesses")
    .update({lat:Number(lat),lng:Number(lng),updated_at:new Date().toISOString()}).eq("id",id);
  if (error) throw error;
}

export async function uploadBusinessCover(file, businessId) {
  guard();
  const ext  = file.name.split(".").pop();
  const path = `covers/${businessId}.${ext}`;
  const {error} = await supabase.storage.from("business-media").upload(path,file,{upsert:true});
  if (error) throw error;
  const {data} = supabase.storage.from("business-media").getPublicUrl(path);
  await supabase.from("businesses")
    .update({cover_url:data.publicUrl, updated_at:new Date().toISOString()}).eq("id",businessId);
  return data.publicUrl;
}

export async function uploadBusinessMedia(file, businessId, type="photo") {
  guard();
  const ext  = file.name.split(".").pop();
  const path = `gallery/${businessId}/${Date.now()}.${ext}`;
  const {error} = await supabase.storage.from("business-media").upload(path,file,{upsert:false});
  if (error) throw error;
  const {data} = supabase.storage.from("business-media").getPublicUrl(path);
  const {error:me} = await supabase.from("business_media").insert({business_id:businessId,url:data.publicUrl,type});
  if (me) throw me;
  return data.publicUrl;
}

export async function deleteBusinessMedia(mediaId) {
  guard();
  const {error} = await supabase.from("business_media").delete().eq("id",mediaId);
  if (error) throw error;
}

export async function incrementBusinessView(id) {
  if (!isConfigured||!supabase) return;
  await supabase.rpc("increment_business_view",{business_id:id}).catch(()=>{});
}

// ── Google OAuth ──────────────────────────────────────────────
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'lannkyaung://login-callback',
      skipBrowserRedirect: false
    },
  });
  if (error) throw error;
  return data;
}
