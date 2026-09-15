import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Auth } from "aws-amplify";
import usePhotoUpload from "../../hooks/usePhotoUpload";
import * as profileUpload from "../../components/settings/api/profileUpload";
import { PROFILE_PHOTO_MAX_SIZE } from "../../components/settings/constants";

jest.mock("aws-amplify");
jest.mock("../../components/settings/api/profileUpload");

describe("usePhotoUpload", () => {
  let mockSetUser;

  beforeEach(() => {
    mockSetUser = jest.fn();
    jest.clearAllMocks();
    Auth.currentSession.mockResolvedValue({
      getAccessToken: () => ({ getJwtToken: () => "mock-access-token" }),
    });
  });

  test("initial state: photoError/photoSuccess are empty and isUploadingPhoto/isRemovingPhoto are false", () => {
    const { result } = renderHook(() => usePhotoUpload(mockSetUser));
    expect(result.current.photoError).toBe("");
    expect(result.current.photoSuccess).toBe("");
    expect(result.current.isUploadingPhoto).toBe(false);
    expect(result.current.isRemovingPhoto).toBe(false);
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

  const performSuccessfulUpload = async () => {
    const mockCognitoUser = { username: "user-123" };
    const fileUrl = "https://accommodation.s3.eu-north-1.amazonaws.com/images/profile/user-123/abc.jpg";
    Auth.currentAuthenticatedUser.mockResolvedValue(mockCognitoUser);
    Auth.updateUserAttributes.mockResolvedValue({});
    profileUpload.uploadProfilePhoto.mockResolvedValue({ fileUrl });

    const { result } = renderHook(() => usePhotoUpload(mockSetUser));
    const file = new File(["img-data"], "photo.jpg", { type: "image/jpeg" });
    await act(async () => {
      await result.current.onPhotoInputChange({ target: { files: [file] } });
    });

    return { result, mockCognitoUser, fileUrl };
  };

  test("onPhotoInputChange: successful upload updates user state and Cognito picture attribute", async () => {
    const { result, mockCognitoUser, fileUrl } = await performSuccessfulUpload();

    expect(profileUpload.uploadProfilePhoto).toHaveBeenCalledWith(
      "mock-access-token",
      expect.stringMatching(/^data:image\/jpeg;base64,/)
    );
    expect(Auth.updateUserAttributes).toHaveBeenCalledWith(mockCognitoUser, { picture: fileUrl });
    expect(mockSetUser).toHaveBeenCalled();
    expect(result.current.photoError).toBe("");
    expect(result.current.photoSuccess).toBe("uploaded");
    expect(result.current.isUploadingPhoto).toBe(false);
  });

  test("onPhotoInputChange: photoSuccess clears itself after the display timeout", async () => {
    jest.useFakeTimers();
    const { result } = await performSuccessfulUpload();
    expect(result.current.photoSuccess).toBe("uploaded");

    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(result.current.photoSuccess).toBe("");
    jest.useRealTimers();
  });

  test("onPhotoInputChange: sets error and clears uploading flag when the upload request fails", async () => {
    profileUpload.uploadProfilePhoto.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => usePhotoUpload(mockSetUser));
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.onPhotoInputChange({ target: { files: [file] } });
    });

    expect(result.current.photoError).toBe("Failed to upload photo. Please try again.");
    expect(result.current.photoSuccess).toBe("");
    expect(result.current.isUploadingPhoto).toBe(false);
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  test("onPhotoInputChange: sets error when upload response is missing fileUrl", async () => {
    profileUpload.uploadProfilePhoto.mockResolvedValue({ fileUrl: null });

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
    expect(result.current.photoSuccess).toBe("removed");
    expect(result.current.isRemovingPhoto).toBe(false);
  });

  test("onPhotoRemove: sets error when Auth call fails", async () => {
    Auth.currentAuthenticatedUser.mockRejectedValue(new Error("Auth error"));

    const { result } = renderHook(() => usePhotoUpload(mockSetUser));

    await act(async () => {
      await result.current.onPhotoRemove();
    });

    expect(result.current.photoError).toBe("Failed to remove photo. Please try again.");
    expect(result.current.isRemovingPhoto).toBe(false);
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  test("onPhotoRemove: isRemovingPhoto is true while the removal is in flight and false once settled", async () => {
    const mockCognitoUser = { username: "user-123" };
    let resolveAuth;
    Auth.currentAuthenticatedUser.mockReturnValue(new Promise((resolve) => (resolveAuth = resolve)));
    Auth.updateUserAttributes.mockResolvedValue({});

    const { result } = renderHook(() => usePhotoUpload(mockSetUser));

    let removePromise;
    act(() => {
      removePromise = result.current.onPhotoRemove();
    });
    expect(result.current.isRemovingPhoto).toBe(true);
    expect(result.current.isUploadingPhoto).toBe(false);

    await act(async () => {
      resolveAuth(mockCognitoUser);
      await removePromise;
    });
    expect(result.current.isRemovingPhoto).toBe(false);
  });
});
