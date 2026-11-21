import { ReviewRequestNotifier } from "../../functions/ReviewSystem/business/service/reviewRequestNotifier.js";

const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });

test("sends personalized HTML and plain text using real context fields", async () => {
  process.env.FRONTEND_URL = "https://acceptance.example.com";
  process.env.EMAIL_PROPERTY_IMAGE_BASE_URL = "https://images.example.com/";
  process.env.EMAIL_LOGO_URL = "https://images.example.com/logo.png";
  const response = body => ({ Payload: Buffer.from(JSON.stringify({ statusCode: 200, body })) });
  const client = { send: jest.fn().mockResolvedValueOnce(response(JSON.stringify([{ Attributes: [
    { Name: "email", Value: "guest@example.com" }, { Name: "given_name", Value: "Puok" },
  ] }]))).mockResolvedValueOnce(response("sent")) };
  const repository = { getDetails: jest.fn().mockResolvedValue({ propertyTitle: "Canal Loft", city: "Amsterdam",
    imageKey: "images/p1/photo & one.jpg" }) };
  await new ReviewRequestNotifier(client, { repository }).send({ id: "b1", property_id: "p1", guestid: "g1" });
  expect(repository.getDetails).toHaveBeenCalledWith("p1");
  const { body } = JSON.parse(Buffer.from(client.send.mock.calls[1][0].input.Payload).toString());
  expect(body.toEmail).toBe("guest@example.com");
  expect(body.htmlBody).toContain("Hi Puok,");
  expect(body.htmlBody).toContain("Canal Loft");
  expect(body.htmlBody).toContain("https://images.example.com/images/p1/photo%20%26%20one.jpg");
  expect(body.htmlBody).toContain("https://acceptance.example.com/review?bookingId=b1");
  expect(body.body).toContain("https://acceptance.example.com/review?bookingId=b1");
});

test.each(["p1", "p2"])("includes the booked property's image using the default S3 base: %s", async propertyId => {
  delete process.env.EMAIL_PROPERTY_IMAGE_BASE_URL;
  delete process.env.EMAIL_LOGO_URL;
  const response = body => ({ Payload: Buffer.from(JSON.stringify({ statusCode: 200, body })) });
  const client = { send: jest.fn().mockResolvedValueOnce(response(JSON.stringify([{ Attributes: [
    { Name: "email", Value: "guest@example.com" },
  ] }]))).mockResolvedValueOnce(response("sent")) };
  const repository = { getDetails: jest.fn(async id => ({ propertyTitle: "Apartment", imageKey: `images/${id}/web.jpg` })) };
  await new ReviewRequestNotifier(client, { repository }).send({ id: "b1", property_id: propertyId, guestid: "g1" });
  expect(repository.getDetails).toHaveBeenCalledWith(propertyId);
  const { body } = JSON.parse(Buffer.from(client.send.mock.calls[1][0].input.Payload).toString());
  expect(body.htmlBody).toContain(`https://accommodation.s3.eu-north-1.amazonaws.com/images/${propertyId}/web.jpg`);
  expect(body.htmlBody).not.toContain(`images/${propertyId === "p1" ? "p2" : "p1"}/web.jpg`);
});

test("does not substitute another property's photo when the booked property has none", async () => {
  delete process.env.EMAIL_PROPERTY_IMAGE_BASE_URL;
  delete process.env.EMAIL_LOGO_URL;
  const response = body => ({ Payload: Buffer.from(JSON.stringify({ statusCode: 200, body })) });
  const client = { send: jest.fn().mockResolvedValueOnce(response(JSON.stringify([{ Attributes: [
    { Name: "email", Value: "guest@example.com" },
  ] }]))).mockResolvedValueOnce(response("sent")) };
  const repository = { getDetails: jest.fn().mockResolvedValue({ propertyTitle: "Apartment" }) };
  await new ReviewRequestNotifier(client, { repository }).send({
    id: "b1", property_id: "ed49018c-54c4-40bb-a305-af9b83ab4001", guestid: "g1",
  });
  const { body } = JSON.parse(Buffer.from(client.send.mock.calls[1][0].input.Payload).toString());
  expect(body.htmlBody).not.toContain("<img");
});
