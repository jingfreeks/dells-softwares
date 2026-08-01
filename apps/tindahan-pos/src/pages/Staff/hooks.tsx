import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  useAuth,
  supabase,
  ERROR_NAME_EMAIL_REQUIRED,
  ERROR_PASSWORD_MIN_LENGTH,
  ERROR_COULD_NOT_CREATE_CASHIER,
  ERROR_COULD_NOT_REMOVE_STAFF,
  type Role,
} from "@/lib";

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const emptyForm = { name: "", email: "", password: "" };

export function useStaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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

  function updateFormField(field: keyof typeof emptyForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setFormError(ERROR_NAME_EMAIL_REQUIRED);
      return;
    }
    if (form.password.length < 8) {
      setFormError(ERROR_PASSWORD_MIN_LENGTH);
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
          password: form.password,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setForm(emptyForm);
      await fetchStaff();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : ERROR_COULD_NOT_CREATE_CASHIER);
    } finally {
      setSubmitting(false);
    }
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

  return {
    user,
    staff,
    loading,
    loadError,
    form,
    formError,
    submitting,
    removingId,
    updateFormField,
    handleSubmit,
    handleRemove,
  };
}
