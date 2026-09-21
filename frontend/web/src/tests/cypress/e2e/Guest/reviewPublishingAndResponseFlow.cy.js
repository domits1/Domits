const COGNITO_CLIENT_ID = "78jfrfhpded6meevllpfmo73mo";

const ids = {
  propertyId: "property-e2e-1",
  otherPropertyId: "property-e2e-other",
  bookingId: "booking-e2e-1",
  hostId: "host-e2e-1",
  guestId: "guest-e2e-1",
  adminId: "admin-e2e-1",
  reviewId: "review-e2e-1",
  responseId: "response-e2e-1",
};

const reviewText = "E2E review: clean, calm, and close to everything.";
const privateHostFeedback = "E2E private host feedback should not be public.";
const domitsPrivateFeedback = "E2E private Domits feedback should not be public.";
const hostResponse = "E2E host response: thank you for staying with us.";

const reviewCreatedAt = Date.parse("2026-09-16T10:00:00.000Z");
const responsePublishedAt = Date.parse("2026-09-16T11:00:00.000Z");

let reviewRecord;
let responseRecord;

const toBase64Url = (win, value) =>
  win
    .btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const createFakeJwt = (win, payload) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return [
    toBase64Url(win, { alg: "none", typ: "JWT" }),
    toBase64Url(win, {
      iss: "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_mPxNhvSFX",
      aud: COGNITO_CLIENT_ID,
      iat: nowSeconds,
      exp: nowSeconds + 60 * 60,
      ...payload,
    }),
    "signature",
  ].join(".");
};

const writeCognitoSession = (win, { sub, role, email }) => {
  const username = sub;
  const baseKey = `CognitoIdentityServiceProvider.${COGNITO_CLIENT_ID}.${username}`;
  const attributes = [
    { Name: "sub", Value: sub },
    { Name: "email", Value: email },
    { Name: "custom:group", Value: role },
  ];

  win.localStorage.clear();
  win.localStorage.setItem(`CognitoIdentityServiceProvider.${COGNITO_CLIENT_ID}.LastAuthUser`, username);
  win.localStorage.setItem(`${baseKey}.clockDrift`, "0");
  win.localStorage.setItem(`${baseKey}.refreshToken`, "cypress-refresh-token");
  win.localStorage.setItem(
    `${baseKey}.idToken`,
    createFakeJwt(win, {
      sub,
      email,
      "custom:group": role,
      token_use: "id",
    })
  );
  win.localStorage.setItem(
    `${baseKey}.accessToken`,
    createFakeJwt(win, {
      sub,
      username,
      scope: "aws.cognito.signin.user.admin",
      token_use: "access",
    })
  );
  win.localStorage.setItem(
    `${baseKey}.userData`,
    JSON.stringify({
      Username: username,
      UserAttributes: attributes,
    })
  );
};

const users = {
  guest: {
    sub: ids.guestId,
    role: "Traveler",
    email: "guest-e2e@example.test",
  },
  host: {
    sub: ids.hostId,
    role: "Host",
    email: "host-e2e@example.test",
  },
  admin: {
    sub: ids.adminId,
    role: "Admin",
    email: "admin-e2e@example.test",
  },
};

const visitAs = (path, user) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      writeCognitoSession(win, user);
    },
  });
};

const publicReviewsPayload = (propertyId) => {
  const isReviewPublic =
    reviewRecord?.propertyId === propertyId &&
    reviewRecord?.status === "PUBLISHED" &&
    reviewRecord?.publicationStatus === "PUBLISHED";

  return {
    reviews: isReviewPublic
      ? [
          {
            id: ids.reviewId,
            overallRating: reviewRecord.overallRating,
            title: reviewRecord.title,
            publicReview: reviewRecord.publicReview,
            verificationStatus: "VERIFIED_STAY",
            status: "PUBLISHED",
            createdAt: reviewCreatedAt,
            categoryRatings: reviewRecord.categoryRatings,
            response:
              responseRecord?.reviewId === ids.reviewId && responseRecord.status === "published"
                ? {
                    id: ids.responseId,
                    authorRole: "host",
                    message: responseRecord.message,
                    publishedAt: responsePublishedAt,
                  }
                : null,
          },
        ]
      : [],
    totalReviews: isReviewPublic ? 1 : 0,
    overallRating: isReviewPublic ? reviewRecord.overallRating : null,
    categoryRatings: isReviewPublic ? reviewRecord.categoryRatings : {},
  };
};

const hostReviewsPayload = (hostId) => ({
  reviews:
    reviewRecord?.hostId === hostId
      ? [
          {
            ...reviewRecord,
            response: responseRecord || null,
          },
        ]
      : [],
});

const propertyIdFromPropertyReviewsPath = (url) => {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/\/properties\/([^/]+)\/reviews$/);
  return match?.[1] || "";
};

const stubReviewApis = () => {
  cy.intercept("GET", "**0jpcbp40hf.execute-api.eu-north-1.amazonaws.com/default?action=memberships*", []);

  cy.intercept("POST", "**/reviews", (req) => {
    expect(req.body.bookingId).to.eq(ids.bookingId);
    expect(req.body.propertyId).to.eq(ids.propertyId);
    expect(req.body.publicReview).to.eq(reviewText);
    expect(req.body.privateFeedback).to.eq(privateHostFeedback);
    expect(req.body.domitsPrivateFeedback).to.eq(domitsPrivateFeedback);

    reviewRecord = {
      id: ids.reviewId,
      bookingId: ids.bookingId,
      propertyId: ids.propertyId,
      hostId: ids.hostId,
      reviewerUserId: ids.guestId,
      revieweeUserId: ids.hostId,
      reviewType: "GUEST_TO_PROPERTY",
      overallRating: req.body.overallRating,
      title: req.body.title,
      publicReview: req.body.publicReview,
      privateFeedback: req.body.privateFeedback,
      domitsPrivateFeedback: req.body.domitsPrivateFeedback,
      categoryRatings: req.body.categoryRatings,
      verificationStatus: "VERIFIED_STAY",
      publicationStatus: "UNPUBLISHED",
      status: "SUBMITTED",
      createdAt: reviewCreatedAt,
      updatedAt: reviewCreatedAt,
    };

    req.reply({ statusCode: 201, body: { review: reviewRecord } });
  }).as("submitReview");

  cy.intercept("GET", "**/reviews*", (req) => {
    const url = new URL(req.url);
    const hostId = url.searchParams.get("hostId");
    const propertyId = url.searchParams.get("propertyId");

    if (hostId) {
      req.reply({ statusCode: 200, body: hostReviewsPayload(hostId) });
      return;
    }

    if (propertyId) {
      req.reply({ statusCode: 200, body: publicReviewsPayload(propertyId) });
      return;
    }

    req.reply({ statusCode: 200, body: { reviews: [] } });
  }).as("reviews");

  cy.intercept("GET", "**/properties/*/reviews", (req) => {
    req.reply({
      statusCode: 200,
      body: publicReviewsPayload(propertyIdFromPropertyReviewsPath(req.url)),
    });
  }).as("propertyReviews");

  cy.intercept("POST", `**/reviews/${ids.reviewId}/response/publish`, (req) => {
    expect(req.body.message).to.eq(hostResponse);

    responseRecord = {
      id: ids.responseId,
      reviewId: ids.reviewId,
      authorId: ids.hostId,
      authorRole: "host",
      status: "published",
      message: req.body.message,
      createdAt: responsePublishedAt,
      updatedAt: responsePublishedAt,
      publishedAt: responsePublishedAt,
    };

    req.reply({ statusCode: 200, body: { response: responseRecord } });
  }).as("publishResponse");
};

const clickFiveStarsFor = (ariaLabel) => {
  cy.get(`[aria-label="${ariaLabel}"]`).find('button[aria-label="5 stars"]').click();
};

const fillReviewForm = () => {
  clickFiveStarsFor("Overall rating");
  clickFiveStarsFor("Cleanliness rating");
  clickFiveStarsFor("Accuracy rating");
  clickFiveStarsFor("Communication rating");
  clickFiveStarsFor("Location rating");
  clickFiveStarsFor("Check-in rating");
  clickFiveStarsFor("Value rating");

  cy.get("#review-title").clear().type("E2E wonderful stay");
  cy.get("#public-review").clear().type(reviewText);
  cy.get("#private-feedback").clear().type(privateHostFeedback);
  cy.get("#domits-private-feedback").clear().type(domitsPrivateFeedback);
};

const approveSubmittedReviewAsAdmin = () => {
  visitAs("/", users.admin);

  cy.then(() => {
    expect(reviewRecord, "submitted review exists").to.exist;
    expect(reviewRecord.status).to.eq("SUBMITTED");
    expect(reviewRecord.propertyId).to.eq(ids.propertyId);

    reviewRecord = {
      ...reviewRecord,
      status: "PUBLISHED",
      publicationStatus: "PUBLISHED",
      updatedAt: Date.parse("2026-09-16T10:30:00.000Z"),
    };
  });
};

describe("Review publishing and response flow", () => {
  beforeEach(() => {
    reviewRecord = null;
    responseRecord = null;
    stubReviewApis();
  });

  it("publishes a guest review and host response under the correct public property review", () => {
    visitAs(
      `/guestdashboard/reviews/new?bookingId=${ids.bookingId}&reservationId=${ids.bookingId}&propertyId=${ids.propertyId}&hostId=${ids.hostId}&verifiedStay=true`,
      users.guest
    );

    cy.contains("h1", "Review your stay").should("be.visible");
    fillReviewForm();
    cy.contains("button", "Submit review").click();
    cy.wait("@submitReview");

    approveSubmittedReviewAsAdmin();

    cy.visit(`/listingdetails?ID=${ids.propertyId}`);
    cy.wait("@reviews");

    cy.contains("Guest reviews").should("be.visible");
    cy.contains(reviewText).should("be.visible");
    cy.contains("5.0").should("be.visible");
    cy.contains("Verified stay").should("be.visible");
    cy.contains(privateHostFeedback).should("not.exist");
    cy.contains(domitsPrivateFeedback).should("not.exist");

    visitAs("/hostdashboard/reviews", users.host);
    cy.wait("@reviews");

    cy.contains(reviewText)
      .parents("article")
      .within(() => {
        cy.get("textarea").clear().type(hostResponse);
        cy.contains("button", /^Publish$/).click();
      });
    cy.wait("@publishResponse");

    cy.visit(`/listingdetails?ID=${ids.propertyId}`);
    cy.wait("@reviews");

    cy.contains(".reviews-section__card", reviewText).within(() => {
      cy.contains("Response from host").should("be.visible");
      cy.contains(hostResponse).should("be.visible");
      cy.contains(/\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2}, \d{4}/).should("be.visible");
    });

    cy.visit(`/listingdetails?ID=${ids.otherPropertyId}`);
    cy.wait("@reviews");
    cy.contains(reviewText).should("not.exist");
    cy.contains(hostResponse).should("not.exist");
  });
});
