import MessagingSchedulerService from "../UnifiedMessaging/business/messagingSchedulerService.js";

let service = null;

export const handler = async (event = {}) => {
  try {
    if (!service) {
      service = new MessagingSchedulerService();
    }

    const result = await service.run(event);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("UnifiedMessaging-scheduler failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Unified messaging scheduler failed.",
      }),
    };
  }
};
