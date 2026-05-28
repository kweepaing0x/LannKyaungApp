import { create } from "zustand";

export const useAppStore = create((set, get) => ({
  // ── Auth ────────────────────────────────────────────────────
  user: null, userDoc: null, adminConfig: null,
  setUser:        (user)        => set({ user }),
  setUserDoc:     (userDoc)     => set({ userDoc }),
  setAdminConfig: (adminConfig) => set({ adminConfig }),

  // ── Map ─────────────────────────────────────────────────────
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),

  // ── Pins & requests ─────────────────────────────────────────
  pins: [],           setPins:          (pins) => set({ pins }),
  checkRequests: [],  setCheckRequests: (reqs) => set({ checkRequests: reqs }),
  situationTypes: [], setSituationTypes: (t)   => set({ situationTypes: t }),

  // ── Businesses ──────────────────────────────────────────────
  businesses: [],       setBusinesses:     (b) => set({ businesses: b }),
  showBusinesses: false, setShowBusinesses: (v) => set({ showBusinesses: v }),

  // ── UI tabs & modal ─────────────────────────────────────────
  activeTab: "map",      setActiveTab:     (tab) => set({ activeTab: tab }),
  showPlusModal: false,  setShowPlusModal: (v)   => set({ showPlusModal: v }),
  showHistory: false,    setShowHistory:   (v)   => set({ showHistory: v }),
  showQuickMenu: false,  setShowQuickMenu: (v)   => set({ showQuickMenu: v }),

  // ── Map pick flow ────────────────────────────────────────────
  pickingLocation: false,  setPickingLocation:   (v)   => set({ pickingLocation: v }),
  pickedLocation: null,    setPickedLocation:    (loc) => set({ pickedLocation: loc }),
  pendingPickTarget: null, setPendingPickTarget: (t)   => set({ pendingPickTarget: t }),
  pinSource: null, setPinSource: (s) => set({ pinSource: s }),
  reqSource: null, setReqSource: (s) => set({ reqSource: s }),
  savedPinLoc: null, setSavedPinLoc: (l) => set({ savedPinLoc: l }),
  savedReqLoc: null, setSavedReqLoc: (l) => set({ savedReqLoc: l }),

  // ── Market cart ──────────────────────────────────────────────
  cart: [],
  addToCart: (product, qty) => set(state => {
    const existing = state.cart.find(i => i.product.id === product.id);
    if (existing) {
      return { cart: state.cart.map(i =>
        i.product.id === product.id ? { ...i, qty } : i
      ).filter(i => i.qty > 0) };
    }
    if (qty <= 0) return state;
    return { cart: [...state.cart, { product, qty }] };
  }),
  removeFromCart: (productId) => set(state => ({
    cart: state.cart.filter(i => i.product.id !== productId)
  })),
  clearCart: () => set({ cart: [] }),
  customNote: "", setCustomNote: (v) => set({ customNote: v }),

  // ── Checkout saved info ───────────────────────────────────────
  savedCustomerName:  "", setSavedCustomerName:  (v) => set({ savedCustomerName: v }),
  savedCustomerPhone: "", setSavedCustomerPhone: (v) => set({ savedCustomerPhone: v }),
  savedDeliveryLat:  null, setSavedDeliveryLat:  (v) => set({ savedDeliveryLat: v }),
  savedDeliveryLng:  null, setSavedDeliveryLng:  (v) => set({ savedDeliveryLng: v }),
}));
