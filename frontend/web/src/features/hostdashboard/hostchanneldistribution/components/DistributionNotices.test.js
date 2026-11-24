import React from "react";
import { render, screen } from "@testing-library/react";
import { NotReadyNotice } from "./DistributionNotices";

describe("NotReadyNotice", () => {
  test("lists what is missing, one line each", () => {
    render(<NotReadyNotice items={["Add the address", "Add a price"]} />);

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Add the address", "Add a price"]);
  });
});
