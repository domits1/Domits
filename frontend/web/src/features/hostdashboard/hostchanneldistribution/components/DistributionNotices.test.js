import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotReadyNotice, SetupFailedNotice } from "./DistributionNotices";

describe("NotReadyNotice", () => {
  test("lists what is missing, one line each", () => {
    render(<NotReadyNotice items={["Add the address", "Add a price"]} />);

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Add the address", "Add a price"]);
  });
});

describe("SetupFailedNotice", () => {
  test("tells the host to try again, as an alert", () => {
    render(<SetupFailedNotice onRetry={jest.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong while setting up. Try again.");
  });

  test("Retry asks the caller to try again, once per click", async () => {
    const onRetry = jest.fn();
    render(<SetupFailedNotice onRetry={onRetry} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("Retry is disabled while busy", async () => {
    const onRetry = jest.fn();
    render(<SetupFailedNotice onRetry={onRetry} busy />);

    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).not.toHaveBeenCalled();
  });
});
