jest.mock("../../functions/ReviewSystem/data/reviewRepository.js", () => ({ ReviewRepository: jest.fn() }));
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";
import { handler } from "../../functions/ReviewSystem/index.js";

// Exercise the real route, authorization, controller and service; stub only persistence.
describe("POST /reviews host submission", () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  const payload = { booking_id: "booking", review_type: "GUEST_TO_HOST", overall_rating: 5,
    title: " Welcoming host ", public_review: " Helpful and responsive. ",
    category_ratings: { communication: 5, responsiveness: 4, hospitality: 5 } };
  let booking, records;
  const repository = {
    findBookingById: jest.fn(), findReviewByBookingTypeAndReviewer: jest.fn(),
    findActiveCategoryKeys: jest.fn(), create: jest.fn(), publishDraft: jest.fn(),
  };
  const event = (body = payload, guest = "guest") => ({
    resource: "/reviews", httpMethod: "POST", body: JSON.stringify(body),
    requestContext: { authorizer: { claims: { sub: guest } } },
  });
  const submit = async (body = payload, guest = "guest") => {
    const response = await handler(event(body, guest));
    return { status: response.statusCode, body: JSON.parse(response.body) };
  };
  beforeAll(() => ReviewRepository.mockImplementation(() => repository));
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(now);
    records = [];
    booking = { id: "booking", guestid: "guest", hostid: "host", property_id: "property",
      status: "Paid", departuredate: now - 1000 };
    repository.findBookingById.mockImplementation(async () => booking);
    repository.findReviewByBookingTypeAndReviewer.mockImplementation(async (key) =>
      records.find(record => Object.entries(key).every(([field, value]) => record[field] === value)));
    repository.findActiveCategoryKeys.mockImplementation(async type => new Set(type === "GUEST_TO_HOST"
      ? ["communication", "responsiveness", "hospitality"] : ["cleanliness"]));
    repository.create.mockImplementation(async record => { records.push(record); return record; });
    jest.clearAllMocks();
  });
  afterEach(() => jest.restoreAllMocks());

  it("accepts a host review through the existing endpoint as an unpublished draft", async () => {
    const result = await submit({ ...payload, reviewer_user_id: "unrelated-guest", host_id: "unrelated-host",
      reviewee_user_id: "unrelated-host", property_id: "unrelated-property",
      status: "PUBLISHED", publication_status: "PUBLISHED", verification_status: "UNVERIFIED" });
    expect(result).toMatchObject({ status: 201, body: {
      booking_id: "booking", review_type: "GUEST_TO_HOST", reviewer_user_id: "guest",
      host_id: "host", reviewee_user_id: "host", property_id: "property", overall_rating: 5,
      title: "Welcoming host", public_review: "Helpful and responsive.",
      verification_status: "VERIFIED_STAY", status: "DRAFT", publication_status: "UNPUBLISHED",
    } });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining(result.body), payload.category_ratings);
    expect(repository.publishDraft).not.toHaveBeenCalled();
  });
  it.each([
    [null, 404], [{ guestid: "another-guest" }, 403], [{ hostid: "guest" }, 403],
    [{ status: "Cancelled" }, 400], [{ departuredate: now + 1 }, 400], [{ departuredate: null }, 400],
  ])("rejects an invalid or unrelated booking: %o", async (changes, status) => {
    booking = changes === null ? null : { ...booking, ...changes };
    expect(await submit()).toMatchObject({ status, body: { message: expect.any(String) } });
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated requests even when the body claims booking ownership", async () => {
    const request = event({ ...payload, reviewer_user_id: "guest" });
    delete request.requestContext;
    request.headers = { Authorization: "unverified-token" };
    expect((await handler(request)).statusCode).toBe(401);
    expect(repository.findBookingById).not.toHaveBeenCalled();
  });
  it("rejects another authenticated guest even when ownership fields are spoofed", async () => {
    expect(await submit({ ...payload, reviewer_user_id: "guest", host_id: "host" }, "another-guest"))
      .toMatchObject({ status: 403 });
    expect(repository.create).not.toHaveBeenCalled();
  });
  it.each([
    { overall_rating: 0 }, { overall_rating: 6 }, { overall_rating: 2.5 },
    { title: " " }, { title: "x".repeat(121) },
    { public_review: " " }, { public_review: "x".repeat(501) }, { public_review: "bad\u0000text" },
    { category_ratings: { communication: 0 } }, { category_ratings: { hospitality: 6 } },
    { category_ratings: { responsiveness: "5" } }, { category_ratings: { cleanliness: 5 } },
    { review_type: "HOST_TO_GUEST" },
  ])("validates the submission payload: %o", async changes => {
    expect(await submit({ ...payload, ...changes })).toMatchObject({ status: 400 });
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("rejects categories disabled in configuration", async () => {
    repository.findActiveCategoryKeys.mockResolvedValueOnce(new Set());
    expect(await submit()).toMatchObject({ status: 400 });
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("returns conflict for a repeat submission", async () => {
    expect(await submit()).toMatchObject({ status: 201 });
    expect(await submit()).toMatchObject({ status: 409 });
    expect(repository.create).toHaveBeenCalledTimes(1);
  });
  it("returns conflict when the database catches a concurrent duplicate", async () => {
    repository.create.mockRejectedValueOnce({ driverError: { code: "23505",
      constraint: "review_booking_type_reviewer_unique" } });
    expect(await submit()).toMatchObject({ status: 409 });
  });
  it.each([undefined, "GUEST_TO_PROPERTY"])("preserves property submission and coexistence: %s", async review_type => {
    expect(await submit({ ...payload, review_type, category_ratings: { cleanliness: 4 } }))
      .toMatchObject({ status: 201, body: { review_type: "GUEST_TO_PROPERTY",
        verification_status: "UNVERIFIED", status: "DRAFT", publication_status: "UNPUBLISHED" } });
    expect(await submit()).toMatchObject({ status: 201, body: { review_type: "GUEST_TO_HOST" } });
    expect(records).toHaveLength(2);
  });
  it("rejects malformed JSON before accessing the booking", async () => {
    expect((await handler({ ...event(), body: "{" })).statusCode).toBe(400);
    expect(repository.findBookingById).not.toHaveBeenCalled();
  });
});
