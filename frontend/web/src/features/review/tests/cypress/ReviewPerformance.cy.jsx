import React from "react";
import { mount } from "cypress/react";
import { Auth } from "aws-amplify";
import ReviewPerformance from "../../views/ReviewPerformance";

const periods = [
  { period: "2026-01-01", average_score: 4.5, review_count: 2 },
  { period: "2026-02-01", average_score: null, review_count: 0 },
  { period: "2026-03-01", average_score: 4, review_count: 1 },
];

const selectProperty = () =>
  cy.contains("label", "Property").find("select").select("p1");

describe("Review performance browser layout", () => {
  beforeEach(() => {
    cy.stub(Auth, "currentSession").resolves({
      getIdToken: () => ({ getJwtToken: () => "test-token" }),
    });
    // Keep date defaults independent of the day the browser checks run.
    cy.clock(Date.UTC(2026, 9, 16), ["Date"]);
    cy.window().then((win) => {
      win.localStorage.clear();
      win.localStorage.setItem(
        "CognitoIdentityServiceProvider.test.host.accessToken",
        "test-token",
      );
    });

    cy.intercept("GET", "**/hostDashboard/all", {
      body: [{ property: { id: "p1", title: "Beach house" }, images: [] }],
    }).as("properties");

    cy.intercept("GET", "**/reviews?*", (request) => {
      expect(request.query.scope).to.equal("property-performance");
      expect(request.query.propertyId).to.equal("p1");
      expect(request.headers.authorization).to.equal("test-token");
      request.reply({ body: { periods } });
    }).as("performance");
  });

  [
    [375, 812],
    [768, 1024],
    [1440, 900],
  ].forEach(([width, height]) => {
    it(`renders controls, chart and table at ${width}px`, () => {
      cy.viewport(width, height);
      mount(<ReviewPerformance userId="host" />);
      cy.wait("@properties");
      selectProperty();
      cy.wait("@performance");

      cy.contains("td", "4.50").should("be.visible");
      cy.contains("td", "No score").should("be.visible");
      cy.get(".recharts-surface").should("be.visible");

      cy.get("section").should(($panel) => {
        const panel = $panel[0].getBoundingClientRect();
        expect(panel.left).to.be.at.least(0);
        expect(panel.right).to.be.at.most(width);
      });

      cy.get("section input, section select").each(($control) => {
        const control = $control[0].getBoundingClientRect();
        expect(control.width).to.be.greaterThan(0);
        expect(control.left).to.be.at.least(0);
        expect(control.right).to.be.at.most(width);
      });

      cy.get(".recharts-surface").should(($chart) => {
        const chart = $chart[0].getBoundingClientRect();
        expect(chart.width).to.be.greaterThan(0);
        expect(chart.height).to.be.greaterThan(0);
      });

      cy.document().should((document) => {
        expect(document.documentElement.scrollWidth).to.be.at.most(width);
      });
      cy.screenshot(`review-performance-${width}`, { capture: "viewport" });
    });
  });

  it("removes stale results when the date range is invalid", () => {
    mount(<ReviewPerformance userId="host" />);
    cy.wait("@properties");
    selectProperty();
    cy.wait("@performance");
    cy.contains("td", "4.50").should("be.visible");

    cy.contains("label", "Start date").find("input").type("2099-01-01");
    cy.get('[role="alert"]').should("contain", "start date");
    cy.get("table").should("not.exist");
    cy.get(".recharts-surface").should("not.exist");
    cy.get("@performance.all").should("have.length", 1);
  });
});
