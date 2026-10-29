import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import HostResponseForm from "../HostResponseForm";
import { saveHostResponse, deleteHostResponse } from "../services/reviewAPI";
jest.mock("../services/reviewAPI", () => ({ saveHostResponse: jest.fn(), deleteHostResponse: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
test("disables actions for a new empty response", () => {
  render(<HostResponseForm review={{ id: "r1" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Delete Response" })).toBeDisabled();
  expect(saveHostResponse).not.toHaveBeenCalled();
});
test("publishes and renders markup as literal text", async () => {
  saveHostResponse.mockResolvedValue({ status: "published", message: "<b>Thanks</b>" });
  render(<HostResponseForm review={{ id: "r1" }} />);
  fireEvent.change(screen.getByLabelText("Your response", { selector: "textarea" }), { target: { value: "<b>Thanks</b>" } });
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  const reply = await screen.findByLabelText("Host response");
  expect(reply).toHaveTextContent("<b>Thanks</b>"); expect(reply.querySelector("b")).toBeNull();
  expect(saveHostResponse).toHaveBeenCalledWith("r1", "<b>Thanks</b>");
});
test("preserves response text after authorization or server failure", async () => {
  saveHostResponse.mockRejectedValue(new Error("Access denied"));
  render(<HostResponseForm review={{ id: "r1", response: { message: "Old reply" } }} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Your response", { selector: "textarea" }), { target: { value: "Updated" } });
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
  expect(screen.getByLabelText("Your response", { selector: "textarea" })).toHaveValue("Updated");
});

test("confirms deletion and resets the editor after success", async () => {
  deleteHostResponse.mockResolvedValue(undefined);
  const onResponseChange = jest.fn();
  render(<HostResponseForm review={{ id: "r1", response: { status: "published", message: "Original" } }} onResponseChange={onResponseChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Delete Response" }));
  expect(deleteHostResponse).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(await screen.findByRole("textbox")).toHaveValue("");
  expect(deleteHostResponse).toHaveBeenCalledWith("r1");
  expect(onResponseChange).toHaveBeenCalledWith(null);
});
test("retains the published reply when deletion fails", async () => {
  deleteHostResponse.mockRejectedValue(new Error("Access denied"));
  render(<HostResponseForm review={{ id: "r1", response: { status: "published", message: "Original" } }} />);
  fireEvent.click(screen.getByRole("button", { name: "Delete Response" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
  expect(screen.getByLabelText("Host response")).toHaveTextContent("Original");
});
test("cancel restores the original published text without saving", () => {
  render(<HostResponseForm review={{ id: "r1", response: { status: "published", message: "Original" } }} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Changed" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByLabelText("Host response")).toHaveTextContent("Original");
  expect(saveHostResponse).not.toHaveBeenCalled();
});

test("only enables publishing changed, valid text for a published response", () => {
  render(<HostResponseForm review={{ id: "r1", response: { status: "published", message: "Original" } }} />);
  expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Delete Response" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
  const textbox = screen.getByRole("textbox");
  for (const value of ["Original", " Original ", " ", "bad\u0000text"]) {
    fireEvent.change(textbox, { target: { value } });
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  }
  fireEvent.change(textbox, { target: { value: "Updated reply" } });
  expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
});
test("allows an unchanged saved draft to be published", () => {
  render(<HostResponseForm review={{ id: "r1", response: { status: "draft", message: "Draft reply" } }} />);
  expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
});
test("disables all actions while publishing", async () => {
  let finish;
  saveHostResponse.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  render(<HostResponseForm review={{ id: "r1" }} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Thanks" } });
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  await act(async () => finish({ status: "published", message: "Thanks" }));
  expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
});
