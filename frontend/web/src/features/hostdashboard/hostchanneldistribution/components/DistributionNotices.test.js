import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotReadyNotice, SettingUpNotice } from "./DistributionNotices";

describe("NotReadyNotice", () => {
  test("lists what is missing, one line each", () => {
    render(<NotReadyNotice items={["Add the address", "Add a price"]} />);

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Add the address", "Add a price"]);
  });
});

describe("SettingUpNotice", () => {
  test("says the listing is being set up, as a status sentence", () => {
    render(<SettingUpNotice onRetry={jest.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Setting up your listing…");
  });

  test("Retry asks the caller to turn it on again, once per click", async () => {
    const onRetry = jest.fn();
    render(<SettingUpNotice onRetry={onRetry} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("Retry is disabled while busy", async () => {
    const onRetry = jest.fn();
    render(<SettingUpNotice onRetry={onRetry} busy />);

    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).not.toHaveBeenCalled();
  });
});
