jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Team_Member } from "database/models/Team_Member";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";

const ROLES = ["Guest Experience Manager", "General Manager"];

describe("hasActiveReviewApproverRole", () => {
  let query;
  let database;

  beforeEach(async () => {
    const dataSource = new DataSource({ type: "postgres", schema: "main", entities: [Team_Member] });
    await dataSource.buildMetadatas();
    query = dataSource.getRepository(Team_Member).createQueryBuilder("member");
    jest.spyOn(query, "getExists").mockResolvedValue(true);
    database = { getRepository: jest.fn(() => ({ createQueryBuilder: () => query })) };
    Database.getInstance.mockReset();
    Database.getInstance.mockResolvedValue(database);
  });

  it("matches the authenticated member, active status, and the given roles", async () => {
    await expect(new ReviewRepository().hasActiveReviewApproverRole("admin", ROLES)).resolves.toBe(true);

    expect(query.getQuery()).toContain('"member"."member_user_id" = :username');
    expect(query.getQuery()).toContain('"member"."status" = :status');
    expect(query.getQuery()).toContain('"member"."role" IN (:...roles)');
    expect(query.getParameters()).toMatchObject({ username: "admin", status: "active", roles: ROLES });
  });

  it("reads through the transaction manager when one is given", async () => {
    const manager = { getRepository: jest.fn(() => ({ createQueryBuilder: () => query })) };

    await new ReviewRepository().hasActiveReviewApproverRole("admin", ROLES, manager);

    expect(manager.getRepository).toHaveBeenCalledWith(Team_Member);
    expect(Database.getInstance).not.toHaveBeenCalled();
  });
});
