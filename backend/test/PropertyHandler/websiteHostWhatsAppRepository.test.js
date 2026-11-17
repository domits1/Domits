import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { WebsiteHostWhatsAppRepository } from "../../functions/PropertyHandler/data/repository/websiteHostWhatsAppRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const CONNECTED = {
  id: "acc-2",
  userId: "host-1",
  channel: "WHATSAPP",
  status: "HEALTHY",
  externalAccountId: "pn-2",
  credentialsRef: "domits/whatsapp/host-1/acc-2",
  updatedAt: 5,
};
const WITHOUT_NUMBER_ID = { ...CONNECTED, id: "acc-4", externalAccountId: "", updatedAt: 4 };
const DISCONNECTED = { ...CONNECTED, id: "acc-3", status: "DISCONNECTED", updatedAt: 3 };
const OLDER_CONNECTED = { ...CONNECTED, id: "acc-1", updatedAt: 1 };

const buildRepository = ({
  accounts = [DISCONNECTED, CONNECTED],
  secretString = undefined,
  secretError = null,
} = {}) => {
  const find = jest.fn(async () => accounts);
  Database.getInstance.mockResolvedValue({ getRepository: jest.fn(() => ({ find })) });
  const secretsClient = {
    send: jest.fn(async () => {
      if (secretError) throw secretError;
      return { SecretString: secretString };
    }),
  };
  return { repository: new WebsiteHostWhatsAppRepository({ secretsClient }), find, secretsClient };
};

describe("the public WhatsApp lookup of a host", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads only the host's WhatsApp accounts, newest first, and answers the newest one when it is connected", async () => {
    const { repository, find } = buildRepository({ accounts: [CONNECTED, DISCONNECTED, OLDER_CONNECTED] });

    const account = await repository.findConnectedAccountByUserId(" host-1 ");

    expect(account).toBe(CONNECTED);
    expect(find).toHaveBeenCalledWith({
      where: { userId: "host-1", channel: "WHATSAPP" },
      order: { updatedAt: "DESC" },
    });
  });

  it("answers null when the newest account is disconnected, even when an older row is connected", async () => {
    const { repository } = buildRepository({ accounts: [DISCONNECTED, OLDER_CONNECTED] });

    expect(await repository.findConnectedAccountByUserId("host-1")).toBeNull();
  });

  it("answers null when the newest account has no number id, even when an older row is connected", async () => {
    const { repository } = buildRepository({ accounts: [WITHOUT_NUMBER_ID, OLDER_CONNECTED] });

    expect(await repository.findConnectedAccountByUserId("host-1")).toBeNull();
  });

  it("answers null without touching the database when the host id is empty", async () => {
    const { repository, find } = buildRepository();

    expect(await repository.findConnectedAccountByUserId("")).toBeNull();
    expect(find).not.toHaveBeenCalled();
    expect(Database.getInstance).not.toHaveBeenCalled();
  });

  it("takes the selected number from the secret, or the number whose id matches the account", async () => {
    const selected = buildRepository({ secretString: JSON.stringify({ selectedPhoneNumber: "+31 6 1111" }) });
    const matched = buildRepository({
      secretString: JSON.stringify({
        selectableNumbers: [
          { phoneNumberId: "pn-1", phoneNumber: "+1" },
          { phoneNumberId: "pn-2", phoneNumber: "+31 6 2222" },
        ],
      }),
    });

    expect(await selected.repository.readPhoneNumber(CONNECTED)).toBe("+31 6 1111");
    expect(await matched.repository.readPhoneNumber(CONNECTED)).toBe("+31 6 2222");
    expect(selected.secretsClient.send.mock.calls[0][0].input).toEqual({ SecretId: CONNECTED.credentialsRef });
  });

  it("answers an empty number for a secret without a usable number, and fails on a secret that is not JSON", async () => {
    const unusable = buildRepository({
      secretString: JSON.stringify({ selectableNumbers: [{ phoneNumberId: "other", phoneNumber: "+1" }] }),
    });
    expect(await unusable.repository.readPhoneNumber(CONNECTED)).toBe("");

    const broken = buildRepository({ secretString: "{not json" });
    await expect(broken.repository.readPhoneNumber(CONNECTED)).rejects.toThrow(SyntaxError);
  });

  it("does not call Secrets Manager for an account without a credentials reference, and lets a read error reach the caller", async () => {
    const { repository, secretsClient } = buildRepository({ secretError: new Error("AccessDeniedException") });

    expect(await repository.readPhoneNumber({ ...CONNECTED, credentialsRef: "" })).toBe("");
    expect(secretsClient.send).not.toHaveBeenCalled();
    await expect(repository.readPhoneNumber(CONNECTED)).rejects.toThrow("AccessDeniedException");
  });
});
