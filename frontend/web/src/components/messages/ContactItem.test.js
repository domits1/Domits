/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import ContactItem from "./ContactItem";

jest.mock("./domits-logo.jpg", () => "domits-logo.jpg");

describe("ContactItem profile photo", () => {
  test("falls back to the Domits logo when the profile photo does not load", () => {
    render(<ContactItem contact={{ givenName: "Srinath", profileImage: "https://example.com/broken.jpg" }} />);

    const photo = screen.getByRole("img");
    fireEvent.error(photo);

    expect(photo).toHaveAttribute("src", "domits-logo.jpg");
  });
});
