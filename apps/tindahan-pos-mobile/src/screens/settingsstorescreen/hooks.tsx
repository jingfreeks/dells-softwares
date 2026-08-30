import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { initialsOf } from "../../lib/format";
import { pickAndOptimizeImage, uploadImage, type OptimizedImage } from "../../lib/imageUpload";
import { DEFAULT_OPENING_HOURS, loadOpeningHours, saveOpeningHours, type OpeningHours } from "../../lib/onboardingSettings";

/** Same cap the onboarding wizard uses for the same bucket/path. */
const STORE_PHOTO_MAX_DIMENSION = 1024;

/**
 * Everything behind mobile-settings-store.html.
 *
 * Real (`stores` row, via updateStore): name, contact number, address,
 * city, logo, BIR-registered, TIN, permit number. Mock (AsyncStorage):
 * opening hours only -- there's no stores.open_time/close_time column on
 * either client, and this reuses the exact load/save pair the onboarding
 * wizard already writes, so the two screens stay in sync instead of
 * inventing a second key.
 *
 * Currency is display-only: the app is peso-only throughout (PESO
 * formatter in lib/format), so an editable currency field would be a
 * control that can't actually do anything.
 */
export function useSettingsStoreScreen() {
  const { store, updateStore } = useAuth();

  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [birRegistered, setBirRegistered] = useState(false);
  const [tin, setTin] = useState("");
  const [businessPermitNo, setBusinessPermitNo] = useState("");

  const [hours, setHours] = useState<OpeningHours>(DEFAULT_OPENING_HOURS);
  const [storedHours, setStoredHours] = useState<OpeningHours>(DEFAULT_OPENING_HOURS);

  const [photoImage, setPhotoImage] = useState<OptimizedImage | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Seed from the real store row, then load the AsyncStorage-only hours.
  // Keyed on store.id so switching stores re-seeds rather than showing
  // the previous one's edits.
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    setName(store.name);
    setContactNumber(store.contactNumber ?? "");
    setAddress(store.address ?? "");
    setCity(store.city ?? "");
    setBirRegistered(store.birRegistered);
    setTin(store.tin ?? "");
    setBusinessPermitNo(store.businessPermitNo ?? "");
    loadOpeningHours(store.id).then((loaded) => {
      if (cancelled) return;
      setHours(loaded);
      setStoredHours(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [store?.id]);

  const dirty =
    !!store &&
    (name !== store.name ||
      contactNumber !== (store.contactNumber ?? "") ||
      address !== (store.address ?? "") ||
      city !== (store.city ?? "") ||
      birRegistered !== store.birRegistered ||
      tin !== (store.tin ?? "") ||
      businessPermitNo !== (store.businessPermitNo ?? "") ||
      photoImage !== null ||
      hours.openTime !== storedHours.openTime ||
      hours.closeTime !== storedHours.closeTime);

  async function handlePickPhoto() {
    setPhotoError(null);
    try {
      const picked = await pickAndOptimizeImage(STORE_PHOTO_MAX_DIMENSION);
      if (picked) setPhotoImage(picked);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not process the image.");
    }
  }

  function handleDiscard() {
    if (!store) return;
    setName(store.name);
    setContactNumber(store.contactNumber ?? "");
    setAddress(store.address ?? "");
    setCity(store.city ?? "");
    setBirRegistered(store.birRegistered);
    setTin(store.tin ?? "");
    setBusinessPermitNo(store.businessPermitNo ?? "");
    setHours(storedHours);
    setPhotoImage(null);
    setPhotoError(null);
    setError(null);
    setSaved(false);
  }

  async function handleSave() {
    if (!store) return;
    if (!name.trim()) {
      setError("Store name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      let photoUrl: string | undefined;
      if (photoImage) {
        photoUrl = await uploadImage("store-photos", `${store.id}/store-photo.jpg`, photoImage);
      }

      const result = await updateStore({
        name: name.trim(),
        contactNumber: contactNumber.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        birRegistered,
        tin: tin.trim() || null,
        businessPermitNo: businessPermitNo.trim() || null,
        ...(photoUrl !== undefined && { photoUrl }),
      });
      if (!result.ok) {
        // Keep the operator's edits on screen -- they can fix and retry.
        setError(result.error);
        return;
      }

      await saveOpeningHours(store.id, hours);
      setStoredHours(hours);
      setPhotoImage(null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your store details.");
    } finally {
      setSaving(false);
    }
  }

  return {
    name,
    setName,
    contactNumber,
    setContactNumber,
    address,
    setAddress,
    city,
    setCity,
    birRegistered,
    toggleBirRegistered: () => setBirRegistered((prev) => !prev),
    tin,
    setTin,
    businessPermitNo,
    setBusinessPermitNo,
    openTime: hours.openTime,
    setOpenTime: (value: string) => setHours((prev) => ({ ...prev, openTime: value })),
    closeTime: hours.closeTime,
    setCloseTime: (value: string) => setHours((prev) => ({ ...prev, closeTime: value })),
    initials: initialsOf(store?.name ?? ""),
    photoUri: photoImage?.uri ?? store?.photoUrl ?? null,
    photoError,
    onPickPhoto: handlePickPhoto,
    dirty,
    saving,
    error,
    saved,
    onSave: handleSave,
    onDiscard: handleDiscard,
  };
}
