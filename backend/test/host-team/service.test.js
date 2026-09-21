jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn().mockResolvedValue({}) },
}));

jest.mock("../../functions/host-team/business/emailService.js", () => ({
  __esModule: true,
  sendTeamInviteEmail: jest.fn().mockResolvedValue(undefined),
}));

const { Service, normalizeRole } = require("../../functions/host-team/business/service/service.js");
const { ALLOWED_TEAM_MEMBER_ROLES, DEFAULT_TEAM_MEMBER_ROLE } = require("../../functions/host-team/util/roles.js");

const createRepository = ({ member } = {}) => ({
  findByHostAndEmail: jest.fn(async () => null),
  create: jest.fn(async (dataSource, record) => ({ id: "member-1", invite_token: "token-1", ...record })),
  findById: jest.fn(async () => member ?? null),
  update: jest.fn(async () => undefined),
});

const createService = (opts) => {
  const repository = createRepository(opts);
  return { repository, service: new Service({ repository }) };
};

describe("normalizeRole", () => {
  test("defaults to Property Operations Manager when role is falsy", () => {
    expect(normalizeRole(undefined)).toBe(DEFAULT_TEAM_MEMBER_ROLE);
    expect(normalizeRole("")).toBe(DEFAULT_TEAM_MEMBER_ROLE);
  });

  test("accepts every role in the allow-list", () => {
    for (const role of ALLOWED_TEAM_MEMBER_ROLES) {
      expect(normalizeRole(role)).toBe(role);
    }
  });

  test.each(["Host", "Admin", "Traveler", "Superhost"])("rejects %s", (role) => {
    expect(() => normalizeRole(role)).toThrow(/role must be one of/);
  });
});

describe("Service.inviteMember", () => {
  test("accepts every role in the allow-list", async () => {
    for (const role of ALLOWED_TEAM_MEMBER_ROLES) {
      const { repository, service } = createService();
      const created = await service.inviteMember("host-1", "host@example.com", "member@example.com", role);
      expect(created.role).toBe(role);
      expect(repository.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ role }));
    }
  });

  test("defaults to Property Operations Manager when role is omitted", async () => {
    const { repository, service } = createService();
    const created = await service.inviteMember("host-1", "host@example.com", "member@example.com", undefined);
    expect(created.role).toBe(DEFAULT_TEAM_MEMBER_ROLE);
    expect(repository.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ role: DEFAULT_TEAM_MEMBER_ROLE })
    );
  });

  test.each(["Host", "Admin", "Traveler", "Superhost"])(
    "rejects invite with role %s and never persists it",
    async (role) => {
      const { repository, service } = createService();
      await expect(
        service.inviteMember("host-1", "host@example.com", "member@example.com", role)
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(repository.create).not.toHaveBeenCalled();
    }
  );
});

describe("Service.updateMemberRole", () => {
  const existingMember = { id: "member-1", host_id: "host-1", member_email: "member@example.com", role: "Sales Manager" };

  test("accepts every role in the allow-list and persists it", async () => {
    for (const role of ALLOWED_TEAM_MEMBER_ROLES) {
      const { repository, service } = createService({ member: existingMember });
      const updated = await service.updateMemberRole("host-1", "member-1", role);
      expect(updated.role).toBe(role);
      expect(repository.update).toHaveBeenCalledWith(expect.anything(), "member-1", { role });
    }
  });

  test("rejects a missing role instead of defaulting", async () => {
    const { repository, service } = createService({ member: existingMember });
    await expect(service.updateMemberRole("host-1", "member-1", undefined)).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  test.each(["Host", "Admin", "Traveler", "Superhost"])(
    "rejects role %s and never persists it",
    async (role) => {
      const { repository, service } = createService({ member: existingMember });
      await expect(service.updateMemberRole("host-1", "member-1", role)).rejects.toMatchObject({ statusCode: 400 });
      expect(repository.update).not.toHaveBeenCalled();
    }
  );

  test("rejects updating a member that does not exist", async () => {
    const { repository, service } = createService({ member: null });
    await expect(
      service.updateMemberRole("host-1", "missing-member", "Sales Manager")
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  test("rejects updating a member that belongs to a different host", async () => {
    const { repository, service } = createService({ member: { ...existingMember, host_id: "someone-else" } });
    await expect(
      service.updateMemberRole("host-1", "member-1", "Sales Manager")
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.update).not.toHaveBeenCalled();
  });
});
