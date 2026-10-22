import { buildReviewInvitationEmail } from "../../functions/ReviewSystem/business/service/reviewInvitationEmail.js";

const input = { booking: { id: "booking & one", guestname: "Puok", arrivaldate: Date.UTC(2026, 9, 18),
  departuredate: Date.UTC(2026, 9, 20) }, propertyTitle: "Amsterdam Apartment", city: "Amsterdam",
  frontendUrl: "https://domits.com", logoUrl: "https://assets.example.com/logo.png",
  propertyImageUrl: "https://assets.example.com/property.jpg" };

test("renders the branded invitation and a matching plain-text review link", () => {
  const email = buildReviewInvitationEmail(input);
  expect(email.subject).toBe("How was your stay?");
  for (const value of ["Hi Puok,", "Amsterdam Apartment", "18 Oct 2026 – 20 Oct 2026",
    "Share your experience", "Your opinion makes a difference", "The Domits Team"]) {
    expect(email.html).toContain(value);
  }
  const link = "https://domits.com/review?bookingId=booking+%26+one";
  expect(email.html).toContain(link);
  expect(email.text).toContain(link);
  expect(email.html).toContain('role="presentation"');
});

test("escapes guest and property data in HTML without changing plain text", () => {
  const email = buildReviewInvitationEmail({ ...input, guestName: '<img src=x onerror="alert(1)">',
    propertyTitle: "A & B's <Loft>", city: "<script>bad()</script>" });
  expect(email.html).not.toContain("<script>");
  expect(email.html).not.toContain('<img src=x');
  expect(email.html).toContain("A &amp; B&#39;s &lt;Loft&gt;");
  expect(email.text).toContain("A & B's <Loft>");
});

test("omits missing details and unsafe image URLs", () => {
  const email = buildReviewInvitationEmail({ booking: { id: "b1", arrivaldate: "invalid" },
    frontendUrl: "https://domits.com", logoUrl: "javascript:alert(1)", propertyImageUrl: "http://example.com/photo" });
  expect(email.html).toContain("Hi there,");
  expect(email.html).toContain("your accommodation");
  expect(email.html).not.toContain("<img");
  expect(email.html).not.toMatch(/undefined|Invalid Date|NaN/);
});

test.each(["http://localhost:3000", "javascript:alert(1)", undefined, "https://user:password@example.com"])(
  "rejects invalid frontend URL %s", frontendUrl => {
    expect(() => buildReviewInvitationEmail({ ...input, frontendUrl })).toThrow("HTTPS");
  });
