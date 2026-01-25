import { Auth } from "aws-amplify";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

export const BookedNightsService = {
  async fetchBookedNights(hostId, periodType = "monthly", startDate, endDate) {
    if (!hostId) throw new Error("Host ID is required");

    const session = await Auth.currentSession();
    const token = session.getAccessToken().getJwtToken();

    let url = `${BASE_URL}?hostId=${hostId}&metric=bookedNights&filterType=${periodType}`;
    if (periodType === "custom" && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: token },
    });

    let data = await response.json();
    if (data?.body) data = JSON.parse(data.body);

    let nights = 0;
    if (typeof data === "number") {
      nights = data;
    } else if (data?.bookedNights) {
      if (typeof data.bookedNights === "number") nights = data.bookedNights;
      else if ("bookedNights" in data.bookedNights) nights = data.bookedNights.bookedNights;
      else if ("value" in data.bookedNights) nights = data.bookedNights.value;
    } else if (data?.value != null) {
      nights = Number(data.value);
    }

    return Number(nights) || 0;
  },
};
