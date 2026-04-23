import { Auth } from "aws-amplify";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

const formatDate = (isoDate) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
};

function safelyParse(data) {
  if (data?.body && typeof data.body === "string") {
    try {
      return JSON.parse(data.body);
    } catch {
      return data;
    }
  }
  return data;
}

export const BookedNightsService = {
  async fetchBookedNights(hostId, periodType = "monthly", startDate, endDate) {
    if (!hostId) throw new Error("Host ID is required");

    const session = await Auth.currentSession();
    const token = session.getAccessToken().getJwtToken();

    let url = `${BASE_URL}?hostId=${hostId}&metric=bookedNights&filterType=${periodType}`;

    if (periodType === "custom" && startDate && endDate) {
      url += `&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch booked nights: ${response.status}`);
    }

    let rawText;
    try {
      rawText = await response.text();
    } catch {
      throw new Error("Failed to read booked nights response");
    }

    let parsed;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error("Invalid booked nights response");
    }

    const data = safelyParse(parsed);

    const nights =
      data?.bookedNights?.bookedNights ??
      data?.bookedNights ??
      data?.value ??
      (typeof data === "number" ? data : 0);

    return Number(nights) || 0;
  },
};