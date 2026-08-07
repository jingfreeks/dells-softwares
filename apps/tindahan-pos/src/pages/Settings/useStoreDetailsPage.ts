import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  useAuth,
  supabase,
  uploadImage,
  validateAndOptimizeImage,
  ERROR_STORE_NAME_REQUIRED,
  ERROR_COULD_NOT_PROCESS_IMAGE,
  ERROR_COULD_NOT_SAVE_STORE_DETAILS,
} from "@/lib";
import { loadOpeningHours, saveOpeningHours, DEFAULT_OPENING_HOURS } from "../Onboarding/openingHoursSettings";
import { loadStoreDetailsMock, saveStoreDetailsMock, DEFAULT_STORE_DETAILS_MOCK } from "./storeDetailsMock";

const STORE_PHOTO_MAX_DIMENSION = 1024;

export function useStoreDetailsPage() {
  const { user, store, updateStore } = useAuth();

  const [storeName, setStoreName] = useState(store?.name ?? "");
  const [address, setAddress] = useState(store?.address ?? "");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  const [contactNumber, setContactNumber] = useState(DEFAULT_STORE_DETAILS_MOCK.contactNumber);
  const [city, setCity] = useState(DEFAULT_STORE_DETAILS_MOCK.city);
  const [tin, setTin] = useState(DEFAULT_STORE_DETAILS_MOCK.tin);
  const [businessPermitNo, setBusinessPermitNo] = useState(DEFAULT_STORE_DETAILS_MOCK.businessPermitNo);
  const [birRegistered, setBirRegistered] = useState(DEFAULT_STORE_DETAILS_MOCK.birRegistered);

  const [openTime, setOpenTime] = useState(DEFAULT_OPENING_HOURS.openTime);
  const [closeTime, setCloseTime] = useState(DEFAULT_OPENING_HOURS.closeTime);

  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStoreName(store?.name ?? "");
    setAddress(store?.address ?? "");
  }, [store?.id, store?.name, store?.address]);

  useEffect(() => {
    if (!user) return;
    const savedMock = loadStoreDetailsMock(user.storeId);
    setContactNumber(savedMock.contactNumber);
    setCity(savedMock.city);
    setTin(savedMock.tin);
    setBusinessPermitNo(savedMock.businessPermitNo);
    setBirRegistered(savedMock.birRegistered);

    const savedHours = loadOpeningHours(user.storeId);
    setOpenTime(savedHours.openTime);
    setCloseTime(savedHours.closeTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => {
    if (!user) return;
    saveStoreDetailsMock(user.storeId, { contactNumber, city, tin, businessPermitNo, birRegistered });
  }, [user, contactNumber, city, tin, businessPermitNo, birRegistered]);

  useEffect(() => {
    if (!user) return;
    saveOpeningHours(user.storeId, { openTime, closeTime });
  }, [user, openTime, closeTime]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const isDirty =
    storeName !== (store?.name ?? "") ||
    address !== (store?.address ?? "") ||
    photoBlob !== null;

  async function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setProcessingPhoto(true);
    try {
      const blob = await validateAndOptimizeImage(file, { maxDimension: STORE_PHOTO_MAX_DIMENSION });
      setPhotoBlob(blob);
      setPhotoPreview(URL.createObjectURL(blob));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : ERROR_COULD_NOT_PROCESS_IMAGE);
    } finally {
      setProcessingPhoto(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!storeName.trim()) {
      setFormError(ERROR_STORE_NAME_REQUIRED);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setSaved(false);
    try {
      let photoUrl: string | undefined;
      if (photoBlob) {
        const path = `${user.storeId}/store-photo.webp`;
        photoUrl = await uploadImage(supabase, "store-photos", path, photoBlob);
      }
      const result = await updateStore({
        name: storeName.trim(),
        address: address.trim() || null,
        ...(photoUrl !== undefined && { photoUrl }),
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setPhotoBlob(null);
      setPhotoPreview(null);
      setSaved(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : ERROR_COULD_NOT_SAVE_STORE_DETAILS);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDiscard() {
    setStoreName(store?.name ?? "");
    setAddress(store?.address ?? "");
    setPhotoBlob(null);
    setPhotoPreview(null);
    setFormError(null);
  }

  const displayedPhoto = photoPreview ?? store?.photoUrl ?? null;

  return {
    storeName,
    setStoreName,
    address,
    setAddress,
    displayedPhoto,
    photoError,
    processingPhoto,
    onPhotoSelect: handlePhotoSelect,

    contactNumber,
    setContactNumber,
    city,
    setCity,
    tin,
    setTin,
    businessPermitNo,
    setBusinessPermitNo,
    birRegistered,
    setBirRegistered,

    openTime,
    setOpenTime,
    closeTime,
    setCloseTime,

    formError,
    saved,
    submitting,
    isDirty,
    onSubmit: handleSubmit,
    onDiscard: handleDiscard,
  };
}
