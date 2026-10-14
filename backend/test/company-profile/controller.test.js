const { CompanyProfileController } = require("../../functions/company-profile/controller/controller.js");

const validProfile = {
  companyName: "Acme Rentals",
  displayName: "Acme Guest Stays",
  logoUrl: "",
  description: "",
  website: "",
  publicEmail: "",
  publicPhone: "",
  country: "",
};

const authenticatedEvent = (patch = {}) => ({
  requestContext: {
    authorizer: {
      claims: {
        sub: "host-1",
        "custom:group": "Host",
      },
    },
  },
  ...patch,
});

const createController = () => {
  const service = {
    getCompanyProfile: jest.fn(async () => validProfile),
    updateCompanyProfile: jest.fn(async () => validProfile),
    createLogoUploadUrl: jest.fn(async () => ({ uploadUrl: "https://s3.example/upload", fileUrl: "https://s3.example/logo.png" })),
  };
  return {
    service,
    controller: new CompanyProfileController({ service }),
  };
};

describe("CompanyProfileController.getProfile", () => {
  test("uses claims.sub to fetch the profile", async () => {
    const { controller, service } = createController();

    await expect(controller.getProfile(authenticatedEvent())).resolves.toEqual({
      statusCode: 200,
      response: validProfile,
    });
    expect(service.getCompanyProfile).toHaveBeenCalledWith("host-1");
  });

  test("supports HTTP API jwt authorizer claims", async () => {
    const { controller, service } = createController();
    const event = {
      requestContext: { authorizer: { jwt: { claims: { sub: "jwt-host-1" } } } },
    };

    await controller.getProfile(event);

    expect(service.getCompanyProfile).toHaveBeenCalledWith("jwt-host-1");
  });

  test("missing auth is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.getProfile({})).rejects.toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" });
    expect(service.getCompanyProfile).not.toHaveBeenCalled();
  });

  test("auth without sub is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.getProfile(authenticatedEvent({
      requestContext: { authorizer: { claims: { username: "host-1" } } },
    }))).rejects.toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" });
    expect(service.getCompanyProfile).not.toHaveBeenCalled();
  });
});

describe("CompanyProfileController.updateProfile", () => {
  test("parses the body and forwards claims.sub plus the payload", async () => {
    const { controller, service } = createController();
    const event = authenticatedEvent({ body: JSON.stringify(validProfile) });

    await expect(controller.updateProfile(event)).resolves.toEqual({
      statusCode: 200,
      response: validProfile,
    });
    expect(service.updateCompanyProfile).toHaveBeenCalledWith("host-1", validProfile);
  });

  test("invalid JSON body is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.updateProfile(authenticatedEvent({ body: "not-json" })))
      .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(service.updateCompanyProfile).not.toHaveBeenCalled();
  });

  test("missing body is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.updateProfile(authenticatedEvent()))
      .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(service.updateCompanyProfile).not.toHaveBeenCalled();
  });

  test("missing auth is rejected before the body is even parsed", async () => {
    const { controller, service } = createController();

    await expect(controller.updateProfile({ body: JSON.stringify(validProfile) }))
      .rejects.toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" });
    expect(service.updateCompanyProfile).not.toHaveBeenCalled();
  });
});

describe("CompanyProfileController.createLogoUploadUrl", () => {
  test("parses fileType and forwards claims.sub", async () => {
    const { controller, service } = createController();
    const event = authenticatedEvent({ body: JSON.stringify({ fileType: "image/png" }) });

    await expect(controller.createLogoUploadUrl(event)).resolves.toEqual({
      statusCode: 200,
      response: { uploadUrl: "https://s3.example/upload", fileUrl: "https://s3.example/logo.png" },
    });
    expect(service.createLogoUploadUrl).toHaveBeenCalledWith("host-1", "image/png");
  });

  test("missing auth is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.createLogoUploadUrl({ body: JSON.stringify({ fileType: "image/png" }) }))
      .rejects.toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" });
    expect(service.createLogoUploadUrl).not.toHaveBeenCalled();
  });
});
