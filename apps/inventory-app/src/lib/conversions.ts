import { supabase } from "./supabaseClient";
import type { UnitConversion } from "./types";

function toConversion(row: {
  id: string;
  store_id: string;
  product_id: string;
  unit_name: string;
  base_unit_factor: number;
  created_at: string;
}): UnitConversion {
  return {
    id: row.id,
    storeId: row.store_id,
    productId: row.product_id,
    unitName: row.unit_name,
    baseUnitFactor: row.base_unit_factor,
    createdAt: row.created_at,
  };
}

export async function listConversions(storeId: string): Promise<UnitConversion[]> {
  const { data, error } = await supabase
    .from("product_unit_conversions")
    .select("id, store_id, product_id, unit_name, base_unit_factor, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toConversion);
}

export async function listConversionsForProduct(productId: string): Promise<UnitConversion[]> {
  const { data, error } = await supabase
    .from("product_unit_conversions")
    .select("id, store_id, product_id, unit_name, base_unit_factor, created_at")
    .eq("product_id", productId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(toConversion);
}

export async function addConversion(
  storeId: string,
  productId: string,
  unitName: string,
  baseUnitFactor: number
): Promise<UnitConversion> {
  const { data, error } = await supabase
    .from("product_unit_conversions")
    .insert({
      store_id: storeId,
      product_id: productId,
      unit_name: unitName.trim(),
      base_unit_factor: baseUnitFactor,
    })
    .select("id, store_id, product_id, unit_name, base_unit_factor, created_at")
    .single();

  if (error) throw new Error(error.message);
  return toConversion(data);
}

export async function removeConversion(id: string): Promise<void> {
  const { error } = await supabase.from("product_unit_conversions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
