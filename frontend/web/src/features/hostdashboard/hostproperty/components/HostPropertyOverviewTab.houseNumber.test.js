import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import { HostPropertyOverviewTab } from "./HostPropertyTabContent";
import { HOUSE_NUMBER_FORMAT_MESSAGE, HOUSE_NUMBER_TOO_LARGE_MESSAGE } from "../../../../utils/houseNumber";

const renderOverview = (houseNumber, updateAddressField = jest.fn()) => {
  render(
    <HostPropertyOverviewTab
      form={{ title: "Canal house", subtitle: "", description: "Two floors by the water." }}
      updateField={jest.fn()}
      displayedPropertyType="Entire house"
      setCapacity={jest.fn()}
      capacity={{ propertyType: "Entire house", guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 }}
      adjustCapacityField={jest.fn()}
      updateCapacityField={jest.fn()}
      address={{ street: "Damrak", houseNumber, postalCode: "1012 LG", city: "Amsterdam", country: "Netherlands" }}
      updateAddressField={updateAddressField}
      bookingType="direct"
      onBookingTypeChange={jest.fn()}
    />
  );
  return updateAddressField;
};

describe("house number field of the Overview tab", () => {
  it("explains next to the field why a house number that starts with a letter cannot be saved", () => {
    renderOverview("A12");

    const input = screen.getByLabelText("House number");
    const message = screen.getByText(HOUSE_NUMBER_FORMAT_MESSAGE);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", message.id);
  });

  it("explains a house number that does not fit the INTEGER column", () => {
    renderOverview("99999999999");

    expect(screen.getByText(HOUSE_NUMBER_TOO_LARGE_MESSAGE)).toBeInTheDocument();
  });

  it.each(["12A", "12 A", "12-14", ""])("shows no message for %p", (houseNumber) => {
    renderOverview(houseNumber);

    expect(screen.getByLabelText("House number")).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText(HOUSE_NUMBER_FORMAT_MESSAGE)).not.toBeInTheDocument();
  });

  it("passes what the host types on, so the message follows the typing", () => {
    const updateAddressField = renderOverview("");

    fireEvent.change(screen.getByLabelText("House number"), { target: { value: "A12" } });

    expect(updateAddressField).toHaveBeenCalledWith("houseNumber", "A12");
  });
});
