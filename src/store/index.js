import { create } from "zustand";
export const useAppStore = create((set) => ({
  // Auth
  user: null, userDoc: null, adminConfig: null,
  setUser:        (user)        => set({ user }),
  setUserDoc:     (userDoc)     => set({ userDoc }),
  setAdminConfig: (adminConfig) => set({ adminConfig }),
  // Map
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  // Pins & requests
  pins: [],           setPins:          (pins) => set({ pins }),
  checkRequests: [],  setCheckRequests: (reqs) => set({ checkRequests: reqs }),
  situationTypes: [],  setSituationTypes:  (t) => set({ situationTypes: t }),
  // Business layer
  businesses: [],      setBusinesses:      (b) => set({ businesses: b }),
  showBusinesses: false, setShowBusinesses:(v) => set({ showBusinesses: v }),
  // UI tabs & modal
  activeTab: "map",      setActiveTab:     (tab) => set({ activeTab: tab }),
  showPlusModal: false,  setShowPlusModal: (v)   => set({ showPlusModal: v }),
  showHistory: false,    setShowHistory:   (v)   => set({ showHistory: v }),
  // Map pick flow
  pickingLocation: false,  setPickingLocation:  (v)   => set({ pickingLocation: v }),
  pickedLocation: null,    setPickedLocation:   (loc) => set({ pickedLocation: loc }),
  pendingPickTarget: null, setPendingPickTarget: (t)   => set({ pendingPickTarget: t }),
  pinSource: null, setPinSource: (s) => set({ pinSource: s }),
  reqSource: null, setReqSource: (s) => set({ reqSource: s }),
  savedPinLoc: null, setSavedPinLoc: (l) => set({ savedPinLoc: l }),
  savedReqLoc: null, setSavedReqLoc: (l) => set({ savedReqLoc: l }),
}));
