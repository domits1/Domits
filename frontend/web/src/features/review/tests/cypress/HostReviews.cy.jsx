import React from "react";
import { mount } from "cypress/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import HostReviews from "../../views/HostReviews";
import photo from "../../../../images/4-Bed-Kona-Homes.jpeg";

const reviews = [
  { id: "r1", property_id: "p1", title: "Comfortable studio", rating: 4, content: "The studio was comfortable and well equipped. The surrounding area was a little noisy at night.", verification_status: "VERIFIED", booking_id: "DM123456", date: Date.UTC(2026, 6, 21) },
  { id: "r2", property_id: "p1", title: "Great stay in Amsterdam", rating: 5, content: "The apartment was clean, comfortable, and conveniently located. Communication with the host was excellent.", verification_status: "VERIFIED", booking_id: "DM987654", date: Date.UTC(2026, 6, 20) },
  { id: "r3", property_id: "p1", title: "Nice location and friendly host", rating: 5, content: "We had a great time. The location was perfect and the host was very helpful with local tips.", verification_status: "VERIFIED", booking_id: "DM555321", date: Date.UTC(2026, 6, 18) },
];
describe("Host reviews reference layout", () => {
  beforeEach(() => {
    cy.stub(Auth, "currentUserInfo").resolves({ attributes: { sub: "host" } });
    cy.stub(Auth, "currentSession").resolves({ getIdToken: () => ({ getJwtToken: () => "token" }) });
    cy.window().then((win) => {
      win.localStorage.clear();
      win.localStorage.setItem("CognitoIdentityServiceProvider.test.host.accessToken", "token");
      cy.intercept("GET", "**/hostDashboard/all", { body: [{
        property: { id: "p1", title: "City studio" }, propertyLocation: { city: "Amsterdam", country: "Netherlands" },
        images: [{ key: new URL(photo, win.location.origin).href }],
      }] }).as("properties");
    });
    cy.intercept("GET", "**/reviews?*", { body: reviews }).as("reviews");
  });
  [1280, 375].forEach((width) => {
    it(`shows review cards and real rating summaries at ${width}px`, () => {
      cy.viewport(width, 900);
      mount(<MemoryRouter><div style={{ padding: 24, fontFamily: "Arial, sans-serif", background: "#fff" }}><HostReviews /></div></MemoryRouter>);
      cy.wait(["@reviews", "@properties"]);
      cy.contains("h3", "Received reviews (3)").should("be.visible");
      cy.contains("strong", "4.7").should("be.visible");
      cy.get("article").should("have.length", 3);
      cy.get('article img').first().should(($image) => expect($image[0].naturalWidth).to.be.greaterThan(0));
      cy.document().should((document) => expect(document.documentElement.scrollWidth).to.be.at.most(width));
      cy.screenshot(`host-reviews-reference-${width}`, { capture: "fullPage" });
      cy.get('input[type="search"]').type("well equipped");
      cy.get("article").should("have.length", 1);
      cy.contains("strong", "4.7").should("exist");
    });
  });
});
