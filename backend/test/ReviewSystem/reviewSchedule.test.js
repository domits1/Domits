jest.mock("../../functions/ReviewSystem/data/reviewRepository.js", () => ({ ReviewRepository: jest.fn() }));
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";
const now = 1800000000000;
const booking = { id: "b1", property_id: "p1", departuredate: now - 24 * 3600000, guestid: "g", hostid: "h", status: "paid" };
let repository, service, controller, settings;
beforeEach(() => {
  settings = { enabled: true, delayHours: 24 };
  repository = {
    findScheduleManagedProperty: jest.fn().mockResolvedValue({ id: "p1" }),
    getReviewSchedule: jest.fn(async () => settings),
    saveReviewSchedule: jest.fn(async (_, value) => (settings = value)),
    claimReviewRequest: jest.fn().mockResolvedValue({ id: "r1" }),
    findBookingById: jest.fn().mockResolvedValue(booking),
    findReviewByBookingTypeAndReviewer: jest.fn().mockResolvedValue(null),
    releaseUnsentReviewRequest: jest.fn(), finishReviewRequest: jest.fn(),
  };
  service = new ReviewService({ repository, now: () => now, notifier: { send: jest.fn() } });
  controller = new Controller({ service, authManager: { getUser: () => ({ userId: "manager-sub", username: "other" }) } });
});
const event = value => ({ httpMethod: value ? "PATCH" : "GET", body: JSON.stringify(value),
  queryStringParameters: { scope: "property-review-schedule", propertyId: "p1" } });
test("controller persists updates for the property using trusted identity", async () => {
  expect((await controller.getReviews(event())).statusCode).toBe(200);
  const value = { enabled: false, delayHours: 72 };
  expect((await controller.updateReview(event(value))).statusCode).toBe(200);
  expect(JSON.parse((await controller.getReviews(event())).body)).toEqual(value);
  expect(repository.findScheduleManagedProperty).toHaveBeenCalledWith("p1", "manager-sub");
  expect(repository.saveReviewSchedule).toHaveBeenCalledWith("p1", value);
});
test("denies unauthorized managers before accessing settings", async () => {
  repository.findScheduleManagedProperty.mockResolvedValue(null);
  expect((await controller.getReviews(event())).statusCode).toBe(404);
  expect((await controller.updateReview(event(settings))).statusCode).toBe(404);
  expect(repository.getReviewSchedule).not.toHaveBeenCalled();
  expect(repository.saveReviewSchedule).not.toHaveBeenCalled();
});
test.each([-1, 1, 25, 96, "24", null])("rejects delay %j", async delayHours => {
  await expect(service.reviewSchedule("manager", "p1", { enabled: true, delayHours })).rejects.toMatchObject({ statusCode: 400 });
});
test.each([0, 24, 48, 72])("accepts delay %s", async delayHours => {
  await expect(service.reviewSchedule("manager", "p1", { enabled: true, delayHours })).resolves.toEqual({ enabled: true, delayHours });
});
test.each([[true, 0, true], [true, 24, true], [true, 48, false], [false, 0, false]])("enabled=%s delay=%s due=%s", async (enabled, delayHours, due) => {
  settings = { enabled, delayHours };
  expect(await service.isReviewRequestDue(booking)).toBe(due);
});
test("disabled requests do not consume a claim", async () => {
  settings.enabled = false;
  expect((await service.processReviewRequest(booking)).status).toBe("DEFERRED");
  expect(repository.claimReviewRequest).not.toHaveBeenCalled();
});
test("a settings change before send releases the unsent claim", async () => {
  repository.getReviewSchedule.mockResolvedValueOnce(settings).mockResolvedValueOnce({ enabled: false, delayHours: 0 });
  expect((await service.processReviewRequest(booking)).status).toBe("DEFERRED");
  expect(repository.releaseUnsentReviewRequest).toHaveBeenCalledWith("r1", now);
  expect(service.notifier.send).not.toHaveBeenCalled();
});
test.each(["cancelled", "pending"])("ineligible status %s", async status => {
  expect(await service.isReviewRequestDue({ ...booking, status })).toBe(false);
});
