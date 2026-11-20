/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { mdiLoading, mdiPaperclip } from "@mdi/js";
import ChatUploadAttachment from "../components/chatUploadAttachment";

const mockGetUploadUrl = jest.fn();

jest.mock("../hooks/useUploadURL", () => ({
  useUploadUrl: () => ({ getUploadUrl: mockGetUploadUrl }),
}));

const UPLOAD_TARGET = {
  uploadUrl: "https://upload.example.com",
  fields: { key: "abc" },
  fileUrl: "https://files.example.com/photo.jpg",
};

const photo = new File(["x"], "photo.jpg", { type: "image/jpeg" });

const renderAttachment = (props = {}) => {
  const onUploadComplete = jest.fn();
  const onUploadError = jest.fn();
  const view = render(<ChatUploadAttachment onUploadComplete={onUploadComplete} onUploadError={onUploadError} {...props} />);
  return { ...view, onUploadComplete, onUploadError };
};

const attachButton = () => screen.getByRole("button", { name: "Attach file" });
const iconPath = () => attachButton().querySelector("svg path").getAttribute("d");
const dropPhoto = () => fireEvent.drop(attachButton(), { dataTransfer: { files: [photo] } });

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const PREVIEW_URL = "blob:http://localhost/local-photo";
const report = (patch = {}) => ({
  url: UPLOAD_TARGET.fileUrl,
  name: "photo.jpg",
  type: "image/jpeg",
  previewUrl: PREVIEW_URL,
  ...patch,
});

describe("ChatUploadAttachment", () => {
  const originalCreateObjectURL = URL.createObjectURL;

  beforeEach(() => {
    mockGetUploadUrl.mockReset();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => "" });
    URL.createObjectURL = jest.fn(() => PREVIEW_URL);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    jest.restoreAllMocks();
  });

  test("exposes the attach button by its accessible name", () => {
    renderAttachment();

    expect(attachButton()).toHaveAttribute("type", "button");
    expect(attachButton()).toHaveAttribute("title", "Attach file");
  });

  test("shows an icon instead of a plus sign", () => {
    renderAttachment();

    expect(attachButton()).not.toHaveTextContent("+");
    expect(iconPath()).toBe(mdiPaperclip);
  });

  test("opens the file picker of its own hidden input when clicked", () => {
    const { container } = renderAttachment();
    const pickerSpy = jest.spyOn(container.querySelector('input[type="file"]'), "click");

    fireEvent.click(attachButton());

    expect(pickerSpy).toHaveBeenCalledTimes(1);
  });

  test("reports the uploaded file url on success", async () => {
    mockGetUploadUrl.mockResolvedValue(UPLOAD_TARGET);
    const { onUploadComplete, onUploadError } = renderAttachment();

    dropPhoto();

    await waitFor(() => expect(onUploadComplete).toHaveBeenCalledWith(report()));
    expect(onUploadError).not.toHaveBeenCalled();
  });

  describe("local preview", () => {
    test("keeps a local preview of an image next to its uploaded url", async () => {
      mockGetUploadUrl.mockResolvedValue(UPLOAD_TARGET);
      const { onUploadComplete } = renderAttachment();

      dropPhoto();

      await waitFor(() => expect(onUploadComplete).toHaveBeenCalledTimes(1));
      expect(URL.createObjectURL).toHaveBeenCalledWith(photo);
      expect(onUploadComplete.mock.calls[0][0]).toEqual(report());
    });

    test("never uses the local preview as the uploaded url", async () => {
      mockGetUploadUrl.mockResolvedValue(UPLOAD_TARGET);
      const { onUploadComplete } = renderAttachment();

      dropPhoto();

      await waitFor(() => expect(onUploadComplete).toHaveBeenCalledTimes(1));
      expect(onUploadComplete.mock.calls[0][0].url).toBe(UPLOAD_TARGET.fileUrl);
    });

    test("creates no preview for a file that is not an image", async () => {
      mockGetUploadUrl.mockResolvedValue({ ...UPLOAD_TARGET, fileUrl: "https://files.example.com/lease.pdf" });
      const { onUploadComplete } = renderAttachment();
      const lease = new File(["x"], "lease.pdf", { type: "application/pdf" });

      fireEvent.drop(attachButton(), { dataTransfer: { files: [lease] } });

      await waitFor(() => expect(onUploadComplete).toHaveBeenCalledTimes(1));
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(onUploadComplete.mock.calls[0][0]).toEqual(
        report({ url: "https://files.example.com/lease.pdf", name: "lease.pdf", type: "application/pdf", previewUrl: null })
      );
    });

    test("creates no preview when the upload fails", async () => {
      mockGetUploadUrl.mockResolvedValue({});
      const { onUploadError } = renderAttachment();

      dropPhoto();

      await waitFor(() => expect(onUploadError).toHaveBeenCalledTimes(1));
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    test("creates no preview for an upload that finishes after it was unmounted", async () => {
      const pendingUrl = deferred();
      mockGetUploadUrl.mockReturnValue(pendingUrl.promise);
      const { unmount } = renderAttachment();

      dropPhoto();
      unmount();
      await act(async () => {
        pendingUrl.resolve(UPLOAD_TARGET);
      });

      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    test("still reports the upload when the browser cannot create a preview", async () => {
      URL.createObjectURL = undefined;
      mockGetUploadUrl.mockResolvedValue(UPLOAD_TARGET);
      const { onUploadComplete } = renderAttachment();

      dropPhoto();

      await waitFor(() => expect(onUploadComplete).toHaveBeenCalledWith(report({ previewUrl: null })));
    });
  });

  test("shows a spinner and disables the button while the upload runs, then restores it", async () => {
    const pendingUrl = deferred();
    mockGetUploadUrl.mockReturnValue(pendingUrl.promise);
    renderAttachment();

    dropPhoto();

    await waitFor(() => expect(attachButton()).toBeDisabled());
    expect(attachButton()).toHaveAttribute("aria-busy", "true");
    expect(iconPath()).toBe(mdiLoading);

    await act(async () => {
      pendingUrl.resolve(UPLOAD_TARGET);
    });

    await waitFor(() => expect(attachButton()).toBeEnabled());
    expect(attachButton()).not.toHaveAttribute("aria-busy", "true");
    expect(iconPath()).toBe(mdiPaperclip);
  });

  test("ignores a second file dropped while an upload is running", async () => {
    const pendingUrl = deferred();
    mockGetUploadUrl.mockReturnValue(pendingUrl.promise);
    renderAttachment();

    dropPhoto();
    dropPhoto();

    expect(mockGetUploadUrl).toHaveBeenCalledTimes(1);
    await act(async () => {
      pendingUrl.resolve(UPLOAD_TARGET);
    });
  });

  test("does not report an upload that finishes after it was unmounted", async () => {
    const pendingUrl = deferred();
    mockGetUploadUrl.mockReturnValue(pendingUrl.promise);
    const { unmount, onUploadComplete, onUploadError } = renderAttachment();

    dropPhoto();
    unmount();
    await act(async () => {
      pendingUrl.resolve(UPLOAD_TARGET);
    });

    expect(onUploadComplete).not.toHaveBeenCalled();
    expect(onUploadError).not.toHaveBeenCalled();
  });

  test("does not report a failure that happens after it was unmounted", async () => {
    const pendingUrl = deferred();
    mockGetUploadUrl.mockReturnValue(pendingUrl.promise);
    const { unmount, onUploadError } = renderAttachment();

    dropPhoto();
    unmount();
    await act(async () => {
      pendingUrl.resolve({});
    });

    expect(onUploadError).not.toHaveBeenCalled();
  });

  describe.each([
    ["the upload url request fails", () => mockGetUploadUrl.mockRejectedValue(new Error("Failed to get upload URL"))],
    ["the upload url response is incomplete", () => mockGetUploadUrl.mockResolvedValue({})],
    [
      "the file transfer fails to connect",
      () => {
        mockGetUploadUrl.mockResolvedValue(UPLOAD_TARGET);
        global.fetch = jest.fn().mockRejectedValue(new Error("network"));
      },
    ],
    [
      "the file transfer is rejected",
      () => {
        mockGetUploadUrl.mockResolvedValue(UPLOAD_TARGET);
        global.fetch = jest.fn().mockResolvedValue({ ok: false, text: async () => "denied" });
      },
    ],
  ])("when %s", (_label, arrange) => {
    test("reports the failure once, restores the button and does not log to the console", async () => {
      arrange();
      const { onUploadComplete, onUploadError } = renderAttachment();

      dropPhoto();

      await waitFor(() => expect(onUploadError).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(attachButton()).toBeEnabled());
      expect(iconPath()).toBe(mdiPaperclip);
      expect(onUploadComplete).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
