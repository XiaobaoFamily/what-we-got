export type StorageZone = "pantry" | "chilled" | "frozen";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
}

export interface InventoryItem {
  id: string;
  household_id: string;
  name: string;
  storage_zone: StorageZone;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  expires_on: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}
