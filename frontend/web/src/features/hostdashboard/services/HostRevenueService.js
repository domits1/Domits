import { getAccessToken } from "../../../../src/services/getAccessToken.js";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

export const HostRevenueService = {
  async fetchMetricData(arg1, arg2, filterType = "monthly", startDate, endDate) {
    let hostId, metric;

    if ((typeof arg1 === "string" && arg1.startsWith("us-")) || arg1.length > 10) {
      hostId = arg1;
      metric = arg2;
    } else {
      metric = arg1;
      hostId = arg2;
    }

    if (!hostId) throw new Error("Host ID is missing");
    if (!metric) throw new Error("Metric name is missing");

    try {
      const token = await getAccessToken();

      const formatDate = (isoDate) => {
        if (!isoDate) return "";
        const [y, m, d] = isoDate.split("-");
        return `${d}-${m}-${y}`;
      };

      let url = `${BASE_URL}?hostId=${hostId}&metric=${metric}&filterType=${filterType}`;
      if (filterType === "custom" && startDate && endDate) {
        url += `&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;
      }

      const response = await fetch(url, { headers: { Authorization: token } });
      let data = await response.json();
      if (data?.body) data = JSON.parse(data.body);
      return data;
    } catch (err) {
      console.error(`Error fetching ${metric}:`, err);
      return null;
    }
  },

  async getRevenue(hostId) {
    const data = await this.fetchMetricData(hostId, "revenue");
    return Number(data?.revenue?.totalRevenue ?? 0);
  },

  async getBookedNights(hostId) {
    const data = await this.fetchMetricData(hostId, "bookedNights");
    return Number(data?.bookedNights?.bookedNights ?? 0);
  },

  async getAvailableNights(hostId) {
    const data = await this.fetchMetricData(hostId, "availableNights");
    return Number(data?.availableNights?.availableNights ?? 0);
  },

  async getPropertyCount(hostId) {
    const data = await this.fetchMetricData(hostId, "propertyCount");
    return Number(data?.propertyCount?.propertyCount ?? 0);
  },

  async getMonthlyComparison(hostId) {
    const data = await this.fetchMetricData(hostId, "monthlyComparison");
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.monthlyComparison)) return data.monthlyComparison;
    return [];
  },

  async getAverageLengthOfStay(hostId, filterType = "monthly", startDate, endDate) {
    const data = await this.fetchMetricData("averageLengthOfStay", hostId, filterType, startDate, endDate);
    if (typeof data === "number") return data;
    if (data?.averageLengthOfStay?.averageLengthOfStay != null)
      return Number(data.averageLengthOfStay.averageLengthOfStay);
    if (data?.averageLengthOfStay != null) return Number(data.averageLengthOfStay);
    if (data?.value != null) return Number(data.value);
    return 0;
  },
};
