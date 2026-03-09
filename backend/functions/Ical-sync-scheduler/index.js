import { Service } from "./business/service/service.js";

let service = null;

export const handler = async (event = {}) => {
  try {
    if (!service) {
      service = new Service();
    }

    const result = await service.runScheduledSync(event);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Ical-sync-scheduler failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Scheduler sync failed.",
      }),
    };
  }
};

