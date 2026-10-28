import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HostResponseForm from "../components/HostResponseForm";
import { saveHostResponse, deleteHostResponse } from "../services/reviewAPI";
jest.mock("../services/reviewAPI", () => ({ saveHostResponse: jest.fn(), deleteHostResponse: jest.fn() }));
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

test("saves, edits and publishes a draft", async () => {
  saveHostResponse
    .mockResolvedValueOnce({ id: "d1", status: "draft", message: "Initial" })
    .mockResolvedValueOnce({ id: "d1", status: "draft", message: "Completed" })
    .mockResolvedValueOnce({ id: "d1", status: "published", message: "Completed" });
  render(<HostResponseForm review={{ id: "r1" }} />);
  fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "Initial" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
  expect(await screen.findByLabelText("Response draft")).toHaveTextContent("Initial");
  expect(saveHostResponse).toHaveBeenNthCalledWith(1, "r1", "Initial", "draft");
  await waitFor(() => expect(screen.getByLabelText("Your response")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "Completed" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
  await waitFor(() => expect(screen.getByLabelText("Response draft")).toHaveTextContent("Completed"));
  expect(saveHostResponse).toHaveBeenNthCalledWith(2, "r1", "Completed", "edit");
  await waitFor(() => expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(await screen.findByLabelText("Host response")).toHaveTextContent("Completed");
  expect(saveHostResponse).toHaveBeenNthCalledWith(3, "r1", "Completed");
  expect(screen.queryByRole("button", { name: "Save Draft" })).not.toBeInTheDocument();
});

test("reopens a saved draft for editing without presenting it as public", () => {
  render(<HostResponseForm review={{ id: "r1", response: { id: "d1", status: "draft", message: "Saved reply" } }} />);
  expect(screen.getByLabelText("Your response")).toHaveValue("Saved reply");
  expect(screen.getByLabelText("Response draft")).toHaveTextContent("not publicly visible");
  expect(screen.queryByLabelText("Host response")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save Draft" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
});

afterEach(() => jest.restoreAllMocks());
test("allows cancelling response deletion", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  render(<HostResponseForm review={{ id: "r1", response: { status: "published", message: "Thanks" } }} />);
  fireEvent.click(screen.getByRole("button", { name: "Delete Response" }));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Delete this response?"));
  expect(deleteHostResponse).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Your response")).toHaveValue("Thanks");
});
test("deletes once and clears the response after success", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  let complete;
  deleteHostResponse.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
  const onSaved = jest.fn();
  render(<HostResponseForm onSaved={onSaved}
    review={{ id: "r1", response: { status: "published", message: "Thanks" } }} />);
  const button = screen.getByRole("button", { name: "Delete Response" });
  fireEvent.click(button); fireEvent.click(button);
  expect(button).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Deleting response");
  expect(deleteHostResponse).toHaveBeenCalledTimes(1);
  expect(deleteHostResponse).toHaveBeenCalledWith("r1");
  complete();
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Response deleted."));
  expect(onSaved).toHaveBeenCalledWith(null);
  expect(screen.queryByLabelText("Host response")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete Response" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Your response")).toHaveValue("");
});
test("preserves the response and allows retry after failed deletion", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  deleteHostResponse.mockRejectedValueOnce(new Error("Access denied"));
  const onSaved = jest.fn();
  render(<HostResponseForm onSaved={onSaved}
    review={{ id: "r1", response: { status: "draft", message: "Saved reply" } }} />);
  fireEvent.click(screen.getByRole("button", { name: "Delete Response" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
  expect(screen.getByLabelText("Your response")).toHaveValue("Saved reply");
  expect(screen.getByRole("button", { name: "Delete Response" })).toBeEnabled();
  expect(onSaved).not.toHaveBeenCalled();
});
