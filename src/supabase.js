import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || "";

export const isConfigured = !!(SUPABASE_URL && SUPABASE_ANON);

// Asynchronous Custom Storage wrapper tailored for Capacitor runtime engine
const customNativeStorage = {
  getItem: async (key) => {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  },
  setItem: async (key, value) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        storage: customNativeStorage, // Explicitly hook the storage wrapper
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,    // Keeps native deep link parameters from colliding
      },
    })
  : null;
