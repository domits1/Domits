import ChannexProvisioningService from "../../.shared/channelManagement/services/channexProvisioningService.js";

// Design note D2 and D8 (#506): the host gets one Channex account row pointing to Domits' single key,
// then the listing is claimed with a PROVISIONING mapping row before Channex is called, so a double
// click or a second tab never creates a second Channex property.
const NOW = 1_795_000_000_000;
const listing = { propertyId: "listing-1", hostId: "host-1", title: "Villa", guests: 4 };
const place = { countryCode: "NL", timezone: "Europe/Amsterdam" };

const uniqueViolation = () => Object.assign(new Error("duplicate key"), { code: "23505" });
const commitConflict = () => Object.assign(new Error("OC000"), { code: "40001" });

const build = ({ account = null, inUse = null, insertClaim = jest.fn().mockResolvedValue(undefined) } = {}) => {
  const accounts = {
    findByUserIdAndChannel: jest.fn().mockResolvedValue(account),
    create: jest.fn(async (row) => row),
    update: jest.fn(async (id, patch) => ({ ...account, ...patch })),
  };
  const props = {
    findInUseByAccountAndListing: jest.fn().mockResolvedValue(inUse),
    insertClaim,
    takeOverClaim: jest.fn().mockResolvedValue(true),
    releaseClaim: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ChannexProvisioningService({
    accounts,
    props,
    credentialsRef: "domits-channex-secret",
    now: () => NOW,
    newId: () => "new-id",
  });
  const createChannexObjects = jest
    .spyOn(service, "createChannexObjects")
    .mockResolvedValue({ statusCode: 200, response: { status: "PROVISIONED" } });
  return { service, accounts, props, createChannexObjects };
};

describe("ChannexProvisioningService.claimListing: the host's account row (D8)", () => {
  test("creates a connected Channex account row for a host who has none, pointing to Domits' key", async () => {
    const { service, accounts } = build();

    await service.claimListing({ userId: "host-1", listing, place });

    expect(accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "new-id",
        userId: "host-1",
        channel: "CHANNEX",
        status: "CONNECTED",
        credentialsRef: "domits-channex-secret",
      })
    );
  });

  test("reuses the host's connected account row", async () => {
    const account = { id: "account-1", status: "CONNECTED", credentialsRef: "domits-channex-secret" };
    const { service, accounts, props } = build({ account });

    await service.claimListing({ userId: "host-1", listing, place });

    expect(accounts.create).not.toHaveBeenCalled();
    expect(accounts.update).not.toHaveBeenCalled();
    expect(props.findInUseByAccountAndListing).toHaveBeenCalledWith("account-1", "listing-1");
  });

  // A new host's double click: both requests create an account row; the unique key on
  // ("userId", channel) for CHANNEX lets one win, and the loser continues with the winner's row.
  test.each([
    ["the unique key", uniqueViolation],
    ["a commit conflict", commitConflict],
  ])("losing the account create on %s continues with the winner's row", async (_label, error) => {
    const winner = { id: "account-winner", status: "CONNECTED", credentialsRef: "domits-channex-secret" };
    const { service, accounts, props } = build();
    accounts.findByUserIdAndChannel.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
    accounts.create.mockRejectedValueOnce(error());

    await service.claimListing({ userId: "host-1", listing, place });

    expect(props.findInUseByAccountAndListing).toHaveBeenCalledWith("account-winner", "listing-1");
  });

  // A host who connected their own Channex account keeps it. Pointing that row at
  // Domits' key would push their existing mappings to the wrong account, so nothing is changed.
  test.each([["CONNECTED"], ["DISCONNECTED"]])(
    "a %s account row with its own Channex key is left alone and answers 409",
    async (status) => {
      const ownAccount = { id: "account-1", status, credentialsRef: "host-own-channex-secret" };
      const { service, accounts, props, createChannexObjects } = build({ account: ownAccount });

      const result = await service.claimListing({ userId: "host-1", listing, place });

      expect(result).toEqual({
        statusCode: 409,
        response: expect.objectContaining({ errorCode: "DISTRIBUTION_OWN_CHANNEX_ACCOUNT" }),
      });
      expect(accounts.update).not.toHaveBeenCalled();
      expect(props.insertClaim).not.toHaveBeenCalled();
      expect(createChannexObjects).not.toHaveBeenCalled();
    }
  );

  // A disconnect resets the shared key on the row (#3365); turning a listing on connects it again.
  test("reconnects a disconnected account row to Domits' key", async () => {
    const account = { id: "account-1", status: "DISCONNECTED", credentialsRef: null };
    const { service, accounts } = build({ account });

    await service.claimListing({ userId: "host-1", listing, place });

    expect(accounts.update).toHaveBeenCalledWith(
      "account-1",
      expect.objectContaining({ status: "CONNECTED", credentialsRef: "domits-channex-secret" })
    );
  });
});

describe("ChannexProvisioningService.claimListing: configuration", () => {
  // Without Domits' key reference every host row would point nowhere, so nothing is written.
  test("answers 503 when Domits' Channex key reference is not configured", async () => {
    const accounts = { findByUserIdAndChannel: jest.fn(), create: jest.fn(), update: jest.fn() };
    const service = new ChannexProvisioningService({ accounts, props: {}, credentialsRef: "" });

    const result = await service.claimListing({ userId: "host-1", listing, place });

    expect(result).toEqual({
      statusCode: 503,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_NOT_CONFIGURED" }),
    });
    expect(accounts.create).not.toHaveBeenCalled();
  });
});

describe("ChannexProvisioningService.claimListing: the claim (D2)", () => {
  const account = { id: "account-1", status: "CONNECTED", credentialsRef: "domits-channex-secret" };

  test("claims a free listing with a PROVISIONING row, then creates the Channex side", async () => {
    const { service, props, createChannexObjects } = build({ account });

    const result = await service.claimListing({ userId: "host-1", listing, place });

    expect(props.insertClaim).toHaveBeenCalledWith({
      id: "new-id",
      integrationAccountId: "account-1",
      domitsPropertyId: "listing-1",
      now: NOW,
    });
    expect(createChannexObjects).toHaveBeenCalledWith(
      expect.objectContaining({ claim: expect.objectContaining({ id: "new-id", externalPropertyId: null }), listing, place })
    );
    expect(result).toEqual({ statusCode: 200, response: { status: "PROVISIONED" } });
  });

  // A claim left by an attempt that stopped halfway is continued, not claimed again.
  // A claim is only taken over when its attempt has stopped. A request that is still
  // running keeps updating the claim (each saved id), and the route ends within 29 s, so a claim
  // untouched for a minute belongs to an attempt that died.
  test("takes over a PROVISIONING claim untouched for a minute, with a conditional update", async () => {
    const stale = { id: "claim-1", status: "PROVISIONING", externalPropertyId: "channex-property-1", updatedAt: NOW - 61_000 };
    const { service, props, createChannexObjects } = build({ account, inUse: stale });

    await service.claimListing({ userId: "host-1", listing, place });

    expect(props.insertClaim).not.toHaveBeenCalled();
    expect(props.takeOverClaim).toHaveBeenCalledWith({ claimId: "claim-1", expectedUpdatedAt: NOW - 61_000, now: NOW });
    expect(createChannexObjects).toHaveBeenCalledWith(
      expect.objectContaining({ claim: expect.objectContaining({ id: "claim-1", externalPropertyId: "channex-property-1" }) })
    );
  });

  test("a claim another request is still working on answers 409, without calling Channex", async () => {
    const running = { id: "claim-1", status: "PROVISIONING", externalPropertyId: null, updatedAt: NOW - 5_000 };
    const { service, props, createChannexObjects } = build({ account, inUse: running });

    const result = await service.claimListing({ userId: "host-1", listing, place });

    expect(result).toEqual({
      statusCode: 409,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_ALREADY_IN_PROGRESS" }),
    });
    expect(props.takeOverClaim).not.toHaveBeenCalled();
    expect(createChannexObjects).not.toHaveBeenCalled();
  });

  // Two requests that both find the same stale claim: the conditional update lets one win.
  test.each([
    ["no row updated", (props) => props.takeOverClaim.mockResolvedValue(false)],
    ["a commit conflict", (props) => props.takeOverClaim.mockRejectedValue(commitConflict())],
  ])("losing the takeover (%s) answers 409", async (_label, lose) => {
    const stale = { id: "claim-1", status: "PROVISIONING", externalPropertyId: null, updatedAt: NOW - 61_000 };
    const { service, props, createChannexObjects } = build({ account, inUse: stale });
    lose(props);

    const result = await service.claimListing({ userId: "host-1", listing, place });

    expect(result.response.errorCode).toBe("DISTRIBUTION_ALREADY_IN_PROGRESS");
    expect(createChannexObjects).not.toHaveBeenCalled();
  });

  test("a listing that is already connected answers so, without calling Channex", async () => {
    const connected = { id: "mapping-1", status: "ACTIVE", externalPropertyId: "channex-property-1" };
    const { service, createChannexObjects } = build({ account, inUse: connected });

    const result = await service.claimListing({ userId: "host-1", listing, place });

    expect(result).toEqual({
      statusCode: 200,
      response: expect.objectContaining({ status: "ALREADY_CONNECTED", channexPropertyId: "channex-property-1" }),
    });
    expect(createChannexObjects).not.toHaveBeenCalled();
  });

  // On Aurora DSQL the loser of two simultaneous claims fails on the key (23505) or at commit (40001).
  test.each([
    ["the unique key", uniqueViolation],
    ["a commit conflict", commitConflict],
  ])("losing the claim on %s answers 409 already in progress, without retrying", async (_label, error) => {
    const insertClaim = jest.fn().mockRejectedValue(error());
    const { service, createChannexObjects } = build({ account, insertClaim });

    const result = await service.claimListing({ userId: "host-1", listing, place });

    expect(result).toEqual({
      statusCode: 409,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_ALREADY_IN_PROGRESS" }),
    });
    expect(insertClaim).toHaveBeenCalledTimes(1);
    expect(createChannexObjects).not.toHaveBeenCalled();
  });

  test("any other database error is not hidden as 'in progress'", async () => {
    const insertClaim = jest.fn().mockRejectedValue(new Error("connection lost"));
    const { service } = build({ account, insertClaim });

    await expect(service.claimListing({ userId: "host-1", listing, place })).rejects.toThrow("connection lost");
  });
});

// An attempt that ends without success releases its own claim,
// so a host who clicks again after "try again" continues straight away instead of waiting out the lease.
describe("ChannexProvisioningService.claimListing: releasing the claim", () => {
  const account = { id: "account-1", status: "CONNECTED", credentialsRef: "domits-channex-secret" };

  test("an attempt that ends without success releases its claim and keeps its answer", async () => {
    const { service, props, createChannexObjects } = build({ account });
    const tryAgain = { statusCode: 503, response: { errorCode: "DISTRIBUTION_TRY_AGAIN" } };
    createChannexObjects.mockResolvedValue(tryAgain);

    const result = await service.claimListing({ userId: "host-1", listing, place });

    expect(props.releaseClaim).toHaveBeenCalledWith("new-id");
    expect(result).toEqual(tryAgain);
  });

  test("a successful attempt keeps its claim, now the live mapping", async () => {
    const { service, props } = build({ account });

    await service.claimListing({ userId: "host-1", listing, place });

    expect(props.releaseClaim).not.toHaveBeenCalled();
  });

  test("an attempt that throws releases its claim and still throws", async () => {
    const { service, props, createChannexObjects } = build({ account });
    createChannexObjects.mockRejectedValue(new Error("connection lost"));

    await expect(service.claimListing({ userId: "host-1", listing, place })).rejects.toThrow("connection lost");
    expect(props.releaseClaim).toHaveBeenCalledWith("new-id");
  });

  test("a release that fails does not hide the attempt's own answer", async () => {
    const { service, props, createChannexObjects } = build({ account });
    createChannexObjects.mockResolvedValue({ statusCode: 503, response: { errorCode: "DISTRIBUTION_TRY_AGAIN" } });
    props.releaseClaim.mockRejectedValue(new Error("release failed"));
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await service.claimListing({ userId: "host-1", listing, place });

    expect(result.response.errorCode).toBe("DISTRIBUTION_TRY_AGAIN");
    log.mockRestore();
  });
});
