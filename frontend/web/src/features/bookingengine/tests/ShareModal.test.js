import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShareModal from "../components/ShareModal";

jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  createPortal: (node) => node,
}));

jest.mock("@mui/icons-material/Close", () => () => <span data-testid="close-icon" />);
jest.mock("@mui/icons-material/IosShare", () => () => <span data-testid="share-icon" />);
jest.mock("@mui/icons-material/WhatsApp", () => () => <span />);
jest.mock("@mui/icons-material/Facebook", () => () => <span />);
jest.mock("@mui/icons-material/Twitter", () => () => <span />);
jest.mock("@mui/icons-material/Email", () => () => <span />);
jest.mock("@mui/icons-material/Sms", () => () => <span />);
jest.mock("@mui/icons-material/Telegram", () => () => <span />);
jest.mock("@mui/icons-material/ContentCopy", () => () => <span data-testid="copy-icon" />);
jest.mock("@mui/icons-material/Check", () => () => <span data-testid="check-icon" />);

const TEST_URL = "https://domits.com/listingdetails?ID=abc123";
const TEST_TITLE = "Test Villa";

describe("ShareModal", () => {
  let onClose;

  beforeEach(() => {
    onClose = jest.fn();
  });

  test("renders title, platform buttons and copy section", () => {
    render(<ShareModal url={TEST_URL} title={TEST_TITLE} onClose={onClose} />);

    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Facebook")).toBeInTheDocument();
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Telegram")).toBeInTheDocument();
    expect(screen.getByText("SMS")).toBeInTheDocument();
    expect(screen.getByText("Copy page link")).toBeInTheDocument();
  });

  test("calls onClose when close button is clicked", () => {
    render(<ShareModal url={TEST_URL} title={TEST_TITLE} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Close share modal"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when backdrop is clicked", () => {
    render(<ShareModal url={TEST_URL} title={TEST_TITLE} onClose={onClose} />);

    const backdrop = document.querySelector(".share-modal-backdrop");
    fireEvent.mouseDown(backdrop, { target: backdrop, currentTarget: backdrop });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when Escape key is pressed", () => {
    render(<ShareModal url={TEST_URL} title={TEST_TITLE} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("does not call onClose when a non-Escape key is pressed", () => {
    render(<ShareModal url={TEST_URL} title={TEST_TITLE} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Enter" });

    expect(onClose).not.toHaveBeenCalled();
  });

  test("shows copy icon initially and check icon after copy", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });

    render(<ShareModal url={TEST_URL} title={TEST_TITLE} onClose={onClose} />);

    expect(screen.getByTestId("copy-icon")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Copy link"));

    await waitFor(() => expect(screen.getByTestId("check-icon")).toBeInTheDocument());
  });

  test("truncates URLs longer than 45 characters in the display", () => {
    const longUrl = "https://domits.com/listingdetails?ID=verylongidthatexceedsfortyfivecharacters";

    render(<ShareModal url={longUrl} title={TEST_TITLE} onClose={onClose} />);

    const displayedUrl = screen.getByTitle(longUrl).textContent;
    expect(displayedUrl.endsWith("…")).toBe(true);
    expect(displayedUrl.length).toBeLessThanOrEqual(46);
  });

  test("uses default title when none is provided", () => {
    render(<ShareModal url={TEST_URL} onClose={onClose} />);

    expect(screen.getByText("Share")).toBeInTheDocument();
  });
});
