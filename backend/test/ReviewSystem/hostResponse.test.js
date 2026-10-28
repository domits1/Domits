jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Review } from "database/models/Review";
import { Property } from "database/models/Property";
import { Team_Member } from "database/models/Team_Member";
import { Review_Response } from "database/models/Review_Response";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";
const user = { userId: "host-sub", username: "host-1" };

test.each([
  ["POST", "/reviews/{id}/response", "draft"],
  ["PATCH", "/reviews/{id}/response", "edit"],
  ["POST", "/reviews/{id}/response/publish", "publish"],
])("controller preserves %s %s host response actions", async (httpMethod, resource, action) => {
  const service = { saveHostResponse: jest.fn().mockResolvedValue({ id: "response-1", message: "Thanks" }) };
  const controller = new Controller({ service, authManager: { getUser: jest.fn().mockResolvedValue(user) } });
  const result = await controller.saveHostResponse({ httpMethod, resource,
    pathParameters: { id: "r1" }, body: JSON.stringify({ message: "Thanks" }) });
  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body)).toEqual({ response: { id: "response-1", message: "Thanks" } });
  expect(service.saveHostResponse).toHaveBeenCalledWith(user, "r1", { message: "Thanks" }, action);
});
describe("host response", () => {
  let query, responses, repository, service, reviews;
  beforeEach(async () => {
    const database = new DataSource({ type: "postgres", schema: "main", entities: [Review, Property, Team_Member] });
    await database.buildMetadatas();
    query = database.getRepository(Review).createQueryBuilder("review");
    jest.spyOn(query, "getOne").mockResolvedValue({ id: "r1" });
    responses = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn(async (record) => record) };
    reviews = { createQueryBuilder: () => query,
      findOne: jest.fn().mockResolvedValue({ id: "r1", host_id: user.userId, status: "PUBLISHED", publication_status: "PUBLISHED", updated_at: 100 }),
      update: jest.fn().mockResolvedValue({ affected: 1 }) };
    const manager = { getRepository: (entity) => entity === Review_Response ? responses : reviews };
    Database.getInstance.mockResolvedValue({ transaction: (work) => work(manager) });
    repository = new ReviewRepository();
    service = new ReviewService({ repository, now: () => 1000 });
  });
  test("publishes normalized literal text linked to the trusted actor and review", async () => {
    const saved = await service.saveHostResponse(user, "r1", { message: " <b>Thanks</b>\r\nagain " }, "publish");
    expect(saved).toMatchObject({ status: "published", message: "<b>Thanks</b>\nagain", createdAt: 1000, publishedAt: 1000 });
    expect(responses.save).toHaveBeenCalledWith(expect.objectContaining({ reviewId: "r1", authorId: "host-sub", updatedAt: 1000 }));
    expect(query.getQuery()).toContain('"property"."hostid" = :username OR "member"."id" IS NOT NULL');
    for (const field of ["publication_status", "status", "review_type"]) {
      expect(query.getQuery()).toContain(`"review"."${field}" = :`);
    }
    expect(query.getParameters()).toMatchObject({ username: "host-1", active: "active", role: "Property Operations Manager",
      reviewId: "r1", propertyStatus: "ACTIVE", status: "PUBLISHED", publicationStatus: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY" });
  });
  test("edits the existing response without changing its original timestamps or ID", async () => {
    responses.findOne.mockResolvedValue({ id: "response-1", status: "published", createdAt: 100, publishedAt: 200 });
    expect(await service.saveHostResponse(user, "r1", { message: "Updated" }, "edit"))
      .toMatchObject({ id: "response-1", createdAt: 100, publishedAt: 200, updatedAt: 1000 });
  });
  test.each(["unrelated host", "inactive membership", "hidden review", "rejected review", "draft review", "private feedback"])(
    "rejects %s when the authorized eligibility query finds no review", async () => {
    query.getOne.mockResolvedValue(null);
    await expect(service.saveHostResponse(user, "r1", { message: "Thanks" }, "publish")).rejects.toMatchObject({ statusCode: 404 });
    expect(responses.save).not.toHaveBeenCalled();
  });
  test("converts the live unique constraint race into a conflict", async () => {
    responses.save.mockRejectedValue({ driverError: { code: "23505", constraint: "review_response_review_unique_main" } });
    await expect(service.saveHostResponse(user, "r1", { message: "Thanks" }, "publish")).rejects.toMatchObject({ statusCode: 409 });
  });
  test.each(["", " ", null, 42, "x".repeat(501), "bad\u0000text"])("rejects invalid content %j", async (message) => {
    await expect(service.saveHostResponse(user, "r1", { message }, "publish")).rejects.toMatchObject({ statusCode: 400 });
    expect(responses.save).not.toHaveBeenCalled();
  });
  test("rejects spoofed fields and missing host identity", async () => {
    await expect(service.saveHostResponse(user, "r1", { message: "Thanks", authorId: "other" }, "publish")).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.saveHostResponse({}, "r1", { message: "Thanks" }, "publish")).rejects.toMatchObject({ statusCode: 401 });
    expect((await new Controller({ service }).saveHostResponse({ resource: "/reviews/{id}/response", body: "{}" })).statusCode).toBe(401);
  });
  test("saves drafts but does not downgrade a published response", async () => {
    expect(await service.saveHostResponse(user, "r1", { message: "Thanks" }, "draft")).toMatchObject({ status: "draft", publishedAt: null });
    responses.findOne.mockResolvedValue({ status: "published" });
    await expect(service.saveHostResponse(user, "r1", { message: "Thanks" }, "draft")).rejects.toMatchObject({ statusCode: 409 });
  });
  test("creates, edits and publishes the same draft", async () => {
    let stored = null;
    responses.findOne.mockImplementation(async () => stored);
    responses.save.mockImplementation(async (record) => (stored = record));
    const draft = await service.saveHostResponse(user, "r1", { message: "Initial" }, "draft");
    expect(draft).toMatchObject({ status: "draft", publishedAt: null });
    const edited = await service.saveHostResponse(user, "r1", { message: "Completed" }, "edit");
    expect(edited).toMatchObject({ id: draft.id, status: "draft", message: "Completed", publishedAt: null });
    const published = await service.saveHostResponse(user, "r1", { message: edited.message }, "publish");
    expect(published).toMatchObject({ id: draft.id, status: "published", message: "Completed", publishedAt: 1000 });
  });
  test.each(["draft", "edit", "publish"])("enforces host ownership for %s", async (action) => {
    reviews.findOne.mockResolvedValue({ host_id: "other", status: "PUBLISHED", publication_status: "PUBLISHED" });
    await expect(service.saveHostResponse(user, "r1", { message: "Thanks" }, action))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(responses.save).not.toHaveBeenCalled();
  });
  test("rejects publishing invalid content without modifying the draft", async () => {
    responses.findOne.mockResolvedValue({ id: "d1", status: "draft", message: "Saved" });
    await expect(service.saveHostResponse(user, "r1", { message: " " }, "publish"))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(responses.save).not.toHaveBeenCalled();
  });
  test("does not save after a concurrent parent mutation", async () => {
    reviews.update.mockResolvedValue({ affected: 0 });
    await expect(service.saveHostResponse(user, "r1", { message: "Thanks" }, "draft"))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(responses.save).not.toHaveBeenCalled();
  });

});

test.each([false, true])("draft retrieval requires explicit host scope: %s", async (includeDrafts) => {
  const find = jest.fn().mockResolvedValue([]);
  await new ReviewRepository().attachPublicDetails({ getRepository: () => ({ find }) }, [{ id: "r1" }], includeDrafts);
  const filter = find.mock.calls[1][0].where.status;
  if (includeDrafts) expect(filter.value).toEqual(["draft", "published"]);
  else expect(filter).toBe("published");
});
test("authorized host retrieval opts into drafts", async () => {
  const repository = new ReviewRepository();
  const query = { getMany: async () => [{ id: "r1" }] };
  for (const method of ["select", "orderBy"]) query[method] = jest.fn(() => query);
  jest.spyOn(repository, "hostResponseQuery").mockReturnValue(query);
  jest.spyOn(repository, "attachPublicDetails").mockResolvedValue([]);
  Database.getInstance.mockResolvedValue({});
  await repository.findResponseEligibleReviews(user.username);
  expect(repository.hostResponseQuery).toHaveBeenCalledWith({}, user.username);
  expect(repository.attachPublicDetails).toHaveBeenCalledWith({}, [{ id: "r1" }], true);
});

test.each(["guest", "other"])("rejects deletion by %s", async (userId) => {
  const repository = {
    findById: jest.fn().mockResolvedValue({ id: "r1", host_id: "host", status: "PUBLISHED", publication_status: "PUBLISHED" }),
    softDeleteResponse: jest.fn(),
  };
  await expect(new ReviewService({ repository }).deleteReviewResponse(userId, "r1"))
    .rejects.toMatchObject({ statusCode: 403 });
  expect(repository.softDeleteResponse).not.toHaveBeenCalled();
});
test("authorized deletion updates status and timestamps without removing records", async () => {
  const repository = new ReviewRepository();
  jest.spyOn(repository, "findById").mockResolvedValue({ id: "r1", host_id: "host", status: "PUBLISHED", publication_status: "PUBLISHED" });
  const responses = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
  jest.spyOn(repository, "mutateResponse")
    .mockImplementation(async (_reviewId, _authorId, _timestamp, work) => work(responses));
  await new ReviewService({ repository, now: () => 2000 }).deleteReviewResponse("host", "r1");
  expect(repository.mutateResponse).toHaveBeenCalledWith("r1", "host", 2000, expect.any(Function));
  expect(responses.update).toHaveBeenCalledWith(
    expect.objectContaining({ reviewId: "r1", authorId: "host", deletedAt: expect.anything() }),
    { status: "deleted", deletedAt: 2000, updatedAt: 2000 },
  );
});
test("public response retrieval excludes soft-deleted records", async () => {
  const find = jest.fn().mockResolvedValue([]);
  await new ReviewRepository().attachPublicDetails({ getRepository: () => ({ find }) }, [{ id: "r1" }]);
  const { where } = find.mock.calls[1][0];
  expect(where.status).toBe("published");
  expect(where.deletedAt.type).toBe("isNull");
});
