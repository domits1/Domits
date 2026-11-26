import ChannelManagementController from "../../.shared/channelManagement/controller/channelManagementController.js";

// Design note section 6 (#506): the listing comes from the path, the user from the signed-in host
// (the handler puts it in the query and body), the timezone choice from the body.
const event = ({ path, userId = "host-1", body = {} }) => ({
  httpMethod: "POST",
  path,
  queryStringParameters: { userId },
  body: JSON.stringify({ ...body, userId }),
});

const build = () => {
  const channelManagementApiService = {
    turnOnDistribution: jest.fn(async () => ({ statusCode: 200, response: { status: "PROVISIONED" } })),
    createDistributionConnectSession: jest.fn(async () => ({ statusCode: 200, response: { iframeUrl: "u" } })),
    listDistributionListings: jest.fn(async () => ({ statusCode: 200, response: { listings: [] } })),
    refreshDistributionListing: jest.fn(async () => ({ statusCode: 200, response: { listing: {} } })),
  };
  return { controller: new ChannelManagementController({ channelManagementApiService }), channelManagementApiService };
};

describe("ChannelManagementController distribution routes", () => {
  test("turn on passes the listing from the path, the host and the picked timezone", async () => {
    const { controller, channelManagementApiService } = build();

    const result = await controller.turnOnDistribution(
      event({
        path: "/default/integrations/channex/host/listings/listing-1/distribution",
        body: { chosenTimezone: "Atlantic/Canary" },
      })
    );

    expect(channelManagementApiService.turnOnDistribution).toHaveBeenCalledWith({
      userId: "host-1",
      domitsPropertyId: "listing-1",
      chosenTimezone: "Atlantic/Canary",
    });
    expect(result).toEqual({ statusCode: 200, response: { status: "PROVISIONED" } });
  });

  test("connect session passes the listing from the path and the host, nothing from the body", async () => {
    const { controller, channelManagementApiService } = build();

    await controller.createDistributionConnectSession(
      event({
        path: "/default/integrations/channex/host/listings/listing-1/connect-session",
        body: { channexPropertyId: "someone-elses-property" },
      })
    );

    expect(channelManagementApiService.createDistributionConnectSession).toHaveBeenCalledWith({
      userId: "host-1",
      domitsPropertyId: "listing-1",
    });
  });

  test("a listing id that cannot be decoded is passed on as no id, so the service answers 404", async () => {
    const { controller, channelManagementApiService } = build();

    await controller.createDistributionConnectSession(
      event({ path: "/integrations/channex/host/listings/%E0/connect-session" })
    );

    expect(channelManagementApiService.createDistributionConnectSession).toHaveBeenCalledWith({
      userId: "host-1",
      domitsPropertyId: null,
    });
  });

  test("the listings of the tab are read for the signed-in host only", async () => {
    const { controller, channelManagementApiService } = build();

    const result = await controller.listDistributionListings({
      httpMethod: "GET",
      path: "/default/integrations/channex/host/listings",
      queryStringParameters: { userId: "host-1" },
    });

    expect(channelManagementApiService.listDistributionListings).toHaveBeenCalledWith({ userId: "host-1" });
    expect(result).toEqual({ statusCode: 200, response: { listings: [] } });
  });

  test("refresh passes the listing from the path and the host", async () => {
    const { controller, channelManagementApiService } = build();

    await controller.refreshDistributionListing(
      event({ path: "/default/integrations/channex/host/listings/listing-1/channels/refresh" })
    );

    expect(channelManagementApiService.refreshDistributionListing).toHaveBeenCalledWith({
      userId: "host-1",
      domitsPropertyId: "listing-1",
    });
  });

  test("an empty or unreadable body still turns on without a timezone choice", async () => {
    const { controller, channelManagementApiService } = build();

    await controller.turnOnDistribution({
      httpMethod: "POST",
      path: "/integrations/channex/host/listings/listing-1/distribution",
      queryStringParameters: { userId: "host-1" },
      body: "not json",
    });

    expect(channelManagementApiService.turnOnDistribution).toHaveBeenCalledWith({
      userId: "host-1",
      domitsPropertyId: "listing-1",
      chosenTimezone: null,
    });
  });
});
