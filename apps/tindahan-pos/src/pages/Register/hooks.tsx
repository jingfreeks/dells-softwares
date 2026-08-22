import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib";
import { supabase } from "@/lib/supabaseClient";
import {
  TEXT_PASSWORD_STRENGTH_WEAK,
  TEXT_PASSWORD_STRENGTH_FAIR,
  TEXT_PASSWORD_STRENGTH_GOOD,
  TEXT_PASSWORD_STRENGTH_STRONG,
} from "@/lib";
import { STATIC_PLANS, type StaticPlan } from "@/lib/plan/staticPlans";

const REQUESTABLE_PLAN_CODES = new Set(["BUSINESS", "PRO"]);

/** The plan a landing-page CTA carried in via ?plan=CODE, or null for the plain "just BASIC, like every signup" path. Only BUSINESS/PRO are real requests -- see request_plan_upgrade(). */
function useSelectedPlan(): StaticPlan | null {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("plan");
  if (!code || !REQUESTABLE_PLAN_CODES.has(code)) return null;
  return STATIC_PLANS.find((p) => p.code === code) ?? null;
}

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
  const selectedPlan = useSelectedPlan();
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
      // No session yet -- request_plan_upgrade() needs auth_store_id(),
      // which needs a signed-in caller. The plan choice isn't persisted
      // across the confirm-email gap; best-effort, matching how this whole
      // feature is "record a request for a human to follow up on," not a
      // guarantee.
      setAwaitingConfirmation(true);
      return;
    }
    if (selectedPlan) {
      // Best-effort: the account was already created successfully above --
      // a failure recording the request shouldn't undo that or block the
      // new owner from reaching their store. A bare `void supabase.rpc(...)`
      // with nothing consuming its result was silently dropped by the
      // production build (esbuild treats Supabase's fluent builder API as
      // side-effect-free when the return value goes unused) -- .catch()
      // both fixes that and makes "errors here are deliberately ignored"
      // explicit instead of relying on an unhandled rejection.
      supabase.rpc("request_plan_upgrade", { p_plan_code: selectedPlan.code }).then(
        () => {},
        () => {}
      );
    }
    navigate("/pos");
  }

  return {
    user,
    selectedPlan,
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
