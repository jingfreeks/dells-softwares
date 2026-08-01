import { supabase } from "./supabaseClient";
import type { Supplier } from "./types";

export async function listSuppliers(storeId: string): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, phone, address, scan_code")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    scanCode: row.scan_code,
  }));
}

export async function createSupplier(input: {
  storeId: string;
  name: string;
  phone: string | null;
  address: string | null;
}): Promise<void> {
  const { error } = await supabase.from("suppliers").insert({
    store_id: input.storeId,
    name: input.name,
    phone: input.phone,
    address: input.address,
  });
  if (error) throw new Error(error.message);
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
