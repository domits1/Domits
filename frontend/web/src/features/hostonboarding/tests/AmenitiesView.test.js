import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AmenitiesView from "../views/5_AmenitiesView";
import { useBuilder } from "../../../context/propertyBuilderContext";

jest.mock("../../../context/propertyBuilderContext", () => ({
  useBuilder: jest.fn(),
}));

jest.mock("../hooks/useOnboardingFlow", () => ({
  useOnboardingFlow: () => ({ prevPath: "/hostonboarding/house/capacity", nextPath: "/hostonboarding/house/rules" }),
}));

const categoryTitlesOnPage = () => screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);

const renderView = () => {
  useBuilder.mockReturnValue({ addAmenities: jest.fn() });
  render(
    <MemoryRouter>
      <AmenitiesView />
    </MemoryRouter>
  );
};

describe("onboarding amenities step", () => {
  it("lists the Essentials category first and the other categories alphabetically after it", () => {
    renderView();

    const titles = categoryTitlesOnPage();

    expect(titles[0]).toBe("Essentials");
    expect(titles.slice(1)).toEqual([...titles.slice(1)].sort((a, b) => a.localeCompare(b)));
  });

  it("keeps Essentials out of the later pages", () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(categoryTitlesOnPage()).not.toContain("Essentials");
  });
});
