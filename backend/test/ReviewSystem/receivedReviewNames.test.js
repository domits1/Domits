jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { Booking } from "database/models/Booking";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";

test("includes the booking guest name only when the reviewer matches the booking guest", async () => {
  const query = {};
  for (const method of ["where", "andWhere", "orderBy", "addOrderBy"]) query[method] = jest.fn(() => query);
  query.getMany = jest.fn().mockResolvedValue([
    { id: "r1", booking_id: "b1", reviewer_user_id: "guest1" },
    { id: "r2", booking_id: "b2", reviewer_user_id: "other" },
  ]);
  const find = jest.fn().mockResolvedValue([
    { id: "b1", guestid: "guest1", guestname: " Sarah Lee " },
    { id: "b2", guestid: "guest2", guestname: "Private Name" },
  ]);
  Database.getInstance.mockResolvedValue({ getRepository: (entity) => entity === Booking ? { find } : { createQueryBuilder: () => query } });
  const reviews = await new ReviewRepository().findForUser("host", "received");
  expect(reviews[0].guest_name).toBe("Sarah Lee");
  expect(reviews[1].guest_name).toBeNull();
  expect(find).toHaveBeenCalledTimes(1);
});
