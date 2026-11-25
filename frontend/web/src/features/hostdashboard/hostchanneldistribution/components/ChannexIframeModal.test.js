import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChannexIframeModal from "./ChannexIframeModal";

const PLATFORM = { otaCode: "Vrbo", name: "Vrbo" };
const URL_OK = "https://staging.channex.io/mock-connect?token=mock";

const renderModal = (props = {}) => {
  const onClose = jest.fn();
  render(<ChannexIframeModal platform={PLATFORM} url={URL_OK} onClose={onClose} {...props} />);
  return onClose;
};

describe("ChannexIframeModal", () => {
  test("embeds the Channex screen with a title that names the platform", () => {
    renderModal();

    const frame = screen.getByTitle("Connect Vrbo through Channex");
    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute("src", URL_OK);
    expect(screen.getByRole("dialog", { name: "Connect Vrbo through Channex" })).toBeInTheDocument();
  });

  test("sandboxes the frame", () => {
    renderModal();

    const sandbox = screen.getByTitle("Connect Vrbo through Channex").getAttribute("sandbox");
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).toContain("allow-forms");
    // Without top-navigation permission the embedded page cannot send our page somewhere else.
    expect(sandbox).not.toContain("allow-top-navigation");
  });

  test("warns under the frame that disconnecting is done with the switch, and what happens otherwise", () => {
    renderModal();

    expect(
      screen.getByText(
        "To disconnect, use the switch on the Distribution page. If you deactivate here, your listing stays open for sale on Vrbo and you must close your dates there yourself."
      )
    ).toBeInTheDocument();
  });

  test.each([
    ["the X button", (user) => user.click(screen.getByRole("button", { name: "Close" }))],
    ["Escape", (user) => user.keyboard("{Escape}")],
    ["the backdrop", (user) => user.click(screen.getByRole("button", { name: "Close backdrop" }))],
    ["the Done button", (user) => user.click(screen.getByRole("button", { name: "Done" }))],
  ])("closing with %s calls onClose exactly once", async (_name, dismiss) => {
    const user = userEvent.setup();
    const onClose = renderModal();

    await dismiss(user);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["an http address", "http://app.channex.io/connect"],
    ["a javascript: address", "javascript:alert(1)"],
    ["another domain", "https://evil.example.com/connect"],
    ["no address", undefined],
  ])("does not embed %s and says so instead", (_name, url) => {
    renderModal({ url });

    expect(screen.queryByTitle("Connect Vrbo through Channex")).not.toBeInTheDocument();
    expect(screen.getByText("We couldn't open the Channex screen.")).toBeInTheDocument();
  });

  test("can still be closed when the address was refused", async () => {
    const user = userEvent.setup();
    const onClose = renderModal({ url: "http://app.channex.io/connect" });

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
