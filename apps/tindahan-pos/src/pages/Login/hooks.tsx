import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib";

export function useLoginForm() {
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

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

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleSubmitting(true);
    const result = await loginWithGoogle();
    // Success navigates the browser away to Google -- only a failure ever
    // reaches this line (provider not enabled, network error, etc.).
    if (!result.ok) {
      setError(result.error);
      setGoogleSubmitting(false);
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
    googleSubmitting,
    handleGoogleSignIn,
  };
}
