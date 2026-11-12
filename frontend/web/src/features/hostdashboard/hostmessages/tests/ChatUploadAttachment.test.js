/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatUploadAttachment from "../components/chatUploadAttachment";

jest.mock("../hooks/useUploadURL", () => ({
  useUploadUrl: () => ({ getUploadUrl: jest.fn() }),
}));

describe("ChatUploadAttachment", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("exposes the attach button by its accessible name", () => {
    render(<ChatUploadAttachment onUploadComplete={jest.fn()} />);

    const button = screen.getByRole("button", { name: "Attach file" });

    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("title", "Attach file");
  });

  test("shows an icon instead of a plus sign", () => {
    render(<ChatUploadAttachment onUploadComplete={jest.fn()} />);

    const button = screen.getByRole("button", { name: "Attach file" });

    expect(button).not.toHaveTextContent("+");
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  test("opens the file picker of its own hidden input when clicked", () => {
    const { container } = render(<ChatUploadAttachment onUploadComplete={jest.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    const pickerSpy = jest.spyOn(fileInput, "click");

    fireEvent.click(screen.getByRole("button", { name: "Attach file" }));

    expect(pickerSpy).toHaveBeenCalledTimes(1);
  });
});
