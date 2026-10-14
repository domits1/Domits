const {
  CompanyProfileService,
  isValidWebsite,
  isValidEmail,
  isValidPhone,
} = require("../../functions/company-profile/business/service/service.js");

const validProfile = () => ({
  companyName: "Acme Rentals",
  displayName: "Acme Guest Stays",
  logoUrl: "https://accommodation.s3.eu-north-1.amazonaws.com/company-logos/host-1/logo.png",
  description: "Boutique stays across the coast.",
  website: "https://acme-rentals.example",
  publicEmail: "hello@acme-rentals.example",
  publicPhone: "+31 6 12345678",
  country: "Netherlands",
});

const existingRecord = {
  host_id: "host-1",
  company_name: "Old Name",
  display_name: "Old Display",
  logo_url: "https://old.example/logo.png",
  description: "Old description.",
  website: "https://old.example",
  public_email: "old@old.example",
  public_phone: "+31600000000",
  country: "Netherlands",
  created_at: 100,
  updated_at: 200,
};

const createRepository = ({ rows = [] } = {}) => {
  const records = new Map(rows.map((row) => [row.host_id, { ...row }]));
  return {
    records,
    findByHostId: jest.fn(async (hostId) => records.get(hostId) || null),
    save: jest.fn(async (record) => {
      records.set(record.host_id, { ...record });
      return records.get(record.host_id);
    }),
  };
};

const createLogoRepository = () => ({
  isAllowedContentType: jest.fn((contentType) => ["image/jpeg", "image/png", "image/webp"].includes(contentType)),
  createPresignedUpload: jest.fn(async (hostId, contentType) => ({
    uploadUrl: `https://s3.example/${hostId}/${contentType}`,
    fileUrl: `https://accommodation.s3.eu-north-1.amazonaws.com/company-logos/${hostId}/logo.png`,
  })),
});

const createService = ({ rows = [], now = 12345 } = {}) => {
  const repository = createRepository({ rows });
  const logoRepository = createLogoRepository();
  return {
    repository,
    logoRepository,
    service: new CompanyProfileService({ repository, logoRepository, now: () => now }),
  };
};

describe("format validators", () => {
  test.each(["https://example.com", "http://example.com/path", "example.com", "sub.example.co.uk"])(
    "isValidWebsite accepts %s",
    (value) => {
      expect(isValidWebsite(value)).toBe(true);
    }
  );

  test.each(["not a url", "example", "http://", "javascript:alert(1)"])(
    "isValidWebsite rejects %s",
    (value) => {
      expect(isValidWebsite(value)).toBe(false);
    }
  );

  test.each(["a@b.com", "first.last@sub.example.co"])("isValidEmail accepts %s", (value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  test.each(["not-an-email", "a@b", "@example.com", "a@.com"])("isValidEmail rejects %s", (value) => {
    expect(isValidEmail(value)).toBe(false);
  });

  test.each(["+31 6 12345678", "+1 (555) 123-4567", "020-1234567", "+49 30 12345678"])(
    "isValidPhone accepts %s",
    (value) => {
      expect(isValidPhone(value)).toBe(true);
    }
  );

  test.each(["abc", "123", "+1", "call me maybe"])("isValidPhone rejects %s", (value) => {
    expect(isValidPhone(value)).toBe(false);
  });
});

describe("CompanyProfileService.getCompanyProfile", () => {
  test("returns empty defaults when no row exists", async () => {
    const { service, repository } = createService();

    await expect(service.getCompanyProfile("host-1")).resolves.toEqual({
      companyName: "",
      displayName: "",
      logoUrl: "",
      description: "",
      website: "",
      publicEmail: "",
      publicPhone: "",
      country: "",
    });
    expect(repository.findByHostId).toHaveBeenCalledWith("host-1");
  });

  test("returns the mapped profile when a row exists", async () => {
    const { service } = createService({ rows: [existingRecord] });

    await expect(service.getCompanyProfile("host-1")).resolves.toEqual({
      companyName: "Old Name",
      displayName: "Old Display",
      logoUrl: "https://old.example/logo.png",
      description: "Old description.",
      website: "https://old.example",
      publicEmail: "old@old.example",
      publicPhone: "+31600000000",
      country: "Netherlands",
    });
  });
});

describe("CompanyProfileService.updateCompanyProfile", () => {
  test("persists a fully valid profile", async () => {
    const { service, repository } = createService({ now: 777 });

    const result = await service.updateCompanyProfile("host-1", validProfile());

    expect(result).toEqual(validProfile());
    expect(repository.save).toHaveBeenCalledWith({
      host_id: "host-1",
      company_name: "Acme Rentals",
      display_name: "Acme Guest Stays",
      logo_url: "https://accommodation.s3.eu-north-1.amazonaws.com/company-logos/host-1/logo.png",
      description: "Boutique stays across the coast.",
      website: "https://acme-rentals.example",
      public_email: "hello@acme-rentals.example",
      public_phone: "+31 6 12345678",
      country: "Netherlands",
      created_at: 777,
      updated_at: 777,
    });
  });

  test("preserves created_at when updating an existing row", async () => {
    const { service, repository } = createService({ rows: [existingRecord], now: 999 });

    await service.updateCompanyProfile("host-1", validProfile());

    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      created_at: 100,
      updated_at: 999,
    }));
  });

  test("accepts a profile with only the required companyName", async () => {
    const { service, repository } = createService();

    const result = await service.updateCompanyProfile("host-1", { companyName: "Acme Rentals" });

    expect(result).toEqual({
      companyName: "Acme Rentals",
      displayName: "",
      logoUrl: "",
      description: "",
      website: "",
      publicEmail: "",
      publicPhone: "",
      country: "",
    });
    expect(repository.save).toHaveBeenCalled();
  });

  test("rejects a missing companyName", async () => {
    const { service, repository } = createService();

    await expect(service.updateCompanyProfile("host-1", { ...validProfile(), companyName: "" }))
      .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("rejects unknown top-level fields", async () => {
    const { service, repository } = createService();

    await expect(service.updateCompanyProfile("host-1", { ...validProfile(), vatNumber: "NL123456789B01" }))
      .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  test.each(["hostId", "host_id"])("rejects a spoofed %s field", async (key) => {
    const { service, repository } = createService();

    await expect(service.updateCompanyProfile("host-1", { ...validProfile(), [key]: "someone-else" }))
      .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("rejects an invalid website", async () => {
    const { service, repository } = createService();

    await expect(service.updateCompanyProfile("host-1", { ...validProfile(), website: "not a website" }))
      .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("rejects an invalid publicEmail", async () => {
    const { service, repository } = createService();

    await expect(service.updateCompanyProfile("host-1", { ...validProfile(), publicEmail: "not-an-email" }))
      .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("rejects an invalid publicPhone", async () => {
    const { service, repository } = createService();

    await expect(service.updateCompanyProfile("host-1", { ...validProfile(), publicPhone: "call me" }))
      .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("does not validate format for blank optional fields", async () => {
    const { service, repository } = createService();

    const result = await service.updateCompanyProfile("host-1", {
      companyName: "Acme Rentals",
      website: "",
      publicEmail: "",
      publicPhone: "",
    });

    expect(result.website).toBe("");
    expect(repository.save).toHaveBeenCalled();
  });

  test("rejects a field exceeding its max length", async () => {
    const { service, repository } = createService();

    await expect(service.updateCompanyProfile("host-1", {
      ...validProfile(),
      description: "x".repeat(1001),
    })).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe("CompanyProfileService.createLogoUploadUrl", () => {
  test("delegates to the logo repository for an allowed content type", async () => {
    const { service, logoRepository } = createService();

    const result = await service.createLogoUploadUrl("host-1", "image/png");

    expect(logoRepository.createPresignedUpload).toHaveBeenCalledWith("host-1", "image/png");
    expect(result).toEqual({
      uploadUrl: "https://s3.example/host-1/image/png",
      fileUrl: "https://accommodation.s3.eu-north-1.amazonaws.com/company-logos/host-1/logo.png",
    });
  });

  test("rejects a missing fileType", async () => {
    const { service, logoRepository } = createService();

    await expect(service.createLogoUploadUrl("host-1", undefined)).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
    expect(logoRepository.createPresignedUpload).not.toHaveBeenCalled();
  });

  test("rejects a disallowed content type", async () => {
    const { service, logoRepository } = createService();

    await expect(service.createLogoUploadUrl("host-1", "application/pdf")).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
    expect(logoRepository.createPresignedUpload).not.toHaveBeenCalled();
  });
});
