import ChannelManagementController from "../../.shared/channelManagement/controller/channelManagementController.js";

describe("ChannelManagementController.getChannexHealth", () => {
  test("answers 200 with the health the service builds", async () => {
    const health = { status: "HEALTHY", reasons: [] };
    const channelManagementApiService = { getChannexHealth: jest.fn(async () => health) };
    const controller = new ChannelManagementController({ channelManagementApiService });

    await expect(controller.getChannexHealth({ httpMethod: "GET" })).resolves.toEqual({
      statusCode: 200,
      response: health,
    });
    expect(channelManagementApiService.getChannexHealth).toHaveBeenCalledTimes(1);
  });
});
