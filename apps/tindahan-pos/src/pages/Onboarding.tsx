import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabaseClient";
import { uploadImage, validateAndOptimizeImage } from "../lib/imageUpload";
import { ImagePlaceholderIcon } from "../components/icons";

const AVATAR_MAX_DIMENSION = 512;
const STORE_PHOTO_MAX_DIMENSION = 1024;

type Step = "welcome" | "profile" | "store" | "congrats";

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "profile", label: "Your profile" },
  { key: "store", label: "Your store" },
];

function StepDots({ current }: { current: Step }) {
  if (current === "welcome" || current === "congrats") return null;
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {STEP_LABELS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              s.key === current
                ? "bg-[var(--color-brand)] text-white"
                : STEP_LABELS.findIndex((x) => x.key === current) > i
                  ? "bg-[var(--color-brand)]/20 text-[var(--color-brand)]"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {i + 1}
          </div>
          <span className={`text-xs font-medium ${s.key === current ? "text-slate-800" : "text-slate-400"}`}>
            {s.label}
          </span>
          {i < STEP_LABELS.length - 1 && <div className="h-px w-6 bg-slate-200" />}
        </div>
      ))}
    </div>
  );
}

export function Onboarding() {
  const { user, store, updateProfile, updateStore, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [processingAvatar, setProcessingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [sameAsProfile, setSameAsProfile] = useState(false);
  const [storePhotoBlob, setStorePhotoBlob] = useState<Blob | null>(null);
  const [storePhotoPreview, setStorePhotoPreview] = useState<string | null>(null);
  const [storePhotoError, setStorePhotoError] = useState<string | null>(null);
  const [processingStorePhoto, setProcessingStorePhoto] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [savingStore, setSavingStore] = useState(false);

  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Seed once per signed-in user, not on every keystroke re-render.
  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setAddress(user?.address ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Seed once per store, not on every keystroke re-render.
  useEffect(() => {
    setStoreName(store?.name ?? "");
    setStoreAddress(store?.address ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    return () => {
      if (storePhotoPreview) URL.revokeObjectURL(storePhotoPreview);
    };
  }, [storePhotoPreview]);

  async function handleAvatarSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    setProcessingAvatar(true);
    try {
      const blob = await validateAndOptimizeImage(file, { maxDimension: AVATAR_MAX_DIMENSION });
      setAvatarBlob(blob);
      setAvatarPreview(URL.createObjectURL(blob));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Could not process that image.");
    } finally {
      setProcessingAvatar(false);
    }
  }

  async function handleStorePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStorePhotoError(null);
    setProcessingStorePhoto(true);
    try {
      const blob = await validateAndOptimizeImage(file, { maxDimension: STORE_PHOTO_MAX_DIMENSION });
      setStorePhotoBlob(blob);
      setStorePhotoPreview(URL.createObjectURL(blob));
    } catch (err) {
      setStorePhotoError(err instanceof Error ? err.message : "Could not process that image.");
    } finally {
      setProcessingStorePhoto(false);
    }
  }

  async function handleProfileNext() {
    if (!user) return;
    if (!name.trim()) {
      setProfileError("Name is required.");
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    try {
      let avatarUrl: string | undefined;
      if (avatarBlob) {
        const path = `${user.storeId}/${user.id}/avatar.webp`;
        avatarUrl = await uploadImage(supabase, "avatars", path, avatarBlob);
      }
      const result = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        ...(avatarUrl !== undefined && { avatarUrl }),
      });
      if (!result.ok) {
        setProfileError(result.error);
        return;
      }
      setStep("store");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleStoreFinish() {
    if (!user) return;
    if (!storeName.trim()) {
      setStoreError("Store name is required.");
      return;
    }
    const effectiveAddress = sameAsProfile ? address : storeAddress;
    setSavingStore(true);
    setStoreError(null);
    try {
      let photoUrl: string | undefined;
      if (storePhotoBlob) {
        const path = `${user.storeId}/store-photo.webp`;
        photoUrl = await uploadImage(supabase, "store-photos", path, storePhotoBlob);
      }
      const storeResult = await updateStore({
        name: storeName.trim(),
        address: effectiveAddress.trim() || null,
        ...(photoUrl !== undefined && { photoUrl }),
      });
      if (!storeResult.ok) {
        setStoreError(storeResult.error);
        return;
      }
      // Deliberately not marking onboarding complete yet — that flips
      // user.onboardedAt, and OnboardingRoute would immediately redirect
      // away before the congrats step ever renders. It's marked complete
      // when they leave via "Go to dashboard" instead.
      setStep("congrats");
    } catch (err) {
      setStoreError(err instanceof Error ? err.message : "Could not save your store.");
    } finally {
      setSavingStore(false);
    }
  }

  async function handleGoToDashboard() {
    setFinishing(true);
    setFinishError(null);
    const result = await completeOnboarding();
    if (!result.ok) {
      setFinishError(result.error);
      setFinishing(false);
      return;
    }
    navigate("/admin", { replace: true });
  }

  const displayedAvatar = avatarPreview ?? user?.avatarUrl ?? null;
  const displayedStorePhoto = storePhotoPreview ?? store?.photoUrl ?? null;
  const displayedStoreAddress = sameAsProfile ? address : storeAddress;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <StepDots current={step} />

        {step === "welcome" && (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-brand)]/10 text-3xl">
              👋
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              Welcome to Tindahan POS!
            </h1>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Let's get your account set up. It only takes a minute — we'll grab a few details
              about you and your store, then you're ready to start selling.
            </p>
            <button
              type="button"
              onClick={() => setStep("profile")}
              className="mt-6 flex h-11 w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)]"
            >
              Let's get started
            </button>
          </div>
        )}

        {step === "profile" && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tell us about you</h2>
            <p className="mt-1 text-sm text-slate-500">This shows up on your account and receipts.</p>

            <div className="mt-5 flex flex-col gap-4">
              <div>
                <span className="text-xs font-medium text-slate-700">Photo</span>
                <div className="mt-1 flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    {displayedAvatar ? (
                      <img src={displayedAvatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlaceholderIcon className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <label
                    htmlFor="onboardAvatarInput"
                    className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {processingAvatar ? "Processing…" : "Choose photo"}
                  </label>
                  <input
                    id="onboardAvatarInput"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    disabled={processingAvatar}
                    className="sr-only"
                  />
                </div>
                {avatarError && (
                  <p role="alert" className="mt-1 text-xs text-red-600">
                    {avatarError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="onboardName" className="text-xs font-medium text-slate-700">
                  Your name
                </label>
                <input
                  id="onboardName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              <div>
                <label htmlFor="onboardPhone" className="text-xs font-medium text-slate-700">
                  Phone (optional)
                </label>
                <input
                  id="onboardPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              <div>
                <label htmlFor="onboardAddress" className="text-xs font-medium text-slate-700">
                  Your address (optional)
                </label>
                <input
                  id="onboardAddress"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House no., street, barangay, city"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              {profileError && (
                <p role="alert" className="text-sm text-red-600">
                  {profileError}
                </p>
              )}

              <button
                type="button"
                onClick={handleProfileNext}
                disabled={savingProfile || processingAvatar}
                className="mt-1 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile ? "Saving…" : "Next: Your store"}
              </button>
            </div>
          </div>
        )}

        {step === "store" && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tell us about your store</h2>
            <p className="mt-1 text-sm text-slate-500">
              This appears on the dashboard and any future customer-facing pages.
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <div>
                <span className="text-xs font-medium text-slate-700">Store photo</span>
                <div className="mt-1 flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {displayedStorePhoto ? (
                      <img src={displayedStorePhoto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlaceholderIcon className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <label
                    htmlFor="onboardStorePhotoInput"
                    className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {processingStorePhoto ? "Processing…" : "Choose photo"}
                  </label>
                  <input
                    id="onboardStorePhotoInput"
                    type="file"
                    accept="image/*"
                    onChange={handleStorePhotoSelect}
                    disabled={processingStorePhoto}
                    className="sr-only"
                  />
                </div>
                {storePhotoError && (
                  <p role="alert" className="mt-1 text-xs text-red-600">
                    {storePhotoError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="onboardStoreName" className="text-xs font-medium text-slate-700">
                  Store name
                </label>
                <input
                  id="onboardStoreName"
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="onboardStoreAddress" className="text-xs font-medium text-slate-700">
                    Store address
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={sameAsProfile}
                      onChange={(e) => setSameAsProfile(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Same as my address
                  </label>
                </div>
                <input
                  id="onboardStoreAddress"
                  type="text"
                  value={displayedStoreAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  disabled={sameAsProfile}
                  placeholder="House no., street, barangay, city"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {storeError && (
                <p role="alert" className="text-sm text-red-600">
                  {storeError}
                </p>
              )}

              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("profile")}
                  disabled={savingStore}
                  className="flex-1 cursor-pointer rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStoreFinish}
                  disabled={savingStore || processingStorePhoto}
                  className="flex-1 cursor-pointer rounded-xl bg-[var(--color-brand)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingStore ? "Saving…" : "Finish setup"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "congrats" && (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
              🎉
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              Congratulations, {name.trim() || "there"}!
            </h1>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              {storeName.trim() || "Your store"} is all set up and ready to go.
            </p>

            <div className="mt-5 w-full rounded-xl bg-slate-50 p-4 text-left text-sm">
              <p className="flex items-center gap-2 text-slate-700">
                <span className="text-emerald-600">✓</span> Profile saved
              </p>
              <p className="mt-2 flex items-center gap-2 text-slate-700">
                <span className="text-emerald-600">✓</span> Store details saved
              </p>
            </div>

            {finishError && (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {finishError}
              </p>
            )}

            <button
              type="button"
              onClick={handleGoToDashboard}
              disabled={finishing}
              className="mt-6 flex h-11 w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {finishing ? "Finishing…" : "Go to dashboard"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
