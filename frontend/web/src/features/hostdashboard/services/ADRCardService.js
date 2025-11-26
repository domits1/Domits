import { getAccessToken } from "../../../../src/services/getAccessToken.js";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

const formatDate = (isoDate) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
};

export const ADRCardService = {
  async fetchMetric(hostId, metric, filterType = "monthly", startDate, endDate) {
    if (!hostId) throw new Error("Host ID required");

    const token = await getAccessToken();

    let url = `${BASE_URL}?hostId=${hostId}&metric=${metric}&filterType=${filterType}`;
    if (filterType === "custom" && startDate && endDate) {
      url += `&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;
    }

    const response = await fetch(url, { headers: { Authorization: token } });
    let data = await response.json();
    if (data.body) data = JSON.parse(data.body);

    return data;
  },

  async getADRMetrics(hostId, filterType = "monthly", startDate, endDate) {
    const metrics = ["averageDailyRate", "revenue", "bookedNights"];
    const results = {};

    for (const metric of metrics) {
      const data = await this.fetchMetric(hostId, metric, filterType, startDate, endDate);

      if (metric === "averageDailyRate") {
        if (typeof data === "number") results.adr = data;
        else if (data.averageDailyRate != null) results.adr = Number(data.averageDailyRate);
        else if (data.value != null) results.adr = Number(data.value);
        else results.adr = 0;
      }

      if (metric === "revenue") {
        results.totalRevenue = data?.revenue?.totalRevenue ?? 0;
      }

      if (metric === "bookedNights") {
        if (typeof data.bookedNights === "number") results.bookedNights = data.bookedNights;
        else if (data.bookedNights?.bookedNights != null) results.bookedNights = data.bookedNights.bookedNights;
        else if (data.value != null) results.bookedNights = data.value;
        else results.bookedNights = 0;
      }
    }

    if (results.adrDailyMetrics?.length) {
      results.chartData = results.adrDailyMetrics.map((i) => ({
        date: i.date,
        adr: Number(i.adr),
      }));
    }

    return results;
  },
};

