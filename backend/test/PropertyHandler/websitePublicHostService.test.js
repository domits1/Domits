import { describe, expect, it, jest } from "@jest/globals";
import {
  WebsitePublicHostService,
  buildEmptyPublicWebsiteHost,
} from "../../functions/PropertyHandler/business/service/websitePublicHostService.js";

const COGNITO_USER = {
  Username: "host-1",
  UserAttributes: [
    { Name: "sub", Value: "host-1" },
    { Name: "given_name", Value: "Karim" },
    { Name: "picture", Value: "https://cdn.example/karim.jpg" },
    { Name: "email", Value: "karim@example.com" },
  ],
};

const ACCOUNT = {
  id: "acc-1",
  userId: "host-1",
  channel: "WHATSAPP",
  status: "HEALTHY",
  credentialsRef: "domits/whatsapp/host-1/acc-1",
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

    const host = await service.loadPublicHost(" host-1 ");

    expect(host).toEqual({
      displayName: "Karim",
      profileImage: "https://cdn.example/karim.jpg",
      whatsapp: { isAvailable: true, phoneNumber: "+31 6 1234 5678", phoneNumberDigits: "31612345678" },
    });
    expect(cognitoRepository.getUserById).toHaveBeenCalledWith("host-1");
    expect(whatsAppRepository.readPhoneNumber).toHaveBeenCalledWith(ACCOUNT);
    expect(JSON.stringify(host)).not.toContain("host-1");
    expect(JSON.stringify(host)).not.toContain("karim@example.com");
  });

  it("keeps the WhatsApp number when the profile read fails", async () => {
    const consoleError = silenceConsoleError();
    const { service } = buildService({ userError: new Error("UserNotFoundException") });

    const host = await service.loadPublicHost("host-1");

    expect(host.displayName).toBe("");
    expect(host.profileImage).toBe("");
    expect(host.whatsapp.isAvailable).toBe(true);
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it("keeps the profile when the WhatsApp account read fails", async () => {
    const consoleError = silenceConsoleError();
    const { service } = buildService({ accountError: new Error("connection refused") });

    const host = await service.loadPublicHost("host-1");

    expect(host.displayName).toBe("Karim");
    expect(host.whatsapp).toEqual(buildEmptyPublicWebsiteHost().whatsapp);
    consoleError.mockRestore();
  });

  it("marks WhatsApp unavailable when the secret cannot be read", async () => {
    const consoleError = silenceConsoleError();
    const { service } = buildService({ phoneError: new Error("AccessDeniedException") });

    const host = await service.loadPublicHost("host-1");

    expect(host.whatsapp).toEqual({ isAvailable: false, phoneNumber: "", phoneNumberDigits: "" });
    consoleError.mockRestore();
  });

  it("marks WhatsApp unavailable without a connected account or without a number", async () => {
    const { service: withoutAccount } = buildService({ account: null });
    const { service: withoutNumber, whatsAppRepository } = buildService({ phoneNumber: "   " });

    expect((await withoutAccount.loadPublicHost("host-1")).whatsapp.isAvailable).toBe(false);
    expect((await withoutNumber.loadPublicHost("host-1")).whatsapp.isAvailable).toBe(false);
    expect(whatsAppRepository.readPhoneNumber).toHaveBeenCalledTimes(1);
  });

  it("answers the empty block without any lookup when the site has no host id", async () => {
    const { service, cognitoRepository, whatsAppRepository } = buildService();

    expect(await service.loadPublicHost("")).toEqual(buildEmptyPublicWebsiteHost());
    expect(cognitoRepository.getUserById).not.toHaveBeenCalled();
    expect(whatsAppRepository.findConnectedAccountByUserId).not.toHaveBeenCalled();
  });
});
