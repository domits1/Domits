import { getAccessToken } from "../../../services/getAccessToken";

export async function submitAccommodation(navigate, builder) {
  const API_URL = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: getAccessToken(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(builder.build())
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