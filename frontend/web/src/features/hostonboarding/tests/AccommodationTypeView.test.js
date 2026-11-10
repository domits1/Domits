import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AccommodationTypeView from "../views/1_AccommodationTypeView";

const renderView = () =>
  render(
    <MemoryRouter initialEntries={["/hostonboarding"]}>
      <AccommodationTypeView />
    </MemoryRouter>
  );

describe("AccommodationTypeView", () => {
  it.each(["Villa", "House", "Apartment"])("shows %s as a selectable type", (type) => {
    renderView();
    expect(screen.getByText(type)).toBeInTheDocument();
  });

  it.each(["Boat", "Camper", "Cottage"])("does not show %s as a selectable type", (type) => {
    renderView();
    expect(screen.queryByText(type)).not.toBeInTheDocument();
  });
});
