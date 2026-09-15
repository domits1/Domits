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

const createRepository = () => ({
  findByHostAndEmail: jest.fn(async () => null),
  create: jest.fn(async (dataSource, record) => ({ id: "member-1", invite_token: "token-1", ...record })),
});

const createService = () => {
  const repository = createRepository();
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
