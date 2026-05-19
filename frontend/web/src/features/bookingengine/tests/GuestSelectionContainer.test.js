import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import GuestSelectionContainer from "../listingdetails/views/guestSelectionContainer";

describe("GuestSelectionContainer", () => {
  test("clamps adults and kids to maxGuests", () => {
    const setAdultsParent = jest.fn();
    const setKidsParent = jest.fn();

    render(
      <GuestSelectionContainer
        setAdultsParent={setAdultsParent}
        setKidsParent={setKidsParent}
        maxGuests={3}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /1 guest/i }));

    const adultsInput = screen.getByLabelText("Adults");
    const kidsInput = screen.getByLabelText("Kids");

    fireEvent.change(kidsInput, { target: { value: "2" } });
    expect(kidsInput).toHaveValue(2);
    expect(setKidsParent).toHaveBeenLastCalledWith(2);

    fireEvent.change(adultsInput, { target: { value: "3" } });
    expect(adultsInput).toHaveValue(1);
    expect(setAdultsParent).toHaveBeenLastCalledWith(1);
  });
});
