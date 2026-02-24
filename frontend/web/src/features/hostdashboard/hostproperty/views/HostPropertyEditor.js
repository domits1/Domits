import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ClipLoader from "react-spinners/ClipLoader";
import styles from "../../HostProperty.module.css";
import amenitiesCatalogue from "../../../../store/amenities";
import {
  HostPropertyActions,
  HostPropertyDeleteConfirmModal,
  HostPropertyDeleteReasonsModal,
  HostPropertyListingSummary,
  HostPropertyLoadingView,
  HostPropertyTabs,
  HostPropertyUnsavedChangesModal,
} from "../components/HostPropertyShell";
import {
  HostPropertyPhotoDeleteModal,
  HostPropertyTabContent,
} from "../components/HostPropertyTabContent";
import {
  deletePropertyListing,
  deletePropertyPhoto,
  fetchPropertyAndListings,
  savePropertyChanges,
  savePropertyPhotos,
} from "../services/hostPropertyApi";
import {
  AMENITY_CATEGORY_ORDER,
  createInitialPolicyRules,
  createInitialPricingForm,
  MAX_PROPERTY_IMAGES,
  MAX_TOTAL_PENDING_PHOTO_BYTES,
  SAVE_ENABLED_TABS,
  SAVING_MESSAGE_BY_TAB,
} from "../constants";
import {
  areSnapshotsEqual,
  areStringArraysEqual,
  buildDisplayedPhotos,
  buildOverviewSnapshot,
  buildPolicyRulesSnapshot,
  buildPricingSnapshot,
  createPendingPhotoFromFile,
  extractFetchedPropertyData,
  normalizeAmenityIds,
  normalizeCapacityValue,
  resolveDeletePhotoErrorMessage,
  resolveSaveErrorMessage,
} from "../utils/hostPropertyUtils";

const DELETE_PROPERTY_REASONS = [
  { id: "cannot-host", label: "I am no longer able to host." },
  { id: "not-ready", label: "I am not ready to host right now." },
  { id: "other-platform", label: "I found another platform to list on." },
  { id: "expected-more", label: "I expected to make more money." },
  { id: "circumstances-changed", label: "My circumstances have changed." },
  { id: "other", label: "Other" },
];

const resolveStatusLabel = (status) => {
  if (status === "ACTIVE") {
    return "Live";
  }
  if (status === "ARCHIVED") {
    return "Archived";
  }
  return "Draft";
};

const resolveStatusDotClass = (status, styleModule) => {
  if (status === "ACTIVE") {
    return styleModule.statusDotLive;
  }
  if (status === "ARCHIVED") {
    return styleModule.statusDotArchived;
  }
  return styleModule.statusDotDraft;
};

const resolveOverlayMessage = ({ deletingProperty, saving, savingMessage }) => {
  if (deletingProperty) {
    return "Removing listing...";
  }
  if (saving) {
    return savingMessage;
  }
  return "Preparing photos...";
};

const resolveCanSaveChanges = (selectedTab, pendingPhotosCount, hasPhotoOrderChanges) => {
  if (selectedTab === "Photos") {
    return pendingPhotosCount > 0 || hasPhotoOrderChanges;
  }
  return SAVE_ENABLED_TABS.has(selectedTab);
};

export default function HostProperty() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const propertyId = params.get("ID");
  const photoInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("INACTIVE");
  const [selectedTab, setSelectedTab] = useState("Overview");
  const [hostProperties, setHostProperties] = useState([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState([]);
  const [policyRules, setPolicyRules] = useState(createInitialPolicyRules);
  const [pricingForm, setPricingForm] = useState(createInitialPricingForm);
  const [expandedAmenityCategories, setExpandedAmenityCategories] = useState({});
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
  });
  const [capacity, setCapacity] = useState({
    propertyType: "",
    guests: 0,
    bedrooms: 0,
    beds: 0,
    bathrooms: 0,
  });
  const [address, setAddress] = useState({
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    country: "",
  });
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [isPhotoDragOver, setIsPhotoDragOver] = useState(false);
  const [photoOrderIds, setPhotoOrderIds] = useState([]);
  const [draggingPhotoId, setDraggingPhotoId] = useState(null);
  const [photoDropTargetId, setPhotoDropTargetId] = useState(null);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState(false);
  const [unsavedChangesModalOpen, setUnsavedChangesModalOpen] = useState(false);
  const [deletePropertyReasonsModalOpen, setDeletePropertyReasonsModalOpen] = useState(false);
  const [deletePropertyConfirmModalOpen, setDeletePropertyConfirmModalOpen] = useState(false);
  const [selectedDeletePropertyReasonIds, setSelectedDeletePropertyReasonIds] = useState([]);
  const savedOverviewSnapshotRef = useRef(null);
  const savedAmenityIdsRef = useRef([]);
  const savedPolicyRulesRef = useRef(buildPolicyRulesSnapshot(createInitialPolicyRules()));
  const savedPricingSnapshotRef = useRef(buildPricingSnapshot(createInitialPricingForm()));
  const bypassUnsavedGuardRef = useRef(false);
  const pendingNavigationActionRef = useRef(null);
  const isDevelopment = process.env.NODE_ENV === "development";

  const amenitiesByCategory = useMemo(() => {
    return amenitiesCatalogue.reduce((categories, amenity) => {
      if (!categories[amenity.category]) {
        categories[amenity.category] = [];
      }
      categories[amenity.category].push(amenity);
      return categories;
    }, {});
  }, []);

  const amenityCategoryKeys = useMemo(() => {
    const categorySet = new Set(Object.keys(amenitiesByCategory));
    const ordered = AMENITY_CATEGORY_ORDER.filter((category) => categorySet.has(category));
    const leftovers = Object.keys(amenitiesByCategory)
      .filter((category) => !AMENITY_CATEGORY_ORDER.includes(category))
      .sort((left, right) => left.localeCompare(right));
    return [...ordered, ...leftovers];
  }, [amenitiesByCategory]);

  const selectedAmenityIdSet = useMemo(() => new Set(selectedAmenityIds), [selectedAmenityIds]);
  const displayedPhotos = useMemo(
    () => buildDisplayedPhotos(existingPhotos, pendingPhotos, photoOrderIds),
    [existingPhotos, pendingPhotos, photoOrderIds]
  );
  const existingPhotoIdSet = useMemo(
    () => new Set(existingPhotos.map((photo) => photo.id)),
    [existingPhotos]
  );
  const orderedExistingPhotoIds = useMemo(
    () => photoOrderIds.filter((photoId) => existingPhotoIdSet.has(photoId)),
    [photoOrderIds, existingPhotoIdSet]
  );
  const hasPhotoOrderChanges = useMemo(
    () => existingPhotos.map((photo) => photo.id).join(",") !== orderedExistingPhotoIds.join(","),
    [existingPhotos, orderedExistingPhotoIds]
  );
  const overviewSnapshot = useMemo(
    () => buildOverviewSnapshot(form, capacity, address),
    [form, capacity, address]
  );
  const amenityIdsSnapshot = useMemo(
    () => normalizeAmenityIds(selectedAmenityIds),
    [selectedAmenityIds]
  );
  const policyRulesSnapshot = useMemo(
    () => buildPolicyRulesSnapshot(policyRules),
    [policyRules]
  );
  const pricingSnapshot = useMemo(
    () => buildPricingSnapshot(pricingForm),
    [pricingForm]
  );
  const hasOverviewChanges = savedOverviewSnapshotRef.current
    ? !areSnapshotsEqual(overviewSnapshot, savedOverviewSnapshotRef.current)
    : false;
  const hasAmenitiesChanges = !areStringArraysEqual(amenityIdsSnapshot, savedAmenityIdsRef.current);
  const hasPoliciesChanges = !areSnapshotsEqual(policyRulesSnapshot, savedPolicyRulesRef.current);
  const hasPricingChanges = !areSnapshotsEqual(pricingSnapshot, savedPricingSnapshotRef.current);
  const hasPhotoChanges = pendingPhotos.length > 0 || hasPhotoOrderChanges;
  const hasUnsavedChanges = !loading &&
    (hasOverviewChanges || hasAmenitiesChanges || hasPricingChanges || hasPoliciesChanges || hasPhotoChanges);

  const selectedAmenityCountByCategory = useMemo(() => {
    return amenityCategoryKeys.reduce((counts, category) => {
      const categoryAmenities = amenitiesByCategory[category] || [];
      counts[category] = categoryAmenities.filter((amenity) => selectedAmenityIdSet.has(String(amenity.id))).length;
      return counts;
    }, {});
  }, [amenitiesByCategory, amenityCategoryKeys, selectedAmenityIdSet]);

  useEffect(() => {
    if (amenityCategoryKeys.length === 0) {
      return;
    }
    setExpandedAmenityCategories((previous) => {
      if (Object.keys(previous).length > 0) {
        return previous;
      }
      return { [amenityCategoryKeys[0]]: true };
    });
  }, [amenityCategoryKeys]);

  useEffect(() => {
    if (!propertyId) {
      setError("Missing property ID.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchProperty = async () => {
      setLoading(true);
      setError("");
      try {
        const { data, hostPropertiesData } = await fetchPropertyAndListings(propertyId);
        if (!isMounted) {
          return;
        }
        const fetchedPropertyData = extractFetchedPropertyData(data, hostPropertiesData);
        setStatus(fetchedPropertyData.status);
        setForm(fetchedPropertyData.form);
        setCapacity(fetchedPropertyData.capacity);
        setAddress(fetchedPropertyData.address);
        setSelectedAmenityIds(fetchedPropertyData.selectedAmenityIds);
        setPolicyRules(fetchedPropertyData.policyRules);
        setPricingForm(fetchedPropertyData.pricingForm);
        setExistingPhotos(fetchedPropertyData.existingPhotos);
        setPendingPhotos([]);
        setIsPhotoDragOver(false);
        setPhotoOrderIds(fetchedPropertyData.existingPhotos.map((photo) => photo.id));
        setDraggingPhotoId(null);
        setPhotoDropTargetId(null);
        setPhotoToDelete(null);
        setDeletingPhoto(false);
        setHostProperties(fetchedPropertyData.hostProperties);
        savedOverviewSnapshotRef.current = buildOverviewSnapshot(
          fetchedPropertyData.form,
          fetchedPropertyData.capacity,
          fetchedPropertyData.address
        );
        savedAmenityIdsRef.current = normalizeAmenityIds(fetchedPropertyData.selectedAmenityIds);
        savedPolicyRulesRef.current = buildPolicyRulesSnapshot(fetchedPropertyData.policyRules);
        savedPricingSnapshotRef.current = buildPricingSnapshot(fetchedPropertyData.pricingForm);
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Could not load property details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProperty();
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const updateAddressField = (field, value) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const updateCapacityField = (field, value) => {
    setCapacity((prev) => ({ ...prev, [field]: normalizeCapacityValue(value) }));
  };

  const adjustCapacityField = (field, delta) => {
    setCapacity((prev) => ({ ...prev, [field]: normalizeCapacityValue(prev[field] + delta) }));
  };

  const openPhotoPicker = () => {
    if (!photoInputRef.current) {
      return;
    }
    photoInputRef.current.value = "";
    photoInputRef.current.click();
  };

  const addPhotosToQueue = async (files) => {
    const incomingFiles = Array.from(files || []);
    if (incomingFiles.length === 0) {
      return;
    }

    const availableSlots = MAX_PROPERTY_IMAGES - (existingPhotos.length + pendingPhotos.length);
    if (availableSlots <= 0) {
      toast.error(`A listing can have up to ${MAX_PROPERTY_IMAGES} photos.`);
      return;
    }

    const acceptedFiles = incomingFiles.slice(0, availableSlots);
    setPreparingPhotos(true);
    try {
      const preparedPhotos = [];
      let totalPendingBytes = pendingPhotos.reduce((total, photo) => total + Number(photo?.size || 0), 0);
      for (const file of acceptedFiles) {
        if (totalPendingBytes + file.size > MAX_TOTAL_PENDING_PHOTO_BYTES) {
          toast.error("Total upload size is too large.");
          continue;
        }
        try {
          const pendingPhoto = await createPendingPhotoFromFile(file);
          preparedPhotos.push(pendingPhoto);
          totalPendingBytes += pendingPhoto.size;
        } catch (error) {
          toast.error(error?.message || "Photo could not be added.");
        }
      }

      if (preparedPhotos.length > 0) {
        setPendingPhotos((previous) => [...previous, ...preparedPhotos]);
        setPhotoOrderIds((previous) => [...previous, ...preparedPhotos.map((photo) => photo.id)]);
        const pluralSuffix = preparedPhotos.length === 1 ? "" : "s";
        toast.success(`${preparedPhotos.length} new photo${pluralSuffix} ready to upload.`);
      }

      if (incomingFiles.length > acceptedFiles.length) {
        toast.error(`Only ${MAX_PROPERTY_IMAGES} photos are allowed per listing.`);
      }
    } finally {
      setPreparingPhotos(false);
    }
  };

  const handlePhotoInputChange = async (event) => {
    await addPhotosToQueue(event.target.files);
  };

  const handlePhotoAddDragOver = (event) => {
    event.preventDefault();
    if (draggingPhotoId) {
      setPhotoDropTargetId(null);
      setIsPhotoDragOver(false);
      return;
    }
    const dragTypes = Array.from(event.dataTransfer?.types || []);
    if (dragTypes.includes("Files")) {
      setIsPhotoDragOver(true);
    }
  };

  const handlePhotoAddDragLeave = () => {
    setIsPhotoDragOver(false);
  };

  const handlePhotoDrop = async (event) => {
    event.preventDefault();
    setIsPhotoDragOver(false);
    if (draggingPhotoId) {
      return;
    }
    const droppedFiles = event.dataTransfer?.files;
    if (!droppedFiles || droppedFiles.length === 0) {
      return;
    }
    await addPhotosToQueue(droppedFiles);
  };

  const removePendingPhoto = (photoId) => {
    setPendingPhotos((previous) => previous.filter((photo) => photo.id !== photoId));
    setPhotoOrderIds((previous) => previous.filter((id) => id !== photoId));
  };

  const handleRequestDeletePhoto = (photo) => {
    if (!photo || saving || deletingPhoto) {
      return;
    }
    if (photo.isPending) {
      removePendingPhoto(photo.id);
      toast.success("Photo removed.");
      return;
    }
    setPhotoToDelete(photo);
  };

  const closePhotoDeleteModal = () => {
    if (deletingPhoto) {
      return;
    }
    setPhotoToDelete(null);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete || !propertyId) {
      return;
    }

    setDeletingPhoto(true);
    setError("");
    try {
      if (photoToDelete.isPending) {
        removePendingPhoto(photoToDelete.id);
        toast.success("Photo removed.");
      } else {
        const refreshedPhotos = await deletePropertyPhoto({
          propertyId,
          imageId: photoToDelete.id,
        });
        setExistingPhotos(refreshedPhotos);
        setPhotoOrderIds(refreshedPhotos.map((photo) => photo.id));
        toast.success("Photo deleted successfully.");
      }
      setPhotoToDelete(null);
    } catch (deleteError) {
      console.error(deleteError);
      const deleteErrorMessage = resolveDeletePhotoErrorMessage(deleteError, isDevelopment);
      setError(deleteErrorMessage);
      toast.error(deleteErrorMessage);
    } finally {
      setDeletingPhoto(false);
    }
  };

  const handlePhotoTileDragStart = (photoId) => {
    setDraggingPhotoId(photoId);
  };

  const handlePhotoTileDragEnd = () => {
    setDraggingPhotoId(null);
    setPhotoDropTargetId(null);
  };

  const handlePhotoTileDragOver = (targetPhotoId) => {
    if (!draggingPhotoId || draggingPhotoId === targetPhotoId) {
      setPhotoDropTargetId(null);
      return;
    }
    setPhotoDropTargetId(targetPhotoId);
  };

  const handlePhotoTileDragLeave = (targetPhotoId) => {
    setPhotoDropTargetId((previous) => (previous === targetPhotoId ? null : previous));
  };

  const handlePhotoTileDrop = (targetPhotoId) => {
    if (!draggingPhotoId || draggingPhotoId === targetPhotoId) {
      return;
    }
    setPhotoOrderIds((previous) => {
      const fromIndex = previous.indexOf(draggingPhotoId);
      const toIndex = previous.indexOf(targetPhotoId);
      if (fromIndex === -1 || toIndex === -1) {
        return previous;
      }
      const reordered = [...previous];
      reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, draggingPhotoId);
      return reordered;
    });
    setDraggingPhotoId(null);
    setPhotoDropTargetId(null);
  };

  const saveOverview = async () => {
    if (saving || preparingPhotos) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (selectedTab === "Photos") {
        const photoSaveResult = await savePropertyPhotos({
          propertyId,
          existingPhotos,
          pendingPhotos,
          photoOrderIds,
          hasPhotoOrderChanges,
        });
        setExistingPhotos(photoSaveResult.nextExistingPhotos);
        setPendingPhotos(photoSaveResult.nextPendingPhotos);
        setPhotoOrderIds(photoSaveResult.nextPhotoOrderIds);
        if (photoSaveResult.didUpload) {
          toast.success(photoSaveResult.successMessage);
        } else if (photoSaveResult.didReorder) {
          toast.success(photoSaveResult.successMessage);
        } else {
          toast.info(photoSaveResult.successMessage);
        }
        return;
      }

      const { normalizedForm, normalizedPricingForm, successMessage } = await savePropertyChanges({
        selectedTab,
        propertyId,
        form,
        capacity,
        address,
        selectedAmenityIds,
        policyRules,
        pricingForm,
      });
      setForm(normalizedForm);
      setPricingForm(normalizedPricingForm);
      setHostProperties((previous) =>
        previous.map((accommodation) =>
          accommodation.id === propertyId
            ? { ...accommodation, title: normalizedForm.title || "Untitled listing" }
            : accommodation
        )
      );
      savedOverviewSnapshotRef.current = buildOverviewSnapshot(normalizedForm, capacity, address);
      if (selectedTab === "Amenities") {
        savedAmenityIdsRef.current = normalizeAmenityIds(selectedAmenityIds);
      }
      if (selectedTab === "Pricing") {
        savedPricingSnapshotRef.current = buildPricingSnapshot(normalizedPricingForm);
      }
      if (selectedTab === "Policies") {
        savedPolicyRulesRef.current = buildPolicyRulesSnapshot(policyRules);
      }
      toast.success(successMessage);
    } catch (err) {
      console.error(err);
      const resolvedErrorMessage = resolveSaveErrorMessage(err, isDevelopment);
      setError(resolvedErrorMessage);
      toast.error(resolvedErrorMessage);
    } finally {
      setSaving(false);
    }
  };

  const isBusy = saving || preparingPhotos || deletingProperty;
  const shouldBlockNavigation = hasUnsavedChanges && !isBusy && !deletingPhoto;

  const requestNavigation = useCallback((navigationAction) => {
    if (bypassUnsavedGuardRef.current || !shouldBlockNavigation) {
      navigationAction();
      return;
    }
    pendingNavigationActionRef.current = navigationAction;
    setUnsavedChangesModalOpen(true);
  }, [shouldBlockNavigation]);

  const stayOnUnsavedChanges = () => {
    pendingNavigationActionRef.current = null;
    setUnsavedChangesModalOpen(false);
  };

  const leaveWithUnsavedChanges = () => {
    const navigationAction = pendingNavigationActionRef.current;
    pendingNavigationActionRef.current = null;
    setUnsavedChangesModalOpen(false);
    if (!navigationAction) {
      return;
    }
    bypassUnsavedGuardRef.current = true;
    navigationAction();
    setTimeout(() => {
      bypassUnsavedGuardRef.current = false;
    }, 0);
  };

  useEffect(() => {
    if (!shouldBlockNavigation) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    globalThis.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      globalThis.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldBlockNavigation]);

  useEffect(() => {
    if (!shouldBlockNavigation) {
      return undefined;
    }

    const handleDocumentNavigationClick = (event) => {
      if (bypassUnsavedGuardRef.current) {
        return;
      }
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) {
        return;
      }

      const anchor = eventTarget.closest("a[href]");
      if (!anchor) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") {
        return;
      }
      if (anchor.hasAttribute("download")) {
        return;
      }

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) {
        return;
      }

      const nextUrl = new URL(anchor.href, globalThis.location.href);
      const currentUrl = new URL(globalThis.location.href);
      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      const currentPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      if (nextPath === currentPath) {
        return;
      }

      event.preventDefault();
      requestNavigation(navigate.bind(null, nextPath));
    };

    document.addEventListener("click", handleDocumentNavigationClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentNavigationClick, true);
    };
  }, [navigate, requestNavigation, shouldBlockNavigation]);

  useEffect(() => {
    if (!shouldBlockNavigation && unsavedChangesModalOpen) {
      pendingNavigationActionRef.current = null;
      setUnsavedChangesModalOpen(false);
    }
  }, [shouldBlockNavigation, unsavedChangesModalOpen]);

  if (loading) {
    return <HostPropertyLoadingView />;
  }

  const statusLabel = resolveStatusLabel(status);
  const statusDotClass = resolveStatusDotClass(status, styles);
  const displayedPropertyType = capacity.propertyType || "Entire house";
  const savingMessage = SAVING_MESSAGE_BY_TAB[selectedTab] || "Saving property details...";
  const overlayMessage = resolveOverlayMessage({ deletingProperty, saving, savingMessage });

  const handlePropertyChange = (event) => {
    const nextPropertyId = event.target.value;
    if (!nextPropertyId || nextPropertyId === propertyId) {
      return;
    }
    requestNavigation(navigate.bind(null, `/hostdashboard/property?ID=${encodeURIComponent(nextPropertyId)}`));
  };

  const toggleAmenityCategory = (category) => {
    setExpandedAmenityCategories((previous) => ({
      ...previous,
      [category]: !previous[category],
    }));
  };

  const toggleAmenitySelection = (amenityId) => {
    const normalizedAmenityId = String(amenityId);
    setSelectedAmenityIds((previous) =>
      previous.includes(normalizedAmenityId)
        ? previous.filter((id) => id !== normalizedAmenityId)
        : [...previous, normalizedAmenityId]
    );
  };

  const updatePolicyRule = (ruleName, value) => {
    setPolicyRules((previous) => ({
      ...previous,
      [ruleName]: value,
    }));
  };

  const resetDeletePropertyFlow = () => {
    setDeletePropertyReasonsModalOpen(false);
    setDeletePropertyConfirmModalOpen(false);
    setSelectedDeletePropertyReasonIds([]);
  };

  const handleDeletePropertyClick = () => {
    if (deletingProperty) {
      return;
    }
    setDeletePropertyReasonsModalOpen(true);
  };

  const toggleDeletePropertyReason = (reasonId) => {
    setSelectedDeletePropertyReasonIds((previous) =>
      previous.includes(reasonId)
        ? previous.filter((value) => value !== reasonId)
        : [...previous, reasonId]
    );
  };

  const handleDeletePropertyReasonsNext = () => {
    if (deletingProperty) {
      return;
    }
    setDeletePropertyReasonsModalOpen(false);
    setDeletePropertyConfirmModalOpen(true);
  };

  const handleDeletePropertyConfirmBack = () => {
    if (deletingProperty) {
      return;
    }
    setDeletePropertyConfirmModalOpen(false);
    setDeletePropertyReasonsModalOpen(true);
  };

  const handleDeletePropertyConfirm = async () => {
    if (deletingProperty) {
      return;
    }

    setDeletingProperty(true);
    setError("");

    let shouldResetDeletingState = true;
    try {
      const deletionResult = await deletePropertyListing({
        propertyId,
        reasonIds: selectedDeletePropertyReasonIds,
      });
      const deletionMode = String(deletionResult?.result || "deleted").toLowerCase();
      if (deletionMode === "archived") {
        toast.info("Listing has booking history and was moved to Archived.");
      } else {
        toast.success("Listing deleted successfully.");
      }
      resetDeletePropertyFlow();
      bypassUnsavedGuardRef.current = true;
      shouldResetDeletingState = false;
      navigate("/hostdashboard/listings");
      setTimeout(() => {
        bypassUnsavedGuardRef.current = false;
      }, 0);
    } catch (deleteError) {
      console.error(deleteError);
      const deleteErrorMessage = deleteError?.message || "Failed to delete listing.";
      setError(deleteErrorMessage);
      toast.error(deleteErrorMessage);
    } finally {
      if (shouldResetDeletingState) {
        setDeletingProperty(false);
      }
    }
  };

  const canSaveChanges = resolveCanSaveChanges(selectedTab, pendingPhotos.length, hasPhotoOrderChanges);
  const handleBackToListings = () => requestNavigation(navigate.bind(null, "/hostdashboard/listings"));

  return (
    <main className="page-Host">
      <p className="page-Host-title">Listing editor</p>
      <div className="page-Host-content">
        <section className={`host-pc-dashboard ${styles.editorShell}`}>
          {isBusy ? (
            <output className={styles.savingOverlay} aria-live="polite">
              <span className={styles.savingOverlayContent}>
                <ClipLoader size={80} color="#0D9813" loading />
                <span className={styles.savingOverlayText}>{overlayMessage}</span>
              </span>
            </output>
          ) : null}

          <HostPropertyTabs selectedTab={selectedTab} onSelectTab={setSelectedTab} saving={isBusy} />
          <HostPropertyListingSummary
            propertyId={propertyId}
            hostProperties={hostProperties}
            title={form.title}
            statusLabel={statusLabel}
            statusDotClass={statusDotClass}
            onPropertyChange={handlePropertyChange}
            saving={isBusy}
          />

          <HostPropertyTabContent
            selectedTab={selectedTab}
            form={form}
            updateField={updateField}
            displayedPropertyType={displayedPropertyType}
            setCapacity={setCapacity}
            capacity={capacity}
            adjustCapacityField={adjustCapacityField}
            updateCapacityField={updateCapacityField}
            address={address}
            updateAddressField={updateAddressField}
            displayedPhotos={displayedPhotos}
            pendingPhotoCount={pendingPhotos.length}
            onOpenPhotoPicker={openPhotoPicker}
            onPhotoFilesSelected={handlePhotoInputChange}
            onPhotoDrop={handlePhotoDrop}
            onPhotoDragOver={handlePhotoAddDragOver}
            onPhotoDragLeave={handlePhotoAddDragLeave}
            isPhotoDragOver={isPhotoDragOver}
            onRequestDeletePhoto={handleRequestDeletePhoto}
            onPhotoTileDragStart={handlePhotoTileDragStart}
            onPhotoTileDragEnd={handlePhotoTileDragEnd}
            onPhotoTileDragOver={handlePhotoTileDragOver}
            onPhotoTileDragLeave={handlePhotoTileDragLeave}
            onPhotoTileDrop={handlePhotoTileDrop}
            draggingPhotoId={draggingPhotoId}
            photoDropTargetId={photoDropTargetId}
            deletingPhoto={deletingPhoto}
            photoInputRef={photoInputRef}
            amenityCategoryKeys={amenityCategoryKeys}
            amenitiesByCategory={amenitiesByCategory}
            expandedAmenityCategories={expandedAmenityCategories}
            selectedAmenityCountByCategory={selectedAmenityCountByCategory}
            selectedAmenityIdSet={selectedAmenityIdSet}
            toggleAmenityCategory={toggleAmenityCategory}
            toggleAmenitySelection={toggleAmenitySelection}
            pricingForm={pricingForm}
            setPricingForm={setPricingForm}
            policyRules={policyRules}
            updatePolicyRule={updatePolicyRule}
            handleDeletePropertyClick={handleDeletePropertyClick}
            saving={isBusy}
          />
          <HostPropertyPhotoDeleteModal
            open={Boolean(photoToDelete)}
            photoSrc={photoToDelete?.src || ""}
            deletingPhoto={deletingPhoto}
            onCancel={closePhotoDeleteModal}
            onConfirm={confirmDeletePhoto}
          />
          <HostPropertyUnsavedChangesModal
            open={unsavedChangesModalOpen}
            onStay={stayOnUnsavedChanges}
            onLeave={leaveWithUnsavedChanges}
          />
          <HostPropertyDeleteReasonsModal
            open={deletePropertyReasonsModalOpen}
            reasons={DELETE_PROPERTY_REASONS}
            selectedReasonIds={selectedDeletePropertyReasonIds}
            onToggleReason={toggleDeletePropertyReason}
            onClose={resetDeletePropertyFlow}
            onNext={handleDeletePropertyReasonsNext}
            submitting={deletingProperty}
          />
          <HostPropertyDeleteConfirmModal
            open={deletePropertyConfirmModalOpen}
            onBack={handleDeletePropertyConfirmBack}
            onCancel={resetDeletePropertyFlow}
            onConfirm={handleDeletePropertyConfirm}
            submitting={deletingProperty}
          />
          {error ? <p className={styles.errorText}>{error}</p> : null}

          <HostPropertyActions
            onBack={handleBackToListings}
            onSave={saveOverview}
            saving={isBusy}
            saveEnabled={canSaveChanges}
          />
        </section>
      </div>
    </main>
  );
}
