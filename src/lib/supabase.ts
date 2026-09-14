import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseConfig } from "../types";

const CONFIG_KEY = "home-stock:supabase-config";

export function loadSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupabaseConfig;
    return parsed.url && parsed.anonKey ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearSupabaseConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

export function makeSupabaseClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url.replace(/\/$/, ""), config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

export function validateSupabaseConfig(config: SupabaseConfig): string | null {
  try {
    const url = new URL(config.url);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) {
      return "请输入有效的 Supabase Project URL";
    }
  } catch {
    return "请输入有效的 Supabase Project URL";
  }
  if (config.anonKey.length < 40) return "请输入 anon 或 publishable key";
  return null;
}
