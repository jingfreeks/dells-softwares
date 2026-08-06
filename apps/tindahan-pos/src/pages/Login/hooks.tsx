import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib";

export function useLoginForm() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(email, password, keepSignedIn);
    setSubmitting(false);
    if (result.ok) {
      // Not a fixed destination — HomeRedirect decides admin vs. cashier
      // once the profile (and its role) has loaded.
      navigate("/");
    } else {
      setError(result.error);
    }
  }

  return {
    user,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    toggleShowPassword: () => setShowPassword((v) => !v),
    keepSignedIn,
    setKeepSignedIn,
    error,
    submitting,
    handleSubmit,
  };
}
