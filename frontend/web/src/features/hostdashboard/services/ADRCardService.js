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

export const ADRCardService = {
  async getFreshToken() {
    try {
      const session = await Auth.currentSession();
      return session.getAccessToken().getJwtToken();
    } catch {
      return null;
    }
  },

  async fetchMetric(hostId, metric, filterType = "monthly", startDate, endDate) {
    if (!hostId) return null;

    const token = await this.getFreshToken();
    if (!token) return null;

    let url = `${BASE_URL}?hostId=${hostId}&metric=${metric}&filterType=${filterType}`;

    if (filterType === "custom" && startDate && endDate) {
      url += `&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;
    }

    let response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: { Authorization: token },
      });
    } catch {
      return null;
    }

    let rawText;
    try {
      rawText = await response.text();
    } catch {
      return null;
    }

    let parsed;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      return null;
    }

    return safelyParse(parsed);
  },

  async getADRMetrics(hostId, filterType = "monthly", startDate, endDate) {
    const metrics = ["averageDailyRate", "revenue", "bookedNights"];

    const results = {
      adr: 0,
      totalRevenue: 0,
      bookedNights: 0,
      chartData: [],
    };

    for (const metric of metrics) {
      const data = await this.fetchMetric(hostId, metric, filterType, startDate, endDate);

      if (!data) continue;

      if (metric === "averageDailyRate") {
        const v = data?.averageDailyRate ?? data?.value ?? (typeof data === "number" ? data : 0);
        results.adr = Number(v || 0);
      }

      if (metric === "revenue") {
        results.totalRevenue = data?.revenue?.totalRevenue ?? 0;
      }

      if (metric === "bookedNights") {
        results.bookedNights = data?.bookedNights?.bookedNights ?? data?.bookedNights ?? data?.value ?? 0;
      }
    }

    return results;
  },
};
