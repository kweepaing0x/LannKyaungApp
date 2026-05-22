import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || "";

export const isConfigured = !!(SUPABASE_URL && SUPABASE_ANON);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        // Persist session in localStorage so reload doesn't log out
        storage:            typeof window !== "undefined" ? window.localStorage : undefined,
        autoRefreshToken:   true,
        persistSession:     true,
        detectSessionInUrl: false,
      },
    })
  : null;
