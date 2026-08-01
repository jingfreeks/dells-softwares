import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib";
import {
  TEXT_PASSWORD_STRENGTH_WEAK,
  TEXT_PASSWORD_STRENGTH_FAIR,
  TEXT_PASSWORD_STRENGTH_GOOD,
  TEXT_PASSWORD_STRENGTH_STRONG,
} from "@/lib";

export function computePasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: "" };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  const labels = [
    TEXT_PASSWORD_STRENGTH_WEAK,
    TEXT_PASSWORD_STRENGTH_WEAK,
    TEXT_PASSWORD_STRENGTH_FAIR,
    TEXT_PASSWORD_STRENGTH_GOOD,
    TEXT_PASSWORD_STRENGTH_STRONG,
  ];
  return { score, label: labels[score] };
}

export function useRegisterForm() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const passwordStrength = computePasswordStrength(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreedToTerms) return;
    setError(null);
    setSubmitting(true);
    // No separate "confirm password" field — a show/hide toggle solves
    // the same "did I type it right" problem with less friction, so the
    // value is submitted as its own confirmation.
    const result = await register({ storeName, ownerName, email, password, confirmPassword: password });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setAwaitingConfirmation(true);
      return;
    }
    navigate("/pos");
  }

  return {
    user,
    storeName,
    setStoreName,
    ownerName,
    setOwnerName,
    email,
    setEmail,
    password,
    setPassword,
    passwordStrength,
    showPassword,
    toggleShowPassword: () => setShowPassword((v) => !v),
    agreedToTerms,
    setAgreedToTerms,
    error,
    submitting,
    awaitingConfirmation,
    handleSubmit,
  };
}
