import { getAccessToken } from "../../../services/getAccessToken";

function toTimeString(value) {
  if (typeof value === "number") {
    return String(value).padStart(2, "0") + ":00";
  }

  if (typeof value === "string" && /^\d{1,2}$/.test(value)) {
    return value.padStart(2, "0") + ":00";
  }

  return value; // already HH:MM
}

export async function submitAccommodation(navigate, builder) {
  const API_URL = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

  const payload = builder.build();

  // Normalize check-in / check-out times
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

  // ✅ SAFE INITIALIZATION
  payload.propertyTestStatus = {
    ...(payload.propertyTestStatus || {}),
    isTest: true,
  };


  try {
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