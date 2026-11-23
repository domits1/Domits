import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AccommodationTypeView from "../views/1_AccommodationTypeView";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";

const renderView = () =>
  render(
    <MemoryRouter initialEntries={["/hostonboarding"]}>
      <AccommodationTypeView />
    </MemoryRouter>
  );

describe("AccommodationTypeView", () => {
  it.each(["Villa", "Home", "Residence"])("shows %s as a selectable type", (type) => {
    renderView();
    expect(screen.getByText(type)).toBeInTheDocument();
  });

  it.each(["House", "Apartment"])("does not show the old name %s", (name) => {
    renderView();
    expect(screen.queryByText(name)).not.toBeInTheDocument();
  });

  it("keeps saving the backend type names when the renamed tiles are chosen", () => {
    renderView();

    fireEvent.click(screen.getByText("Home"));
    expect(useFormStoreHostOnboarding.getState().accommodationDetails.type).toBe("House");

    fireEvent.click(screen.getByText("Residence"));
    expect(useFormStoreHostOnboarding.getState().accommodationDetails.type).toBe("Apartment");
  });

  it.each(["Boat", "Camper", "Cottage"])("does not show %s as a selectable type", (type) => {
    renderView();
    expect(screen.queryByText(type)).not.toBeInTheDocument();
  });
});
