import {Service} from "../business/service/service.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export default class Controller {
  constructor() {
    this.service = new Service();
  }

  async getHostKpi(event) {
    try {
      const { metric } = event.queryStringParameters || {};
      if (!metric) throw new Error("Missing parameter metric");

      const result = await this.service.getKpiMetric(event, metric);

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({ [metric]: result }),
      };
    } catch (error) {
      console.error(error.message);
      return {
        statusCode: error.statusCode || 500,
        body: JSON.stringify(error.message || "Something went wrong"),
      };
    }
  }
}
