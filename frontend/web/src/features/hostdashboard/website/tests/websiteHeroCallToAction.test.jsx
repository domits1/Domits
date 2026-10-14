import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";
import PanoramaLandingTemplate from "../rendering/templates/PanoramaLandingTemplate";

const TEMPLATE_KEY = "panorama-landing";
const buildModel = () => buildWebsiteTemplateModel({ propertyDetails: {} });

const findHeroCallToAction = () => screen.getByRole("button", { name: /check live availability/i });

describe("hero call to action copy", () => {
  it("ships with a label and no note by default", () => {
    expect(buildModel().callToAction).toEqual({ label: "Check live availability", note: "" });
  });

  it("keeps a note the host wrote in the editor", () => {
    const model = applyWebsiteDraftContentOverrides(
      buildModel(),
      { ctaNote: "Best rate, no booking fees." },
      TEMPLATE_KEY
    );
    expect(model.callToAction.note).toBe("Best rate, no booking fees.");
  });

  it("leaves the note empty when the host did not write one", () => {
    const model = applyWebsiteDraftContentOverrides(buildModel(), { ctaLabel: "Book now" }, TEMPLATE_KEY);
    expect(model.callToAction).toEqual({ label: "Book now", note: "" });
  });
});

describe("Panorama hero call to action", () => {
  it("renders only the label when the note is empty", () => {
    render(<PanoramaLandingTemplate model={buildModel()} />);

    const button = findHeroCallToAction();
    expect(button).toHaveTextContent(/^Check live availability$/);
    expect(button).not.toHaveTextContent(/direct booking website/i);
  });

  it("renders a custom note under the label", () => {
    const model = applyWebsiteDraftContentOverrides(
      buildModel(),
      { ctaNote: "Best rate, no booking fees." },
      TEMPLATE_KEY
    );
    render(<PanoramaLandingTemplate model={model} />);

    expect(findHeroCallToAction()).toHaveTextContent("Best rate, no booking fees.");
  });

  it("shows a scroll arrow that screen readers skip", () => {
    render(<PanoramaLandingTemplate model={buildModel()} />);

    const arrow = within(findHeroCallToAction()).getByTestId("panorama-hero-cta-arrow");
    expect(arrow).toHaveAttribute("aria-hidden", "true");
    expect(findHeroCallToAction()).toHaveTextContent(/^Check live availability$/);
  });

  it("scrolls to the availability block on click", () => {
    globalThis.scrollTo = jest.fn();
    render(<PanoramaLandingTemplate model={buildModel()} />);
    expect(screen.getByRole("region", { name: "Availability" })).toBeInTheDocument();

    fireEvent.click(findHeroCallToAction());

    expect(globalThis.scrollTo).toHaveBeenCalledTimes(1);
  });
});
