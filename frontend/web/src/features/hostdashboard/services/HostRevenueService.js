// src/features/hostdashboard/services/HostRevenueService.js
import { Auth } from "aws-amplify";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

export const HostRevenueService = {

  async fetchMetricData(metric, hostId, filterType = "monthly", startDate, endDate) {
    if (!hostId) throw new Error("Host ID is required");

    try {
      const session = await Auth.currentSession();
      const token = session.getAccessToken().getJwtToken();


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
      throw err;
    }
  },

  async getRevenue(hostId) {
    const data = await this.fetchMetricData("revenue", hostId);
    return Number(data?.revenue?.totalRevenue ?? 0);
  },

  async getBookedNights(hostId) {
    const data = await this.fetchMetricData("bookedNights", hostId);
    return Number(data?.bookedNights?.bookedNights ?? 0);
  },

  async getAvailableNights(hostId) {
    const data = await this.fetchMetricData("availableNights", hostId);
    return Number(data?.availableNights?.availableNights ?? 0);
  },

  async getPropertyCount(hostId) {
    const data = await this.fetchMetricData("propertyCount", hostId);
    return Number(data?.propertyCount?.propertyCount ?? 0);
  },

  async getMonthlyComparison(hostId) {
    const data = await this.fetchMetricData("monthlyComparison", hostId);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.monthlyComparison)) return data.monthlyComparison;
    return [];
  },

  async getAverageLengthOfStay(hostId, filterType = "monthly", startDate, endDate) {
    const data = await this.fetchMetricData("averageLengthOfStay", hostId, filterType, startDate, endDate);
    if (typeof data === "number") return data;
    if (data?.averageLengthOfStay != null) return Number(data.averageLengthOfStay);
    if (data?.value != null) return Number(data.value);
    return 0;
  },

};
