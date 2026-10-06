import { describe, expect, it, jest } from "@jest/globals";
import {
  WebsitePublicHostService,
  buildEmptyPublicWebsiteHost,
} from "../../functions/PropertyHandler/business/service/websitePublicHostService.js";

const HOST_ID = "6f1e2d3c-0000-4000-8000-000000000001";

const COGNITO_USER = {
  Username: HOST_ID,
  UserAttributes: [
    { Name: "sub", Value: HOST_ID },
    { Name: "given_name", Value: "Karim" },
    { Name: "picture", Value: "https://cdn.example/karim.jpg" },
    { Name: "email", Value: "karim@example.com" },
  ],
};

const ACCOUNT = {
  id: "acc-1",
  userId: HOST_ID,
  channel: "WHATSAPP",
  status: "HEALTHY",
  credentialsRef: `domits/whatsapp/${HOST_ID}/acc-1`,
};

const buildService = ({
  user = COGNITO_USER,
  userError = null,
  account = ACCOUNT,
  accountError = null,
  phoneNumber = "+31 6 1234 5678",
  phoneError = null,
} = {}) => {
  const cognitoRepository = {
    getUserById: jest.fn(async () => {
      if (userError) throw userError;
      return user;
    }),
  };
  const whatsAppRepository = {
    findConnectedAccountByUserId: jest.fn(async () => {
      if (accountError) throw accountError;
      return account;
    }),
    readPhoneNumber: jest.fn(async () => {
      if (phoneError) throw phoneError;
      return phoneNumber;
    }),
  };
  return {
    service: new WebsitePublicHostService({ cognitoRepository, whatsAppRepository }),
    cognitoRepository,
    whatsAppRepository,
  };
};

const silenceConsoleError = () => jest.spyOn(console, "error").mockImplementation(() => {});

describe("the public host block of a direct booking website", () => {
  it("carries the display name, the picture and the WhatsApp number, and nothing that identifies the account", async () => {
    const { service, cognitoRepository, whatsAppRepository } = buildService();

    const host = await service.loadPublicHost(` ${HOST_ID} `);

    expect(host).toEqual({
      displayName: "Karim",
      profileImage: "https://cdn.example/karim.jpg",
      whatsapp: { isAvailable: true, phoneNumber: "+31 6 1234 5678", phoneNumberDigits: "31612345678" },
    });
    expect(cognitoRepository.getUserById).toHaveBeenCalledWith(HOST_ID);
    expect(whatsAppRepository.readPhoneNumber).toHaveBeenCalledWith(ACCOUNT);
    expect(JSON.stringify(host)).not.toContain(HOST_ID);
    expect(JSON.stringify(host)).not.toContain("karim@example.com");
  });

  it("leaves the picture out when its address carries the host's id or username", async () => {
    const byId = buildService({
      user: {
        ...COGNITO_USER,
        UserAttributes: [
          { Name: "given_name", Value: "Karim" },
          { Name: "picture", Value: `https://photos.example/images/profile/${HOST_ID}/a1b2.jpg` },
        ],
      },
    });
    const byUsername = buildService({
      user: {
        Username: "karim-host",
        UserAttributes: [{ Name: "picture", Value: "https://photos.example/images/profile/Karim-Host/a1b2.jpg" }],
      },
    });
    const unrelated = buildService({
      user: { Username: "ann", UserAttributes: [{ Name: "picture", Value: "https://photos.example/banner.jpg" }] },
    });

    const hostById = await byId.service.loadPublicHost(HOST_ID);
    const hostByUsername = await byUsername.service.loadPublicHost(HOST_ID);
    const hostUnrelated = await unrelated.service.loadPublicHost(HOST_ID);

    expect(hostById.displayName).toBe("Karim");
    expect(hostById.profileImage).toBe("");
    expect(hostByUsername.profileImage).toBe("");
    expect(hostUnrelated.profileImage).toBe("https://photos.example/banner.jpg");
    expect(JSON.stringify(hostById)).not.toContain(HOST_ID);
  });

  it("answers the empty block, with WhatsApp off, when the profile read fails", async () => {
    const consoleError = silenceConsoleError();
    const { service } = buildService({ userError: new Error("UserNotFoundException") });

    expect(await service.loadPublicHost(HOST_ID)).toEqual(buildEmptyPublicWebsiteHost());
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it("answers the empty block, without the name, when the WhatsApp account read fails", async () => {
    const consoleError = silenceConsoleError();
    const { service } = buildService({ accountError: new Error("connection refused") });

    expect(await service.loadPublicHost(HOST_ID)).toEqual(buildEmptyPublicWebsiteHost());
    consoleError.mockRestore();
  });

  it("answers the empty block when the secret cannot be read", async () => {
    const consoleError = silenceConsoleError();
    const { service } = buildService({ phoneError: new Error("AccessDeniedException") });

    expect(await service.loadPublicHost(HOST_ID)).toEqual(buildEmptyPublicWebsiteHost());
    consoleError.mockRestore();
  });

  it("keeps the name and marks WhatsApp unavailable without a connected account or without a number", async () => {
    const { service: withoutAccount } = buildService({ account: null });
    const { service: withoutNumber, whatsAppRepository } = buildService({ phoneNumber: "   " });

    const hostWithoutAccount = await withoutAccount.loadPublicHost(HOST_ID);
    const hostWithoutNumber = await withoutNumber.loadPublicHost(HOST_ID);

    expect(hostWithoutAccount.displayName).toBe("Karim");
    expect(hostWithoutAccount.whatsapp).toEqual(buildEmptyPublicWebsiteHost().whatsapp);
    expect(hostWithoutNumber.whatsapp).toEqual(buildEmptyPublicWebsiteHost().whatsapp);
    expect(whatsAppRepository.readPhoneNumber).toHaveBeenCalledTimes(1);
  });

  it("answers the empty block without any lookup when the site has no host id", async () => {
    const { service, cognitoRepository, whatsAppRepository } = buildService();

    expect(await service.loadPublicHost("")).toEqual(buildEmptyPublicWebsiteHost());
    expect(cognitoRepository.getUserById).not.toHaveBeenCalled();
    expect(whatsAppRepository.findConnectedAccountByUserId).not.toHaveBeenCalled();
  });
});
