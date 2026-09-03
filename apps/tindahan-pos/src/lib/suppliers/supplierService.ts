import { supabase } from "@/lib/supabaseClient";
import type { Supplier, SupplierPaymentTerms } from "@/lib/types";
import type { AddSupplierInput } from "@/lib/storeData/storeDataContext";

/**
 * Supplier data access.
 *
 * Lifted out of StoreDataProvider, which had grown to 860 lines with every
 * domain's queries defined inline in the component body. These are the
 * supplier ones, unchanged.
 *
 * What deliberately did NOT move: the `await fetchSuppliers()` each mutation
 * ended with. Refreshing the provider's cached list is the provider's job, and
 * a service that reaches back into React state to do it would be the coupling
 * this split exists to remove. The provider still owns that, and these
 * functions just do the work and return.
 */

const SUPPLIER_SELECT =
  "id, name, contact_person, phone, address, scan_code, payment_terms, active, usual_delivery_days, supplier_categories(category_id)";

function mapSupplierRow(row: {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  scan_code: string;
  payment_terms: string;
  active: boolean;
  usual_delivery_days: number[];
  supplier_categories: { category_id: string }[] | null;
}): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    address: row.address,
    scanCode: row.scan_code,
    paymentTerms: row.payment_terms as SupplierPaymentTerms,
    active: row.active,
    usualDeliveryDays: row.usual_delivery_days,
    categoryIds: (row.supplier_categories ?? []).map((c) => c.category_id),
  };
}

export async function createSupplier(storeId: string, input: AddSupplierInput): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      store_id: storeId,
      name: input.name.trim(),
      contact_person: input.contactPerson ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      payment_terms: input.paymentTerms ?? "cash",
      usual_delivery_days: input.usualDeliveryDays ?? [],
    })
    .select(SUPPLIER_SELECT)
    .single();
  if (error) throw error;

  if (input.categoryIds?.length) {
    const { error: catErr } = await supabase
      .from("supplier_categories")
      .insert(input.categoryIds.map((categoryId) => ({ supplier_id: data.id, category_id: categoryId })));
    if (catErr) throw catErr;
  }

  return mapSupplierRow({
    ...data,
    supplier_categories: (input.categoryIds ?? []).map((category_id) => ({ category_id })),
  });
}

export async function updateSupplierRecord(
  id: string,
  patch: Partial<Omit<Supplier, "id" | "scanCode">>
): Promise<void> {
  const { error } = await supabase
    .from("suppliers")
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.contactPerson !== undefined && { contact_person: patch.contactPerson }),
      ...(patch.phone !== undefined && { phone: patch.phone }),
      ...(patch.address !== undefined && { address: patch.address }),
      ...(patch.paymentTerms !== undefined && { payment_terms: patch.paymentTerms }),
      ...(patch.active !== undefined && { active: patch.active }),
      ...(patch.usualDeliveryDays !== undefined && { usual_delivery_days: patch.usualDeliveryDays }),
    })
    .eq("id", id);
  if (error) throw error;

  if (patch.categoryIds !== undefined) {
    // Simplest correct diff: replace the full set rather than computing an
    // add/remove delta -- this table only ever holds a handful of rows per
    // supplier.
    const { error: delErr } = await supabase.from("supplier_categories").delete().eq("supplier_id", id);
    if (delErr) throw delErr;
    if (patch.categoryIds.length) {
      const { error: insErr } = await supabase
        .from("supplier_categories")
        .insert(patch.categoryIds.map((categoryId) => ({ supplier_id: id, category_id: categoryId })));
      if (insErr) throw insErr;
    }
  }
}

/**
 * No hard delete -- a supplier's receiving history must stay intact even after
 * the store stops buying from them.
 */
export async function deactivateSupplierRecord(id: string): Promise<void> {
  const { error } = await supabase.from("suppliers").update({ active: false }).eq("id", id);
  if (error) throw error;
}

export async function markSupplierEntriesPaid(supplierId: string): Promise<void> {
  const { error } = await supabase
    .from("receiving_entries")
    .update({ paid: true, paid_at: new Date().toISOString() })
    .eq("supplier_id", supplierId)
    .eq("paid", false);
  if (error) throw error;
}

/**
 * A dedicated query rather than a client-side find() over the cached list, so
 * it also works right after adding a supplier this session, and so a not-found
 * scan reads as "no such supplier" rather than a stale-cache bug.
 */
export async function findSupplierByScanCode(scanCode: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from("suppliers")
    .select(SUPPLIER_SELECT)
    .eq("scan_code", scanCode)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSupplierRow(data) : null;
}

export { SUPPLIER_SELECT, mapSupplierRow };
