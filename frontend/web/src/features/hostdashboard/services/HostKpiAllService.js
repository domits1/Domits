import { getAccessToken } from "../../../../src/services/getAccessToken.js";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

export const HostKpiAllService = {
  async fetchAll(hostId, filterType, startDate, endDate) {
    if (!hostId) throw new Error("Host ID is missing");
    const effectiveFilterType = filterType ?? "monthly";
    const token = await getAccessToken();

    const formatDate = (isoDate) => {
      if (!isoDate) return "";
      const [y, m, d] = isoDate.split("-");
      return `${d}-${m}-${y}`;
    };

    let url = `${BASE_URL}?hostId=${hostId}&metric=all&filterType=${effectiveFilterType}`;

    if (effectiveFilterType === "custom" && startDate && endDate) {
      url += `&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;
    }

    const response = await fetch(url, {
      headers: { Authorization: token },
    });

    let data = await response.json();
    if (data?.body) data = JSON.parse(data.body);

    return data?.all ?? data;
  },
};