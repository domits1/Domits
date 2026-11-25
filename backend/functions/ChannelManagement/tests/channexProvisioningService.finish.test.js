import ChannexProvisioningService from "../../.shared/channelManagement/services/channexProvisioningService.js";

// Design note D2 (#506), step 3d-4: the claim becomes the listing's live mapping and its full sync is
// queued in the same transaction, so a listing is never live without its calendar and prices on the way.
const listing = { propertyId: "listing-1", title: "Villa Malee" };
const claim = { id: "claim-1", status: "PROVISIONING" };
const ids = { externalPropertyId: "property-1", externalRoomTypeId: "room-1", externalRatePlanId: "rate-1" };

const build = ({ transactionError = null } = {}) => {
  const manager = { name: "transaction-manager" };
  const database = {
    getInstance: jest.fn().mockResolvedValue({
      transaction: jest.fn(async (work) => {
        if (transactionError) throw transactionError;
        return work(manager);
      }),
    }),
  };
  const props = { activateClaim: jest.fn().mockResolvedValue(true) };
  const outbox = { enqueueChannexFullSync: jest.fn().mockResolvedValue(true) };
  const service = new ChannexProvisioningService({ props, outbox, database });
  return { service, manager, props, outbox };
};

describe("ChannexProvisioningService.finishProvisioning", () => {
  test("activates the claim and queues the full sync in one transaction", async () => {
    const { service, manager, props, outbox } = build();

    const result = await service.finishProvisioning({ claim, listing, ...ids });

    expect(props.activateClaim).toHaveBeenCalledWith(manager, "claim-1");
    expect(outbox.enqueueChannexFullSync).toHaveBeenCalledWith(manager, { domitsPropertyId: "listing-1" });
    expect(result).toEqual({
      statusCode: 200,
      response: { status: "PROVISIONED", channexPropertyId: "property-1", fullSyncQueued: true },
    });
  });

  // The outbox writer only queues for an ACTIVE mapping, so the claim must be active first.
  test("activates the claim before it queues the full sync", async () => {
    const { service, props, outbox } = build();

    await service.finishProvisioning({ claim, listing, ...ids });

    expect(props.activateClaim.mock.invocationCallOrder[0]).toBeLessThan(
      outbox.enqueueChannexFullSync.mock.invocationCallOrder[0]
    );
  });

  // A claim that is no longer PROVISIONING (archived or finished by someone else) must not
  // be reported as provisioned, and gets no full sync from this request.
  test("a claim that could not be activated answers needs attention and queues nothing", async () => {
    const { service, props, outbox } = build();
    props.activateClaim.mockResolvedValue(false);

    const result = await service.finishProvisioning({ claim, listing, ...ids });

    expect(result).toEqual({
      statusCode: 409,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_NEEDS_ATTENTION" }),
    });
    expect(outbox.enqueueChannexFullSync).not.toHaveBeenCalled();
  });

  // Nothing is half-saved: the claim stays PROVISIONING with its ids, and the next attempt adopts the
  // Channex objects (look before create) and finishes.
  test("a failed transaction answers try again and logs it", async () => {
    const { service } = build({ transactionError: new Error("connection lost") });
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await service.finishProvisioning({ claim, listing, ...ids });

    expect(result).toEqual({
      statusCode: 503,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_TRY_AGAIN" }),
    });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("CHANNEX_PROVISIONING_FINISH_FAILED"));
    log.mockRestore();
  });
});
