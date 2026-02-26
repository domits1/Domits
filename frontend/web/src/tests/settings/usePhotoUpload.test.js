import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Auth } from "aws-amplify";
import usePhotoUpload from "../../hooks/usePhotoUpload";
import * as profileUpload from "../../components/settings/api/profileUpload";
import { PROFILE_PHOTO_MAX_SIZE } from "../../components/settings/constants";

jest.mock("aws-amplify");
jest.mock("../../components/settings/api/profileUpload");

describe.skip("usePhotoUpload", () => {
  let mockSetUser;

  beforeEach(() => {
    mockSetUser = jest.fn();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test("initial state: photoError is empty and isUploadingPhoto is false", () => {
    const { result } = renderHook(() => usePhotoUpload(mockSetUser));
    expect(result.current.photoError).toBe("");
    expect(result.current.isUploadingPhoto).toBe(false);
  });

  test("onPhotoInputChange: does nothing when files array is empty", async () => {
    const { result } = renderHook(() => usePhotoUpload(mockSetUser));
    await act(async () => {
      await result.current.onPhotoInputChange({ target: { files: [] } });
    });
    expect(result.current.photoError).toBe("");
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  test("onPhotoInputChange: sets error for non-image MIME type", async () => {
    const { result } = renderHook(() => usePhotoUpload(mockSetUser));
    const file = new File(["content"], "document.pdf", { type: "application/pdf" });
    await act(async () => {
      await result.current.onPhotoInputChange({ target: { files: [file] } });
    });
    expect(result.current.photoError).toBe("Please select an image file.");
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  test("onPhotoInputChange: sets error when file size exceeds 5 MB limit", async () => {
    const { result } = renderHook(() => usePhotoUpload(mockSetUser));
    const oversizedFile = new File(["x"], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(oversizedFile, "size", { value: PROFILE_PHOTO_MAX_SIZE + 1 });
    await act(async () => {
      await result.current.onPhotoInputChange({ target: { files: [oversizedFile] } });
    });
    expect(result.current.photoError).toBe("Image must be 5MB or smaller.");
  });

  test("onPhotoInputChange: successful upload updates user state and Cognito picture attribute", async () => {
    const mockCognitoUser = { username: "user-123" };
    Auth.currentAuthenticatedUser.mockResolvedValue(mockCognitoUser);
    Auth.updateUserAttributes.mockResolvedValue({});
    profileUpload.getProfileUploadUrl.mockResolvedValue({
      uploadUrl: "https://s3.example.com/upload",
      fields: { key: "profile/user-123.jpg", "Content-Type": "image/jpeg" },
      fileUrl: "https://s3.example.com/profile/user-123.jpg",
    });
    global.fetch.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => usePhotoUpload(mockSetUser));
    const file = new File(["img-data"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.onPhotoInputChange({ target: { files: [file] } });
    });

    expect(profileUpload.getProfileUploadUrl).toHaveBeenCalledWith("image/jpeg");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://s3.example.com/upload",
      expect.objectContaining({ method: "POST" })
    );
    expect(Auth.updateUserAttributes).toHaveBeenCalledWith(mockCognitoUser, {
      picture: "https://s3.example.com/profile/user-123.jpg",
    });
    expect(mockSetUser).toHaveBeenCalled();
    expect(result.current.photoError).toBe("");
    expect(result.current.isUploadingPhoto).toBe(false);
  });

  test("onPhotoInputChange: sets error and clears uploading flag when presigned URL request fails", async () => {
    profileUpload.getProfileUploadUrl.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => usePhotoUpload(mockSetUser));
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.onPhotoInputChange({ target: { files: [file] } });
    });

    expect(result.current.photoError).toBe("Failed to upload photo. Please try again.");
    expect(result.current.isUploadingPhoto).toBe(false);
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  test("onPhotoInputChange: sets error when S3 PUT returns non-ok response", async () => {
    profileUpload.getProfileUploadUrl.mockResolvedValue({
      uploadUrl: "https://s3.example.com/upload",
      fields: { key: "some-key" },
      fileUrl: "https://s3.example.com/photo.jpg",
    });
    global.fetch.mockResolvedValue({ ok: false });

    const { result } = renderHook(() => usePhotoUpload(mockSetUser));
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.onPhotoInputChange({ target: { files: [file] } });
    });

    expect(result.current.photoError).toBe("Failed to upload photo. Please try again.");
    expect(result.current.isUploadingPhoto).toBe(false);
  });

  test("onPhotoInputChange: sets error when upload response is missing required fields", async () => {
    profileUpload.getProfileUploadUrl.mockResolvedValue({
      uploadUrl: null,
      fields: null,
      fileUrl: null,
    });

    const { result } = renderHook(() => usePhotoUpload(mockSetUser));
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.onPhotoInputChange({ target: { files: [file] } });
    });

    expect(result.current.photoError).toBe("Failed to upload photo. Please try again.");
  });

  test("onPhotoRemove: clears picture in Cognito and calls setUser with empty picture", async () => {
    const mockCognitoUser = { username: "user-123" };
    Auth.currentAuthenticatedUser.mockResolvedValue(mockCognitoUser);
    Auth.updateUserAttributes.mockResolvedValue({});

    const { result } = renderHook(() => usePhotoUpload(mockSetUser));

    await act(async () => {
      await result.current.onPhotoRemove();
    });

    expect(Auth.updateUserAttributes).toHaveBeenCalledWith(mockCognitoUser, { picture: "" });
    expect(mockSetUser).toHaveBeenCalled();
    const updater = mockSetUser.mock.calls[0][0];
    expect(updater({ picture: "old-url.jpg" })).toEqual(expect.objectContaining({ picture: "" }));
    expect(result.current.photoError).toBe("");
    expect(result.current.isUploadingPhoto).toBe(false);
  });

  test("onPhotoRemove: sets error when Auth call fails", async () => {
    Auth.currentAuthenticatedUser.mockRejectedValue(new Error("Auth error"));

    const { result } = renderHook(() => usePhotoUpload(mockSetUser));

    await act(async () => {
      await result.current.onPhotoRemove();
    });

    expect(result.current.photoError).toBe("Failed to remove photo. Please try again.");
    expect(result.current.isUploadingPhoto).toBe(false);
    expect(mockSetUser).not.toHaveBeenCalled();
  });
});
