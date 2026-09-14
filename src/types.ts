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

export interface HouseholdShelfLifeRule {
  id: string;
  household_id: string;
  base_rule_id: string | null;
  name: string;
  aliases: string[];
  category: "prepared" | "meat" | "seafood" | "eggs-dairy" | "produce" | "pantry" | "pet-food";
  conditions: Array<"unopened" | "opened" | "raw" | "cooked" | "prepared" | "whole" | "cut" | "ripe" | "homemade" | "thawed">;
  risk_level: "low" | "medium" | "high";
  storage_zone: StorageZone;
  min_days: number | null;
  max_days: number | null;
  start_from: "purchased" | "opened" | "prepared" | "cooked" | "ripe" | "thawed" | "package-date";
  quality_only: boolean;
  label_first: boolean;
  advice: string[];
  warning: string | null;
  created_at: string;
  updated_at: string;
}
