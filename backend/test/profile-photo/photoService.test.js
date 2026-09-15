import { uploadProfilePhoto } from "../../functions/profile-photo/business/service/photoService.js";
import { BadRequestException } from "../../functions/profile-photo/util/exception/badRequestException.js";

const mockUploadPhoto = jest.fn();
jest.mock("../../functions/profile-photo/data/photoRepository.js", () => ({
  uploadPhoto: (...args) => mockUploadPhoto(...args),
}));

describe("photoService - uploadProfilePhoto", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("throws when image is missing", async () => {
    await expect(uploadProfilePhoto("user-123", undefined)).rejects.toThrow(BadRequestException);
    expect(mockUploadPhoto).not.toHaveBeenCalled();
  });

  test("throws when image is not a base64 data URL", async () => {
    await expect(uploadProfilePhoto("user-123", "https://example.com/photo.jpg")).rejects.toThrow(
      BadRequestException
    );
    expect(mockUploadPhoto).not.toHaveBeenCalled();
  });

  test("throws for an unsupported mime type", async () => {
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from("<svg></svg>").toString("base64")}`;
    await expect(uploadProfilePhoto("user-123", svgDataUrl)).rejects.toThrow(BadRequestException);
    expect(mockUploadPhoto).not.toHaveBeenCalled();
  });

  test("throws when the decoded image exceeds 5MB", async () => {
    const oversizedBase64 = Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64");
    const dataUrl = `data:image/png;base64,${oversizedBase64}`;
    await expect(uploadProfilePhoto("user-123", dataUrl)).rejects.toThrow("Image must be 5MB or smaller.");
    expect(mockUploadPhoto).not.toHaveBeenCalled();
  });

  test("uploads a valid image and returns the fileUrl from the repository", async () => {
    mockUploadPhoto.mockResolvedValue(
      "https://accommodation.s3.eu-north-1.amazonaws.com/images/profile/user-123/abc.png"
    );
    const dataUrl = `data:image/png;base64,${Buffer.from("img-bytes").toString("base64")}`;

    const result = await uploadProfilePhoto("user-123", dataUrl);

    expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
    const [key, buffer, contentType] = mockUploadPhoto.mock.calls[0];
    expect(key).toMatch(/^images\/profile\/user-123\/.+\.png$/);
    expect(buffer).toEqual(Buffer.from("img-bytes"));
    expect(contentType).toBe("image/png");
    expect(result).toEqual({
      fileUrl: "https://accommodation.s3.eu-north-1.amazonaws.com/images/profile/user-123/abc.png",
    });
  });
});
