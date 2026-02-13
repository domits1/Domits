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
export async function submitAccommodation(navigate, builder) {
  const API_BASE = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default";
  const API_URL = `${API_BASE}/property`;
  const PRESIGN_URL = `${API_BASE}/property/images/presign`;
  const CONFIRM_URL = `${API_BASE}/property/images/confirm`;
  const DRAFT_URL = `${API_BASE}/property/draft`;

  const payload = builder.build();
  const storeState = useFormStoreHostOnboarding.getState();
  const imageList = storeState?.accommodationDetails?.imageList || [];
  let propertyId = storeState?.accommodationDetails?.propertyId;

  const ensureDraft = async () => {
    if (propertyId) return propertyId;
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
    await Promise.all(
      uploads.map((upload, index) =>
        fetch(upload.url, {
          method: "PUT",
          headers: {
            "Content-Type": upload.contentType,
          },
          body: images[index].file,
        })
      )
    );
  };

  const confirmUploads = async (draftId, uploads) => {
    const res = await fetch(CONFIRM_URL, {
      method: "POST",
      headers: {
        Authorization: getAccessToken(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propertyId: draftId,
        images: uploads.map((upload, index) => ({
          imageId: upload.imageId,
          originalKey: upload.key,
          sortOrder: index,
        })),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to confirm uploads.");
    }
    return res.json();
  };
  if (payload.propertyCheckIn) {
    payload.propertyCheckIn = {
      ...payload.propertyCheckIn,
      checkIn: {
        from: toTimeString(payload.propertyCheckIn.checkIn.from),
        till: toTimeString(payload.propertyCheckIn.checkIn.till),
      },
      checkOut: {
        from: toTimeString(payload.propertyCheckIn.checkOut.from),
        till: toTimeString(payload.propertyCheckIn.checkOut.till),
      },
    };
  }
  payload.propertyTestStatus = {
    ...(payload.propertyTestStatus || {}),
    isTest: false,
  };

  try {
    if (Array.isArray(imageList) && imageList.length > 0) {
      const draftId = await ensureDraft();
      const uploads = await presignUploads(draftId, imageList);
      await uploadToS3(uploads, imageList);
      await confirmUploads(draftId, uploads);
      payload.propertyId = draftId;
      payload.imageUploadMode = "presigned";
    }
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
      return;
    }
    navigate("/hostdashboard");
  } catch (err) {
    alert(`Network error: ${err?.message || err}`);
    console.error("Network error", err);
  }
}
