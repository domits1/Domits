import { describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { Team_Member } from "database/models/Team_Member";
import { TeamMemberRepository } from "../../functions/PropertyHandler/data/repository/teamMemberRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

describe("TeamMemberRepository.findActiveMembershipByMemberAndHost", () => {
  it("only matches an active membership of that member with that host", async () => {
    const membership = { id: "membership-1", member_user_id: "cohost-1", host_id: "host-1", status: "active" };
    const findOne = jest.fn().mockResolvedValue(membership);
    const getRepository = jest.fn(() => ({ findOne }));
    Database.getInstance.mockResolvedValue({ getRepository });

    const result = await new TeamMemberRepository().findActiveMembershipByMemberAndHost("cohost-1", "host-1");

    expect(result).toBe(membership);
    expect(getRepository).toHaveBeenCalledWith(Team_Member);
    expect(findOne).toHaveBeenCalledWith({
      where: { member_user_id: "cohost-1", host_id: "host-1", status: "active" },
    });
  });
});
