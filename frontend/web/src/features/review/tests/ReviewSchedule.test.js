import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReviewSchedule from "../components/ReviewSchedule";
import { reviewSchedule } from "../services/reviewAPI";
jest.mock("../services/reviewAPI", () => ({ reviewSchedule: jest.fn() }));
beforeEach(() => jest.resetAllMocks());
test("loads and saves the selected property's timing", async () => {
  reviewSchedule.mockResolvedValue({ enabled: true, delayHours: 24 });
  render(<ReviewSchedule propertyId="p1" />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading");
  fireEvent.change(await screen.findByRole("combobox"), { target: { value: "48" } });
  reviewSchedule.mockResolvedValue({ enabled: true, delayHours: 48 });
  fireEvent.click(screen.getByRole("button", { name: "Save review preferences" }));
  await screen.findByText("Preferences saved.");
  expect(reviewSchedule).toHaveBeenLastCalledWith("p1", { enabled: true, delayHours: 48 });
});
test("shows load errors and retries", async () => {
  reviewSchedule.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValue({ enabled: false, delayHours: 0 });
  render(<ReviewSchedule propertyId="p1" />);
  await screen.findByRole("alert"); fireEvent.click(screen.getByText("Retry"));
  await waitFor(() => expect(screen.getByRole("combobox")).toBeDisabled());
});
test("preserves preferences on save failure", async () => {
  reviewSchedule.mockResolvedValueOnce({ enabled: true, delayHours: 24 }).mockRejectedValue(new Error("Save failed"));
  render(<ReviewSchedule propertyId="p1" />);
  fireEvent.change(await screen.findByRole("combobox"), { target: { value: "72" } });
  fireEvent.click(screen.getByRole("button", { name: "Save review preferences" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
  expect(screen.getByRole("combobox")).toHaveValue("72");
});
