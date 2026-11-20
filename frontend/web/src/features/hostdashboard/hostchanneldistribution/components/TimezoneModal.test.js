import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimezoneModal from "./TimezoneModal";
import { DISMISS_ACTIONS } from "./modalTestHelpers";

const OPTIONS = ["Asia/Jakarta", "America/Los_Angeles"];

const renderModal = () => {
  const onContinue = jest.fn();
  const onClose = jest.fn();
  render(<TimezoneModal options={OPTIONS} onContinue={onContinue} onClose={onClose} />);
  return { onContinue, onClose };
};

describe("TimezoneModal", () => {
  test("offers the options after a placeholder, labelled from the id, and starts with Continue disabled", () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "Choose a timezone" })).toBeInTheDocument();
    const select = screen.getByRole("combobox", { name: "Timezone" });
    expect(select).toHaveValue("");
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      "Choose a timezone",
      "Asia/Jakarta",
      "America/Los Angeles",
    ]);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  test("Continue is enabled once a zone is picked, and disabled again when the placeholder is picked back", async () => {
    const user = userEvent.setup();
    renderModal();
    const select = screen.getByRole("combobox", { name: "Timezone" });

    await user.selectOptions(select, "Asia/Jakarta");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();

    await user.selectOptions(select, "");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  test("Continue hands over the id of the picked zone, not its label, and does not close", async () => {
    const user = userEvent.setup();
    const { onContinue, onClose } = renderModal();
    await user.selectOptions(screen.getByRole("combobox", { name: "Timezone" }), "America/Los_Angeles");

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith("America/Los_Angeles");
    expect(onClose).not.toHaveBeenCalled();
  });

  test.each(DISMISS_ACTIONS)("%s closes without continuing", async (_name, dismiss) => {
    const user = userEvent.setup();
    const { onContinue, onClose } = renderModal();
    await user.selectOptions(screen.getByRole("combobox", { name: "Timezone" }), "Asia/Jakarta");

    await dismiss(user);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});
