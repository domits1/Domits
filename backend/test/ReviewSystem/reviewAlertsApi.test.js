jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";
import { ReviewAlertService } from "../../functions/ReviewSystem/business/service/reviewAlertService.js";
import { ReviewAlertRepository } from "../../functions/ReviewSystem/data/reviewAlertRepository.js";
import { handler } from "../../functions/ReviewSystem/index.js";

const row = { id: "a1", recipient_user_id: "host", event_key: "secret", alert_type: "NEW_REVIEW",
  property_id: "p1", review_id: "r1", status: "UNREAD", created_at: 10, updated_at: 10, private_feedback: "secret" };
const request = (changes = {}) => ({ httpMethod: "GET", resource: "/reviews/alerts",
  requestContext: { authorizer: { claims: { sub: "host", "cognito:username": "different-name" } } }, ...changes });
const patch = (changes = {}) => request({ httpMethod: "PATCH", resource: "/reviews/alerts/{id}/read",
  pathParameters: { id: "a1" }, ...changes });
let repository, controller;
beforeEach(() => {
  repository = { getAlertsForRecipient: jest.fn().mockResolvedValue([row]), countUnreadForRecipient: jest.fn().mockResolvedValue(7),
    markAlertAsRead: jest.fn().mockResolvedValue(false), dismissAlert: jest.fn().mockResolvedValue(false),
    findAlertForRecipient: jest.fn().mockResolvedValue(row) };
  controller = new Controller({ alertService: new ReviewAlertService({ repository }) });
});
afterEach(() => jest.restoreAllMocks());

test("authenticated list scopes by token subject, paginates and excludes internal fields", async () => {
  const response = await controller.manageReviewAlerts(request({ queryStringParameters: { status: "READ", limit: "2", offset: "4" } }));
  expect(response.statusCode).toBe(200);
  expect(response.headers["Cache-Control"]).toBe("no-store");
  expect(repository.getAlertsForRecipient).toHaveBeenCalledWith("host", { status: "READ", limit: 2, offset: 4 });
  expect(repository.countUnreadForRecipient).toHaveBeenCalledWith("host");
  expect(JSON.parse(response.body)).toEqual({ alerts: [{ id: "a1", alert_type: "NEW_REVIEW", property_id: "p1",
    review_id: "r1", status: "UNREAD", created_at: 10, updated_at: 10,
    display: { destination: "/hostdashboard/reviews" } }], unread_count: 7, limit: 2, offset: 4 });
});

test.each(["GET", "PATCH"])("%s requires verified claims even with an authorization header", async httpMethod => {
  const response = await controller.manageReviewAlerts(request({ httpMethod, requestContext: {}, headers: { Authorization: "unverified" } }));
  expect(response.statusCode).toBe(401);
  expect(repository.getAlertsForRecipient).not.toHaveBeenCalled();
  expect(repository.markAlertAsRead).not.toHaveBeenCalled();
});

test.each([{ status: "read" }, { status: "" }, { limit: "0" }, { limit: "101" }, { limit: "1.5" },
  { offset: "-1" }, { offset: "9007199254740992" }, { limit: "1e2" }, { recipient_user_id: "other" }, { userId: "other" }])(
  "rejects invalid list parameters %j", async queryStringParameters => {
    expect((await controller.manageReviewAlerts(request({ queryStringParameters }))).statusCode).toBe(400);
    expect(repository.getAlertsForRecipient).not.toHaveBeenCalled();
  });

test("defaults and empty pages retain the total unread count", async () => {
  repository.getAlertsForRecipient.mockResolvedValue([]);
  const response = await controller.manageReviewAlerts(request());
  expect(JSON.parse(response.body)).toEqual({ alerts: [], unread_count: 7, limit: 50, offset: 0 });
});

test.each(["read", "dismiss"])("%s updates only the token recipient and repeats safely", async action => {
  const status = action === "read" ? "READ" : "DISMISSED";
  repository.findAlertForRecipient.mockResolvedValue({ ...row, status, updated_at: 11 });
  const event = patch({ resource: `/reviews/alerts/{id}/${action}`, body: "{}" });
  const first = await controller.manageReviewAlerts(event);
  expect(first.statusCode).toBe(200);
  expect(await controller.manageReviewAlerts(event)).toEqual(first);
  expect(repository[action === "read" ? "markAlertAsRead" : "dismissAlert"]).toHaveBeenCalledWith("host", "a1");
  expect(repository.findAlertForRecipient).toHaveBeenCalledWith("host", "a1");
});

test("read does not reopen dismissed alerts; missing and foreign IDs both yield 404", async () => {
  repository.findAlertForRecipient.mockResolvedValueOnce({ ...row, status: "DISMISSED" }).mockResolvedValue(null);
  expect(JSON.parse((await controller.manageReviewAlerts(patch())).body).alert.status).toBe("DISMISSED");
  for (const id of ["missing", "foreign"]) expect((await controller.manageReviewAlerts(patch({ pathParameters: { id } }))).statusCode).toBe(404);
});

test.each([{ pathParameters: {} }, { pathParameters: { id: "../other" } }, { pathParameters: { id: "x".repeat(256) } },
  { body: '{"recipient_user_id":"other"}' }, { body: "broken" }, { queryStringParameters: { userId: "other" } },
  { multiValueQueryStringParameters: { limit: ["1", "2"] } }])("rejects malformed updates %j", async changes => {
    expect((await controller.manageReviewAlerts(patch(changes))).statusCode).toBe(400);
    expect(repository.markAlertAsRead).not.toHaveBeenCalled();
  });

test.each(["getAlertsForRecipient", "countUnreadForRecipient", "markAlertAsRead", "dismissAlert", "findAlertForRecipient"])("contains %s failures", async method => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  repository[method].mockRejectedValue(new Error("database credentials"));
  const event = ["getAlertsForRecipient", "countUnreadForRecipient"].includes(method) ? request() :
    patch({ resource: `/reviews/alerts/{id}/${method === "dismissAlert" ? "dismiss" : "read"}` });
  const response = await controller.manageReviewAlerts(event);
  expect(response.statusCode).toBe(500);
  expect(response.body).not.toContain("database credentials");
});

test("literal alert route and PATCH actions dispatch separately from review IDs, with CORS", async () => {
  const list = jest.spyOn(ReviewAlertService.prototype, "list").mockResolvedValue({ alerts: [] });
  const update = jest.spyOn(ReviewAlertService.prototype, "update").mockResolvedValue({ alert: row });
  const review = jest.spyOn(Controller.prototype, "getReviewById");
  expect((await handler(request())).statusCode).toBe(200);
  expect(list).toHaveBeenCalledWith("host", {});
  for (const action of ["read", "dismiss"]) {
    const resource = `/reviews/alerts/{id}/${action}`;
    expect((await handler(patch({ resource }))).statusCode).toBe(200);
    expect(update).toHaveBeenCalledWith("host", "a1", action);
    const preflight = await handler({ httpMethod: "OPTIONS", resource });
    expect(preflight.headers["Access-Control-Allow-Methods"]).toBe("PATCH,OPTIONS");
  }
  expect(review).not.toHaveBeenCalled();
  expect((await handler(request({ httpMethod: "POST" }))).statusCode).toBe(405);
});

test("repository detail/count operations scope SQL options to the recipient", async () => {
  const store = { count: jest.fn().mockResolvedValue(3), findOne: jest.fn().mockResolvedValue(null) };
  const repo = new ReviewAlertRepository({ getDatabase: async () => ({ getRepository: () => store }) });
  expect(await repo.countUnreadForRecipient("host")).toBe(3);
  expect(await repo.findAlertForRecipient("host", "foreign")).toBeNull();
  expect(store.count).toHaveBeenCalledWith({ where: { recipient_user_id: "host", status: "UNREAD" } });
  expect(store.findOne).toHaveBeenCalledWith({ where: { id: "foreign", recipient_user_id: "host" } });
});
