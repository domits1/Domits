import { uploadProfilePhoto } from "../../components/settings/api/profileUpload";

describe("uploadProfilePhoto", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  test("resolves with the parsed response body on success", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ fileUrl: "https://example.com/photo.jpg" }),
    });

    await expect(uploadProfilePhoto("token", "data:image/jpeg;base64,abc")).resolves.toEqual({
      fileUrl: "https://example.com/photo.jpg",
    });
  });

  test("throws the server's error message on a failed response", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Image must be 4MB or smaller." }),
    });

    await expect(uploadProfilePhoto("token", "data:image/jpeg;base64,abc")).rejects.toThrow(
      "Image must be 4MB or smaller."
    );
  });

  test("falls back to a generic message when the failed response has no message", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(uploadProfilePhoto("token", "data:image/jpeg;base64,abc")).rejects.toThrow(
      "Failed to upload photo"
    );
  });

  test("falls back to a generic message when the failed response body isn't JSON", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("Unexpected token");
      },
    });

    await expect(uploadProfilePhoto("token", "data:image/jpeg;base64,abc")).rejects.toThrow(
      "Failed to upload photo"
    );
  });
});
