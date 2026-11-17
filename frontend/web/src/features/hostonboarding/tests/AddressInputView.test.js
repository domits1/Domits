import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AddressInputView from "../views/3_AddressInputView";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { useBuilder } from "../../../context/propertyBuilderContext";
import {
  HOUSE_NUMBER_FORMAT_MESSAGE,
  HOUSE_NUMBER_TOO_LARGE_MESSAGE,
  MAX_HOUSE_NUMBER,
} from "../../../utils/houseNumber";

jest.mock("../../../context/propertyBuilderContext", () => ({
  useBuilder: jest.fn(),
}));

jest.mock("../hooks/useOnboardingFlow", () => ({
  useOnboardingFlow: () => ({ prevPath: "/hostonboarding/house", nextPath: "/hostonboarding/house/capacity" }),
}));

const ADDRESS = {
  country: "Netherlands",
  city: "Amsterdam",
  street: "Damrak",
  houseNumber: "",
  houseNumberExtension: "",
  postalCode: "1012 LG",
};

const renderWithHouseNumber = (houseNumber) => {
  const builder = { addLocation: jest.fn() };
  useBuilder.mockReturnValue(builder);
  useFormStoreHostOnboarding.setState({ location: { ...ADDRESS, houseNumber } });
  render(
    <MemoryRouter>
      <AddressInputView />
    </MemoryRouter>
  );
  return builder;
};

const proceedButton = () => screen.getByRole("button", { name: "Proceed" });

describe("onboarding address step house number", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ["12A", 12, "A"],
    ["12 A", 12, "A"],
    ["12-14", 12, "-14"],
    ["12", 12, ""],
  ])("saves %p as number %p and extension %p", (houseNumber, number, extension) => {
    const builder = renderWithHouseNumber(houseNumber);

    expect(proceedButton()).toBeEnabled();
    fireEvent.click(proceedButton());

    expect(builder.addLocation).toHaveBeenCalledTimes(1);
    expect(builder.addLocation).toHaveBeenCalledWith({
      country: "Netherlands",
      city: "Amsterdam",
      street: "Damrak",
      houseNumber: number,
      houseNumberExtension: extension,
      postalCode: "1012 LG",
    });
  });

  it("explains at the field why a house number that starts with a letter cannot be used, and holds the step", () => {
    const builder = renderWithHouseNumber("A12");

    expect(screen.getByText(HOUSE_NUMBER_FORMAT_MESSAGE)).toBeInTheDocument();
    expect(proceedButton()).toBeDisabled();
    fireEvent.click(proceedButton());
    expect(builder.addLocation).not.toHaveBeenCalled();
  });

  it("explains a house number that does not fit the INTEGER column, and holds the step", () => {
    const builder = renderWithHouseNumber(String(MAX_HOUSE_NUMBER + 1));

    expect(screen.getByText(HOUSE_NUMBER_TOO_LARGE_MESSAGE)).toBeInTheDocument();
    expect(proceedButton()).toBeDisabled();
    expect(builder.addLocation).not.toHaveBeenCalled();
  });

  it("holds the step without a message while the house number is still empty", () => {
    renderWithHouseNumber("");

    expect(proceedButton()).toBeDisabled();
    expect(screen.queryByText(HOUSE_NUMBER_FORMAT_MESSAGE)).not.toBeInTheDocument();
  });

  it("does not log the builder when the host proceeds", () => {
    renderWithHouseNumber("12A");

    fireEvent.click(proceedButton());

    expect(console.log).not.toHaveBeenCalled();
  });
});
