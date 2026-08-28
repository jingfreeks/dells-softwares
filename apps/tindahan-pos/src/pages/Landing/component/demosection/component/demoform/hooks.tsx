import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { BUSINESS_TYPES, LOCATION_OPTIONS, type DemoFormErrors, type DemoFormFields } from "./types";

const INITIAL_FIELDS: DemoFormFields = {
  name: "",
  businessName: "",
  mobile: "",
  email: "",
  businessType: BUSINESS_TYPES[0],
  locations: LOCATION_OPTIONS[0],
  message: "",
  consent: false,
};

function validate(fields: DemoFormFields): DemoFormErrors {
  const errors: DemoFormErrors = {};
  if (!fields.name.trim()) errors.name = "Your name is required";
  if (!fields.businessName.trim()) errors.businessName = "Business name is required";
  if (!fields.mobile.trim()) errors.mobile = "Mobile number is required";
  if (!fields.consent) errors.consent = "Please agree before sending your request";
  return errors;
}

export function useDemoForm() {
  const [fields, setFields] = useState<DemoFormFields>(INITIAL_FIELDS);
  const [errors, setErrors] = useState<DemoFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  function setField<K extends keyof DemoFormFields>(key: K, value: DemoFormFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return; // duplicate-submit guard -- disabled button covers the common case too

    setSubmitError(null);
    const nextErrors = validate(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-demo-request", {
        body: {
          name: fields.name.trim(),
          businessName: fields.businessName.trim(),
          mobile: fields.mobile.trim(),
          email: fields.email.trim() || undefined,
          businessType: fields.businessType,
          locations: fields.locations,
          message: fields.message.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSucceeded(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong sending your request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return { fields, setField, errors, submitting, submitError, succeeded, handleSubmit };
}
