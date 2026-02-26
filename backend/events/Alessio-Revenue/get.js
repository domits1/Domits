// backend/events/alessio-revenue/get.js
import Controller from "../../functions/Alessio-Revenue/controller/controller.js";

// --- Mock de Service zodat we lokaal geen Cognito/Stripe nodig hebben ---
const fakeAll = {
  revenue: { totalRevenue: 1000 },
  bookedNights: { bookedNights: 10 },
  availableNights: { availableNights: 20 },
  propertyCount: 3,
  averageLengthOfStay: { averageLengthOfStay: 2.5 },
  averageDailyRate: "100.00",
  occupancyRate: "50.00",
  revenuePerAvailableRoom: "50.00",
};

async function main() {
  const controller = new Controller();

  // override echte service calls
  controller.service.getAllKpis = async () => fakeAll;
  controller.service.getKpiMetric = async (_event, metric) => `FAKE_${metric}`;

  const eventAll = {
    httpMethod: "GET",
    headers: { Authorization: "Bearer local-test" },
    queryStringParameters: { metric: "all", filterType: "weekly" },
  };

  const resAll = await controller.getHostKpi(eventAll);
  console.log("metric=all response:", resAll);

  const eventSingle = {
    httpMethod: "GET",
    headers: { Authorization: "Bearer local-test" },
    queryStringParameters: { metric: "averageDailyRate", filterType: "weekly" },
  };

  const resSingle = await controller.getHostKpi(eventSingle);
  console.log("single metric response:", resSingle);
}

main();