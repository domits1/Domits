import React from "react";
import { render, screen } from "@testing-library/react";
import { NotReadyNotice, SetupFailedNotice } from "./DistributionNotices";

describe("NotReadyNotice", () => {
  test("lists what is missing, one line each", () => {
    render(<NotReadyNotice items={["Add the address", "Add a price"]} />);

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Add the address", "Add a price"]);
  });
});

describe("SetupFailedNotice", () => {
  test("tells the host to try again, as an alert", () => {
    render(<SetupFailedNotice />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong while setting up. Try again.");
  });
});
