import { getAccessToken } from "../../../../src/services/getAccessToken.js";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

const formatDate = (isoDate) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
};

export const RevPARService = {
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

  async getRevPARMetrics(hostId, filterType = "monthly", startDate, endDate) {
    const metrics = ["revenuePerAvailableRoom", "revenue", "availableNights"];
    const results = {};

    for (const metric of metrics) {
      const data = await this.fetchMetric(hostId, metric, filterType, startDate, endDate);

      if (metric === "revenuePerAvailableRoom") {
        if (typeof data === "number") results.revPAR = data;
        else if (data.revenuePerAvailableRoom != null) results.revPAR = Number(data.revenuePerAvailableRoom);
        else if (data.value != null) results.revPAR = Number(data.value);
        else results.revPAR = 0;

        if (data.dailyMetrics?.length) {
          results.chartData = data.dailyMetrics.map((item) => ({
            date: item.date,
            revPAR: Number(item.revPAR),
          }));
        }
      }

      if (metric === "revenue") {
        results.totalRevenue = data?.revenue?.totalRevenue ?? 0;
      }

      if (metric === "availableNights") {
        if (typeof data.availableNights === "number") results.availableNights = data.availableNights;
        else if (data.availableNights?.availableNights != null)
          results.availableNights = data.availableNights.availableNights;
        else if (data.value != null) results.availableNights = data.value;
        else results.availableNights = 0;
      }
    }

    return results;
  },
};
