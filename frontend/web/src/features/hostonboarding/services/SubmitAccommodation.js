import { getAccessToken } from "../../../services/getAccessToken";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
function toTimeString(value) {
  if (typeof value === "number") {
    return String(value).padStart(2, "0") + ":00";
  }
  if (typeof value === "string" && /^\d{1,2}$/.test(value)) {
    return value.padStart(2, "0") + ":00";
  }
  return value;
}

export async function submitAccommodation(navigate, builder, options = {}) {
  const { onStateChange, onSuccessPath = "/hostdashboard" } = options;
  const setSubmitState = (nextState) => {
    if (typeof onStateChange === "function") {
      onStateChange(nextState);
    }
  };

  const API_BASE = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default";
  const API_URL = `${API_BASE}/property`;
  const PRESIGN_URL = `${API_BASE}/property/images/presign`;
  const CONFIRM_URL = `${API_BASE}/property/images/confirm`;
  const CONFIRM_BATCH_SIZE = 8;
  const DRAFT_URL = `${API_BASE}/property/draft`;

  const payload = builder.build();
  const storeState = useFormStoreHostOnboarding.getState();
  const imageList = storeState?.accommodationDetails?.imageList || [];
  let propertyId = storeState?.accommodationDetails?.propertyId;
  const setImageList = storeState?.setImageList;
  const resetOnboardingState = storeState?.resetOnboardingState;

  const ensureDraft = async () => {
    if (propertyId) return propertyId;
    setSubmitState("creating-draft");
    const res = await fetch(DRAFT_URL, {
      method: "POST",
      headers: {
        Authorization: getAccessToken(),
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to create draft.");
    }
    const data = await res.json();
    propertyId = data.propertyId;
    useFormStoreHostOnboarding.getState().setPropertyId(propertyId);
    return propertyId;
  };

  const presignUploads = async (draftId, images) => {
    setSubmitState("presigning-images");
    const res = await fetch(PRESIGN_URL, {
      method: "POST",
      headers: {
        Authorization: getAccessToken(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propertyId: draftId,
        files: images.map((image) => ({
          contentType: image.contentType,
          size: image.size,
        })),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to presign uploads.");
    }
    const data = await res.json();
    return data.uploads || [];
  };

  const uploadToS3 = async (uploads, images) => {
    setSubmitState("uploading-images");
    await Promise.all(
      uploads.map(async (upload, index) => {
        const res = await fetch(upload.url, {
          method: "PUT",
          headers: {
            "Content-Type": upload.contentType,
          },
          body: images[index].file,
        });
        if (!res.ok) {
          throw new Error(`Failed to upload image (${res.status}).`);
        }
      })
    );
  };

  const confirmUploads = async (draftId, uploads, sortOrders) => {
    setSubmitState("confirming-images");
    for (let startIndex = 0; startIndex < uploads.length; startIndex += CONFIRM_BATCH_SIZE) {
      const uploadBatch = uploads.slice(startIndex, startIndex + CONFIRM_BATCH_SIZE);
      const res = await fetch(CONFIRM_URL, {
        method: "POST",
        headers: {
          Authorization: getAccessToken(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: draftId,
          images: uploadBatch.map((upload, batchIndex) => {
            const globalIndex = startIndex + batchIndex;
            return {
              imageId: upload.imageId,
              originalKey: upload.key,
              sortOrder: sortOrders[globalIndex] ?? globalIndex,
            };
          }),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to confirm uploads.");
      }
    }
  };

  const rawCheckIn = payload.propertyCheckIn?.checkIn;
  const rawCheckOut = payload.propertyCheckIn?.checkOut;
  payload.propertyCheckIn = {
    checkIn: {
      from: toTimeString(typeof rawCheckIn?.from === "number" ? rawCheckIn.from : 9),
      till: toTimeString(typeof rawCheckIn?.till === "number" ? rawCheckIn.till : 18),
    },
    checkOut: {
      from: toTimeString(typeof rawCheckOut?.from === "number" ? rawCheckOut.from : 7),
      till: toTimeString(typeof rawCheckOut?.till === "number" ? rawCheckOut.till : 8),
    },
  };
  if (!Array.isArray(payload.propertyAvailability)) {
    payload.propertyAvailability = [];
  }
  if (payload.propertyAvailability.length > 0) {
    const tomorrowUTC = (() => {
      const d = new Date();
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
    })();
    payload.propertyAvailability = payload.propertyAvailability.map((av) => ({
      ...av,
      availableStartDate:
        av.availableStartDate <= Date.now() ? tomorrowUTC : av.availableStartDate,
    }));
  }
  payload.propertyTestStatus = {
    ...(payload.propertyTestStatus || {}),
    isTest: false,
  };

  try {
    setSubmitState("preparing");
    const indexedImages = Array.isArray(imageList)
      ? imageList.map((image, index) => ({ image, index }))
      : [];
    const pendingImages = indexedImages.filter(({ image }) => image?.file);

    if (Array.isArray(imageList) && imageList.length > 0) {
      const draftId = await ensureDraft();

      if (pendingImages.length > 0) {
        const pendingImageFiles = pendingImages.map(({ image }) => image);
        const pendingSortOrders = pendingImages.map(({ index }) => index);
        const uploads = await presignUploads(draftId, pendingImageFiles);
        await uploadToS3(uploads, pendingImageFiles);
        await confirmUploads(draftId, uploads, pendingSortOrders);

        const updatedImages = [...imageList];
        pendingImages.forEach(({ index }, uploadIndex) => {
          updatedImages[index] = {
            ...updatedImages[index],
            uploaded: true,
            imageId: uploads[uploadIndex].imageId,
            originalKey: uploads[uploadIndex].key,
            file: null,
          };
        });
        setImageList?.(updatedImages);
      }

      payload.propertyId = draftId;
      payload.imageUploadMode = "presigned";
    }

    setSubmitState("creating-property");
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: getAccessToken(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try {
        const j = JSON.parse(text);
        msg = j.message || j.error || JSON.stringify(j);
      } catch (_) {}
      alert(`Request failed (${res.status}): ${msg}`);
      console.error("POST failed", { status: res.status, body: msg, url: API_URL });
      setSubmitState("idle");
      return false;
    }

    setSubmitState("finalizing");
    builder?.reset?.();
    resetOnboardingState?.();
    sessionStorage.removeItem("propertyBuilder");
    navigate(onSuccessPath);
    return true;
  } catch (err) {
    setSubmitState("idle");
    alert(`Network error: ${err?.message || err}`);
    console.error("Network error", err);
    return false;
  }
}
