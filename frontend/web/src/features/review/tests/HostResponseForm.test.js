import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import HostResponseForm from "../HostResponseForm";
import { saveHostResponse } from "../services/reviewAPI";
jest.mock("../services/reviewAPI", () => ({ saveHostResponse: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
test("rejects an empty response", () => {
  render(<HostResponseForm review={{ id: "r1" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Publish response" }));
  expect(screen.getByRole("alert")).toHaveTextContent("between 1 and 500");
  expect(saveHostResponse).not.toHaveBeenCalled();
});
test("publishes and renders markup as literal text", async () => {
  saveHostResponse.mockResolvedValue({ status: "published", message: "<b>Thanks</b>" });
  render(<HostResponseForm review={{ id: "r1" }} />);
  fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "<b>Thanks</b>" } });
  fireEvent.click(screen.getByRole("button", { name: "Publish response" }));
  const reply = await screen.findByLabelText("Host response");
  expect(reply).toHaveTextContent("<b>Thanks</b>"); expect(reply.querySelector("b")).toBeNull();
  expect(saveHostResponse).toHaveBeenCalledWith("r1", "<b>Thanks</b>");
});
test("preserves response text after authorization or server failure", async () => {
  saveHostResponse.mockRejectedValue(new Error("Access denied"));
  render(<HostResponseForm review={{ id: "r1", response: { message: "Old reply" } }} />);
  fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "Updated" } });
  fireEvent.click(screen.getByRole("button", { name: "Update public response" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
  expect(screen.getByLabelText("Your response")).toHaveValue("Updated");
});
