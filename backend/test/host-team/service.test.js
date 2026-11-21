jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn().mockResolvedValue({}) },
}));

jest.mock("../../functions/host-team/business/emailService.js", () => ({
  __esModule: true,
  sendTeamInviteEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockLambdaSend = jest.fn().mockResolvedValue({});
jest.mock("@aws-sdk/client-lambda", () => ({
  __esModule: true,
  LambdaClient: jest.fn(() => ({ send: mockLambdaSend })),
  InvokeCommand: jest.fn((input) => ({ input })),
}));

const { Service, normalizeRole } = require("../../functions/host-team/business/service/service.js");
const { sendTeamInviteEmail } = require("../../functions/host-team/business/emailService.js");
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

describe("Service.getTeamMemberById", () => {
  test("returns the member when found and owned by the requesting host", async () => {
    const { repository, service } = createService({ member: { id: "member-1", host_id: "host-1", member_email: "member@example.com" } });

    const member = await service.getTeamMemberById("member-1", "host-1");

    expect(member).toEqual({ id: "member-1", host_id: "host-1", member_email: "member@example.com" });
    expect(repository.findById).toHaveBeenCalledWith(expect.anything(), "member-1");
  });

  test("throws NotFoundException when the member does not exist", async () => {
    const { service } = createService({ member: null });

    await expect(service.getTeamMemberById("missing", "host-1")).rejects.toThrow(/Team member not found/);
  });

  test("throws ForbiddenException when the member belongs to a different host", async () => {
    const { service } = createService({ member: { id: "member-1", host_id: "host-1", member_email: "member@example.com" } });

    await expect(service.getTeamMemberById("member-1", "host-2")).rejects.toThrow(/do not have permission/);
  });
});

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

  test("passes the normalized role to the invite email", async () => {
    sendTeamInviteEmail.mockClear();
    const { service } = createService();

    await service.inviteMember("host-1", "host@example.com", "member@example.com", " Financial Manager ");

    expect(sendTeamInviteEmail).toHaveBeenCalledWith(
      "member@example.com",
      "token-1",
      "host@example.com",
      "Financial Manager"
    );
  });

  test("passes the default role to the invite email when role is omitted", async () => {
    sendTeamInviteEmail.mockClear();
    const { service } = createService();

    await service.inviteMember("host-1", "host@example.com", "member@example.com", undefined);

    expect(sendTeamInviteEmail).toHaveBeenCalledWith(
      "member@example.com",
      "token-1",
      "host@example.com",
      DEFAULT_TEAM_MEMBER_ROLE
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

describe("sendTeamInviteEmail", () => {
  const { sendTeamInviteEmail: sendRealInviteEmail } = jest.requireActual(
    "../../functions/host-team/business/emailService.js"
  );
  const sentEmailBody = () => {
    const command = mockLambdaSend.mock.calls.at(-1)[0];
    return JSON.parse(command.input.Payload).body.body;
  };

  beforeEach(() => {
    mockLambdaSend.mockClear();
  });

  test("names the invited role and not Property Operations Manager", async () => {
    await sendRealInviteEmail("member@example.com", "token-1", "host@example.com", "Financial Manager");

    const body = sentEmailBody();
    expect(body).toContain("Je bent uitgenodigd als Financial Manager op Domits.");
    expect(body).not.toContain("Property Operations Manager");
    expect(body).toContain("https://domits.com/team/accept?token=token-1");
  });
});
