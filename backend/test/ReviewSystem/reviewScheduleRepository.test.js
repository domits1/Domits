jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource, IsNull } from "typeorm";
import { Review_Request } from "database/models/Review_Request";
import { Property } from "database/models/Property";
import { Team_Member } from "database/models/Team_Member";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { ReviewRequestSchedule20261022 } from "../../ORM/migrations/20261022_review_request_schedule.js";
test("releases a claimed unsent invitation when its schedule is deferred", async () => {
  const update = jest.fn().mockResolvedValue({ affected: 1 });
  const getRepository = jest.fn().mockReturnValue({ update });
  Database.getInstance.mockResolvedValue({ getRepository });

  await expect(new ReviewRepository().releaseUnsentReviewRequest("request-1", 1800000000000))
    .resolves.toEqual({ affected: 1 });

  expect(getRepository).toHaveBeenCalledWith(Review_Request);
  expect(update).toHaveBeenCalledWith(
    { id: "request-1", status: "SENDING", lastSentAt: IsNull() },
    { status: "OPEN", claimedAt: null, sendCount: 0, updatedAt: 1800000000000 },
  );
});
test("authorizes ownership or active operations membership with property scope", async () => {
  const db = new DataSource({ type: "postgres", schema: "main", entities: [Property, Team_Member] });
  await db.buildMetadatas();
  const query = db.getRepository(Property).createQueryBuilder("property");
  jest.spyOn(query, "getOne").mockResolvedValue({ id: "p1" });
  jest.spyOn(db.getRepository(Property), "createQueryBuilder").mockReturnValue(query);
  Database.getInstance.mockResolvedValue(db);
  await new ReviewRepository().findScheduleManagedProperty("p1", "manager-sub");
  expect(query.getQuery()).toContain('"property"."hostid" = :userId OR "member"."id" IS NOT NULL');
  expect(query.getParameters()).toEqual({ propertyId: "p1", userId: "manager-sub", active: "active", role: "Property Operations Manager" });
});
test("migration installs defaults in both schemas", async () => {
  const runner = { query: jest.fn() };
  await new ReviewRequestSchedule20261022().up(runner);
  expect(runner.query).toHaveBeenCalledTimes(4);
  expect(runner.query.mock.calls.map(([sql]) => sql).join(" ")).toContain("main.property");
  expect(runner.query.mock.calls.map(([sql]) => sql).join(" ")).toContain("test.property");
});
