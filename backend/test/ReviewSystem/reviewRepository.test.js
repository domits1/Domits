jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";

test("updates only editable fields with atomic ownership, original deadline, and version guards", async () => {
  let clock = 1000;
  const query = { execute: jest.fn(async () => ({ affected: 1 })) };
  for (const method of ["update", "set", "where", "andWhere"]) query[method] = jest.fn(() => query);
  Database.getInstance.mockImplementation(async () => {
    clock = 1500;
    return { getRepository: () => ({ createQueryBuilder: () => query }) };
  });
  const result = await new ReviewRepository().updateEditableReview({ id: "review", guestId: "guest",
    previousUpdatedAt: 1500, editWindowMs: 500, now: () => clock, overallRating: 4, publicReview: "Updated" });
  expect(query.set).toHaveBeenCalledWith({ overall_rating: 4, public_review: "Updated", updated_at: 1501 });
  expect(query.where).toHaveBeenCalledWith("id = :id AND reviewer_user_id = :guestId", { id: "review", guestId: "guest" });
  expect(query.andWhere).toHaveBeenCalledWith("updated_at = :previousUpdatedAt", { previousUpdatedAt: 1500 });
  expect(query.andWhere).toHaveBeenCalledWith("created_at <= :timestamp AND created_at > :cutoff", {
    timestamp: 1500, cutoff: 1000,
  });
  expect(result).toEqual({ affected: 1, updated_at: 1501 });
});
