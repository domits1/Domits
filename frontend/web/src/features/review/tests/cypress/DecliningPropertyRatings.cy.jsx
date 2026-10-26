import React from "react";
import { mount } from "cypress/react";
import { Auth } from "aws-amplify";
import DecliningPropertyRatings from "../../views/DecliningPropertyRatings";

const property = { property_id: "p1", trend_status: "DECLINING", previous_average_rating: 4.5,
  current_average_rating: 4, rating_change: -0.5, previous_review_count: 3, current_review_count: 4 };
const response = { properties: [property],
  previous_period: { start_date: "2026-08-08", end_date: "2026-09-06" },
  current_period: { start_date: "2026-09-07", end_date: "2026-10-06" },
  decline_threshold: 0.5, minimum_reviews_per_period: 3, next_offset: null };

describe("Declining property ratings layout", () => {
  beforeEach(() => {
    cy.stub(Auth, "currentSession").resolves({
      getIdToken: () => ({ getJwtToken: () => "test-token" }),
    });
    cy.clock(Date.UTC(2026, 9, 7, 12), ["Date"]);
    cy.window().then((win) => {
      win.localStorage.clear();
      win.localStorage.setItem("CognitoIdentityServiceProvider.test.host.accessToken", "test-token");
    });
    cy.intercept("GET", "**/hostDashboard/all", {
      body: [{ property: { id: "p1", title: "Beach house" }, images: [] }],
    }).as("properties");
    cy.intercept("GET", "**/reviews?*", (request) => {
      expect(request.query.scope).to.equal("property-trends");
      expect(request.query.status).to.equal("DECLINING");
      request.reply({ body: response });
    }).as("trends");
  });

  [[375, 812, "mobile"], [768, 1024, "tablet"], [1440, 900, "desktop"]].forEach(([width, height, name]) => {
    it(`renders the ${name} layout without page overflow`, () => {
      cy.viewport(width, height);
      mount(<div style={{ padding: 16, background: "#f5f7f5", fontFamily: "Arial, sans-serif" }}><DecliningPropertyRatings userId="host" /></div>);
      cy.wait(["@properties", "@trends"]);
      cy.contains("th", "Beach house").should("be.visible");
      cy.contains("td", "-0.50").scrollIntoView().should("be.visible");
      cy.get("section input").each(($input) => {
        const bounds = $input[0].getBoundingClientRect();
        expect(bounds.left).to.be.at.least(0);
        expect(bounds.right).to.be.at.most(width);
      });
      cy.document().should((document) => {
        expect(document.documentElement.scrollWidth).to.be.at.most(width);
      });
      cy.contains("button", "Next page").should("be.disabled");
      // On small screens the comparison table scrolls inside its own container.
      cy.get("table").parent().then(($container) => {
        if (width < 600) cy.wrap($container).scrollTo("right", { ensureScrollable: false });
      });
      cy.contains("td", "Declining").should("be.visible");
      cy.get("table").parent().scrollTo("left", { ensureScrollable: false });
      cy.screenshot(`declining-property-ratings-${name}`, { capture: "fullPage" });
    });
  });
});
