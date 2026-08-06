import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  useAuth,
  useStoreData,
  supabase,
  ERROR_NAME_EMAIL_REQUIRED,
  ERROR_COULD_NOT_CREATE_CASHIER,
  ERROR_COULD_NOT_REMOVE_STAFF,
  ERROR_COULD_NOT_UPDATE_STAFF,
  ERROR_COULD_NOT_SEND_RESET,
  type Role,
} from "@/lib";
import { generatePassword, generatePin, type StaffRoleSelection, type SignInMethod, type ShiftSelection } from "./lib";

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface StaffFormValues {
  name: string;
  email: string;
  roleSelection: StaffRoleSelection;
  signInMethod: SignInMethod;
  pin: string;
  shift: ShiftSelection;
  drawerCounting: boolean;
}

function makeEmptyForm(): StaffFormValues {
  return {
    name: "",
    email: "",
    roleSelection: "cashier",
    signInMethod: "pin",
    pin: generatePin(),
    shift: "morning",
    drawerCounting: true,
  };
}

export function useStaffPage() {
  const { user, requestPasswordReset } = useAuth();
  const { sales } = useStoreData();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<StaffFormValues>(makeEmptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showShiftHistory, setShowShiftHistory] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await supabase
      .from("staff")
      .select("id, name, email, role")
      .order("role")
      .order("name");
    if (error) {
      setLoadError(error.message);
      return;
    }
    setStaff(data ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchStaff().finally(() => setLoading(false));
  }, [fetchStaff]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setFormError(ERROR_NAME_EMAIL_REQUIRED);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke("create-cashier", {
        body: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          // The new Add Staff design shows a PIN instead of asking the admin
          // to type a password — but the backend still creates an email +
          // password auth account (no PIN-login system exists), so a
          // password is generated here and never surfaced anywhere.
          password: generatePassword(),
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setForm(makeEmptyForm());
      setShowAddForm(false);
      await fetchStaff();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : ERROR_COULD_NOT_CREATE_CASHIER);
    } finally {
      setSubmitting(false);
    }
  }

  function openAddForm() {
    setForm(makeEmptyForm());
    setFormError(null);
    setShowAddForm(true);
  }

  function closeAddForm() {
    setShowAddForm(false);
    setFormError(null);
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    setLoadError(null);
    try {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
      await fetchStaff();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : ERROR_COULD_NOT_REMOVE_STAFF);
    } finally {
      setRemovingId(null);
    }
  }

  async function handleEditName(id: string, name: string) {
    setLoadError(null);
    try {
      const { error } = await supabase.from("staff").update({ name: name.trim() }).eq("id", id);
      if (error) throw error;
      await fetchStaff();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : ERROR_COULD_NOT_UPDATE_STAFF);
    }
  }

  async function handleResetPassword(email: string) {
    setLoadError(null);
    const result = await requestPasswordReset(email);
    if (!result.ok) setLoadError(result.error || ERROR_COULD_NOT_SEND_RESET);
    return result.ok;
  }

  return {
    user,
    sales,
    staff,
    loading,
    loadError,
    form,
    setForm,
    formError,
    submitting,
    removingId,
    showAddForm,
    showShiftHistory,
    setShowShiftHistory,
    openAddForm,
    closeAddForm,
    handleSubmit,
    handleRemove,
    handleEditName,
    handleResetPassword,
  };
}
