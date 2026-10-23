import { createClient } from "@supabase/supabase-js";
import { createRepository } from "./repository.js";
export const client = createClient(__SUPABASE_URL__, __SUPABASE_ANON_KEY__, {
  auth: {
    storageKey: "pojok-admin-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
export const repository = createRepository(client, {
  publicUrl: __SUPABASE_URL__,
});
