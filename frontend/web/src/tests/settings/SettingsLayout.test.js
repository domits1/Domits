import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SettingsLayout from "../../components/settings/SettingsLayout";

describe("SettingsLayout Component", () => {
  test("renders the Settings heading", () => {
    render(
      <SettingsLayout>
        <p>Child content</p>
      </SettingsLayout>
    );
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
  });

  test("renders children inside the layout", () => {
    render(
      <SettingsLayout>
        <p>Child content</p>
      </SettingsLayout>
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  test("root element has page-body and settings-page classes", () => {
    const { container } = render(
      <SettingsLayout>
        <span>content</span>
      </SettingsLayout>
    );
    expect(container.firstChild).toHaveClass("page-body");
    expect(container.firstChild).toHaveClass("settings-page");
  });

  test("renders multiple children", () => {
    render(
      <SettingsLayout>
        <p>First</p>
        <p>Second</p>
      </SettingsLayout>
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
