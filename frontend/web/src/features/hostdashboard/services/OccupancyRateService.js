import { getAccessToken } from "../../../../src/services/getAccessToken.js";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

const formatDate = (isoDate) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
};

export const OccupancyRateService = {
  async fetchOccupancyRate(hostId, periodType = "monthly", startDate, endDate) {
    if (!hostId) throw new Error("Host ID is required");

    const token = await getAccessToken();

    let url = `${BASE_URL}?hostId=${hostId}&metric=occupancyRate&filterType=${periodType}`;
    if (periodType === "custom" && startDate && endDate) {
      url += `&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: token },
    });

    let data = await response.json();
    if (data?.body && typeof data.body === "string") {
      data = JSON.parse(data.body);
    }

    let rate = 0;
    if (typeof data === "number") rate = data;
    else if (data?.occupancyRate) rate = parseFloat(data.occupancyRate);
    else if (data?.occupancy_rate) rate = parseFloat(data.occupancy_rate);
    else if (data?.value) rate = parseFloat(data.value);

    if (!Number.isFinite(rate)) rate = 0;

    return Number(rate.toFixed(2));
  },
};
