import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  useAuth,
  supabase,
  uploadImage,
  validateAndOptimizeImage,
  ERROR_STORE_NAME_REQUIRED,
  ERROR_COULD_NOT_PROCESS_IMAGE,
  ERROR_COULD_NOT_SAVE_STORE_DETAILS,
  type VatStatus, describePlatformError } from "@/lib";
import { loadOpeningHours, saveOpeningHours, DEFAULT_OPENING_HOURS } from "../Onboarding/openingHoursSettings";

const STORE_PHOTO_MAX_DIMENSION = 1024;

export function useStoreDetailsPage() {
  const { user, store, updateStore } = useAuth();

  const [storeName, setStoreName] = useState(store?.name ?? "");
  const [address, setAddress] = useState(store?.address ?? "");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  const [contactNumber, setContactNumber] = useState(store?.contactNumber ?? "");
  const [city, setCity] = useState(store?.city ?? "");
  const [tin, setTin] = useState(store?.tin ?? "");
  const [businessPermitNo, setBusinessPermitNo] = useState(store?.businessPermitNo ?? "");
  const [birRegistered, setBirRegistered] = useState(store?.birRegistered ?? false);
  const [vatStatus, setVatStatus] = useState<VatStatus>(store?.vatStatus ?? "non_vat");
  const [vatRate, setVatRate] = useState(store?.vatRate ?? 0.12);
  const [invoiceType, setInvoiceType] = useState(store?.invoiceType ?? "Sales Invoice");

  const [openTime, setOpenTime] = useState(DEFAULT_OPENING_HOURS.openTime);
  const [closeTime, setCloseTime] = useState(DEFAULT_OPENING_HOURS.closeTime);

  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStoreName(store?.name ?? "");
    setAddress(store?.address ?? "");
    setContactNumber(store?.contactNumber ?? "");
    setCity(store?.city ?? "");
    setTin(store?.tin ?? "");
    setBusinessPermitNo(store?.businessPermitNo ?? "");
    setBirRegistered(store?.birRegistered ?? false);
    setVatStatus(store?.vatStatus ?? "non_vat");
    setVatRate(store?.vatRate ?? 0.12);
    setInvoiceType(store?.invoiceType ?? "Sales Invoice");
  }, [
    store?.id,
    store?.name,
    store?.address,
    store?.contactNumber,
    store?.city,
    store?.tin,
    store?.businessPermitNo,
    store?.birRegistered,
    store?.vatStatus,
    store?.vatRate,
    store?.invoiceType,
  ]);

  useEffect(() => {
    if (!user) return;
    const savedHours = loadOpeningHours(user.storeId);
    setOpenTime(savedHours.openTime);
    setCloseTime(savedHours.closeTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

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
    photoBlob !== null ||
    contactNumber !== (store?.contactNumber ?? "") ||
    city !== (store?.city ?? "") ||
    tin !== (store?.tin ?? "") ||
    businessPermitNo !== (store?.businessPermitNo ?? "") ||
    birRegistered !== (store?.birRegistered ?? false) ||
    vatStatus !== (store?.vatStatus ?? "non_vat") ||
    vatRate !== (store?.vatRate ?? 0.12) ||
    invoiceType !== (store?.invoiceType ?? "Sales Invoice");

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
      setPhotoError(describePlatformError(err, ERROR_COULD_NOT_PROCESS_IMAGE));
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
        contactNumber: contactNumber.trim() || null,
        city: city.trim() || null,
        tin: tin.trim() || null,
        businessPermitNo: businessPermitNo.trim() || null,
        birRegistered,
        vatStatus,
        vatRate,
        invoiceType,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setPhotoBlob(null);
      setPhotoPreview(null);
      setSaved(true);
    } catch (err) {
      setFormError(describePlatformError(err, ERROR_COULD_NOT_SAVE_STORE_DETAILS));
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
    setContactNumber(store?.contactNumber ?? "");
    setCity(store?.city ?? "");
    setTin(store?.tin ?? "");
    setBusinessPermitNo(store?.businessPermitNo ?? "");
    setBirRegistered(store?.birRegistered ?? false);
    setVatStatus(store?.vatStatus ?? "non_vat");
    setVatRate(store?.vatRate ?? 0.12);
    setInvoiceType(store?.invoiceType ?? "Sales Invoice");
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
    vatStatus,
    setVatStatus,
    vatRate,
    setVatRate,
    invoiceType,
    setInvoiceType,

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
