import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConnectChecklistModal from "./ConnectChecklistModal";
import { DISMISS_ACTIONS } from "./modalTestHelpers";

const PLATFORM = { otaCode: "Airbnb", name: "Airbnb" };

const renderModal = () => {
  const onContinue = jest.fn();
  const onClose = jest.fn();
  render(<ConnectChecklistModal platform={PLATFORM} onContinue={onContinue} onClose={onClose} />);
  return { onContinue, onClose };
};

describe("ConnectChecklistModal", () => {
  test("shows one unticked checkbox per line of the platform's checklist, and Continue disabled", () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "Connect Airbnb" })).toBeInTheDocument();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    boxes.forEach((box) => expect(box).not.toBeChecked());
    expect(screen.getByRole("checkbox", { name: /owner of the Airbnb account/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /disconnect only with the switch/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  test("Continue stays disabled until every line is ticked, and unticking one disables it again", async () => {
    const user = userEvent.setup();
    renderModal();
    const [first, second] = screen.getAllByRole("checkbox");

    await user.click(first);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    await user.click(second);
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();

    await user.click(first);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  test("Continue calls onContinue once and does not close", async () => {
    const user = userEvent.setup();
    const { onContinue, onClose } = renderModal();
    for (const box of screen.getAllByRole("checkbox")) await user.click(box);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  test.each(DISMISS_ACTIONS)("%s closes without continuing", async (_name, dismiss) => {
    const user = userEvent.setup();
    const { onContinue, onClose } = renderModal();
    for (const box of screen.getAllByRole("checkbox")) await user.click(box);

    await dismiss(user);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});
