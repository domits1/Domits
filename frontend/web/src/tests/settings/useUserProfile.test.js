import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Auth } from "aws-amplify";
import useUserProfile from "../../hooks/useUserProfile";

jest.mock("aws-amplify");

jest.mock("../../features/guestdashboard/emailSettings", () => ({
  confirmEmailChange: jest.fn(),
}));

jest.mock("react-select-country-list", () => () => ({
  getLabels: () => ["Netherlands", "Germany", "France", "Spain"],
}));

import { confirmEmailChange } from "../../features/guestdashboard/emailSettings";

const MOCK_COGNITO_USER = {
  username: "user-abc-123",
  attributes: {
    email: "test@example.com",
    given_name: "John",
    address: "123 Main St",
    phone_number: "+31612345678",
    "custom:title": "Mr.",
    birthdate: "1990-12-25",
    "custom:place_of_birth": "Netherlands",
    gender: "Male",
    picture: "https://cdn.example.com/photo.jpg",
    "custom:nationality": "Dutch",
    email_verified: true,
    phone_number_verified: false,
  },
};

describe("useUserProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
    globalThis.alert = jest.fn();
    Auth.currentAuthenticatedUser.mockImplementation(() => new Promise(() => {}));
    Auth.getPreferredMFA.mockResolvedValue("NOMFA");
    Auth.updateUserAttributes.mockResolvedValue({});
  });

  // ─── Initial state ────────────────────────────────────────────────────────

  test("all user fields start as empty strings before fetch resolves", () => {
    Auth.currentAuthenticatedUser.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useUserProfile());

    expect(result.current.user.email).toBe("");
    expect(result.current.user.name).toBe("");
    expect(result.current.user.nationality).toBe("");
    expect(result.current.isVerifying).toBe(false);
    expect(result.current.dateOfBirthError).toBe("");
    expect(result.current.nationalityError).toBe("");
  });

  test("editState fields all start as false", () => {
    Auth.currentAuthenticatedUser.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useUserProfile());

    Object.values(result.current.editState).forEach((value) => {
      expect(value).toBe(false);
    });
  });

  // ─── Data fetching ────────────────────────────────────────────────────────

  test("fetches user data on mount and populates user state from Cognito attributes", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.user.email).toBe("test@example.com"));
    expect(result.current.user.name).toBe("John");
    expect(result.current.user.phone).toBe("+31612345678");
    expect(result.current.user.title).toBe("Mr.");
    expect(result.current.user.sex).toBe("Male");
    expect(result.current.user.picture).toBe("https://cdn.example.com/photo.jpg");
    expect(result.current.user.nationality).toBe("Dutch");
  });

  test("populates authStatus correctly from Cognito attributes", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.authStatus.emailVerified).toBe(true));
    expect(result.current.authStatus.emailVerified).toBe(true);
    expect(result.current.authStatus.phoneVerified).toBe(false);
    expect(result.current.authStatus.preferredMFA).toBe("NOMFA");
  });

  test("handles Auth fetch failure gracefully without throwing", async () => {
    Auth.currentAuthenticatedUser.mockRejectedValue(new Error("Not signed in"));
    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.user.email).toBe(""));
    expect(result.current.user.email).toBe("");
  });

  // ─── Input handlers ───────────────────────────────────────────────────────

  test("onInputChange updates the matching tempUser field", () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "name", value: "Jane" } });
    });
    expect(result.current.tempUser.name).toBe("Jane");
  });

  test("onInputChange clears nationalityError when the nationality field changes", async () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.onInputChange({ target: { name: "nationality", value: "A" } });
    });
    await act(async () => {
      await result.current.onSaveUserNationality();
    });
    expect(result.current.nationalityError).not.toBe("");

    act(() => {
      result.current.onInputChange({ target: { name: "nationality", value: "German" } });
    });
    expect(result.current.nationalityError).toBe("");
  });

  test("onDateOfBirthChange formats the first two entered digits and appends a hyphen", () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onDateOfBirthChange({ target: { value: "01", selectionStart: 2 } });
    });
    expect(result.current.tempUser.dateOfBirth).toBe("01-");
  });

  test("onDateOfBirthChange produces fully formatted DD-MM-YYYY string for 8 digits", () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onDateOfBirthChange({ target: { value: "01011990", selectionStart: 8 } });
    });
    expect(result.current.tempUser.dateOfBirth).toBe("01-01-1990");
  });

  test("onCountryCodeChange updates selectedCountryCode", () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onCountryCodeChange({ target: { value: "+44" } });
    });
    expect(result.current.selectedCountryCode).toBe("+44");
  });

  // ─── Toggle edit state ────────────────────────────────────────────────────

  test("onToggleEditState enables edit mode for a field", () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onToggleEditState("name");
    });
    expect(result.current.editState.name).toBe(true);
  });

  test("onToggleEditState toggles back off on second call", () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onToggleEditState("name");
    });
    act(() => {
      result.current.onToggleEditState("name");
    });
    expect(result.current.editState.name).toBe(false);
  });

  test("onToggleEditState clears dateOfBirthError when toggling dateOfBirth field", async () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onToggleEditState("dateOfBirth");
    });
    await act(async () => {
      await result.current.onSaveUserDateOfBirth();
    });
    expect(result.current.dateOfBirthError).not.toBe("");

    act(() => {
      result.current.onToggleEditState("dateOfBirth");
    });
    expect(result.current.dateOfBirthError).toBe("");
  });

  // ─── Save name ────────────────────────────────────────────────────────────

  test("onSaveUserName: shows alert and skips fetch when name is empty", async () => {
    const { result } = renderHook(() => useUserProfile());
    await act(async () => {
      await result.current.onSaveUserName();
    });
    expect(globalThis.alert).toHaveBeenCalledWith("Please provide a valid name.");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("onSaveUserName: shows alert and skips fetch when name is whitespace-only", async () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "name", value: "   " } });
    });
    await act(async () => {
      await result.current.onSaveUserName();
    });
    expect(globalThis.alert).toHaveBeenCalledWith("Please provide a valid name.");
  });

  test("onSaveUserName: sends POST and updates user.name on success", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    globalThis.fetch.mockResolvedValue({
      json: () => Promise.resolve({ statusCode: 200 }),
    });
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "name", value: "Jane Doe" } });
    });
    await act(async () => {
      await result.current.onSaveUserName();
    });
    expect(globalThis.fetch).toHaveBeenCalled();
    expect(result.current.user.name).toBe("Jane Doe");
  });

  // ─── Save email ───────────────────────────────────────────────────────────

  test("onSaveUserEmail: shows alert when tempUser email is empty", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    const { result } = renderHook(() => useUserProfile());
    await act(async () => {
      await result.current.onSaveUserEmail();
    });
    expect(globalThis.alert).toHaveBeenCalledWith("Please provide a valid email address.");
  });

  test("onSaveUserEmail: shows alert for malformed email", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "email", value: "not-an-email" } });
    });
    await act(async () => {
      await result.current.onSaveUserEmail();
    });
    expect(globalThis.alert).toHaveBeenCalledWith("Please provide a valid email address.");
  });

  test("onSaveUserEmail: sets isVerifying to true when API returns verification message", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ message: "Email update successful, please verify your new email." }),
    });
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "email", value: "new@example.com" } });
    });
    await act(async () => {
      await result.current.onSaveUserEmail();
    });
    expect(result.current.isVerifying).toBe(true);
  });

  test("onSaveUserEmail: shows alert when API reports email already in use", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: "This email address is already in use." }),
    });
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "email", value: "taken@example.com" } });
    });
    await act(async () => {
      await result.current.onSaveUserEmail();
    });
    expect(globalThis.alert).toHaveBeenCalledWith("This email address is already in use.");
  });

  test("onSaveUserEmail in verifying state: calls confirmEmailChange with the entered code", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ message: "Email update successful, please verify your new email." }),
    });
    confirmEmailChange.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.onInputChange({ target: { name: "email", value: "new@example.com" } });
    });
    await act(async () => {
      await result.current.onSaveUserEmail();
    });
    expect(result.current.isVerifying).toBe(true);

    act(() => {
      result.current.onVerificationInputChange({ target: { value: "123456" } });
    });
    await act(async () => {
      await result.current.onSaveUserEmail();
    });

    expect(confirmEmailChange).toHaveBeenCalledWith("123456");
    expect(result.current.user.email).toBe("new@example.com");
  });

  // ─── Save date of birth ───────────────────────────────────────────────────

  test("onSaveUserDateOfBirth: sets dateOfBirthError when date is empty", async () => {
    const { result } = renderHook(() => useUserProfile());
    await act(async () => {
      await result.current.onSaveUserDateOfBirth();
    });
    expect(result.current.dateOfBirthError).toBe("Please enter a date of birth.");
    expect(Auth.updateUserAttributes).not.toHaveBeenCalled();
  });

  test("onSaveUserDateOfBirth: sets dateOfBirthError for wrong format", async () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "dateOfBirth", value: "not-a-date" } });
    });
    await act(async () => {
      await result.current.onSaveUserDateOfBirth();
    });
    expect(result.current.dateOfBirthError).toBe("Use format DD-MM-YYYY.");
  });

  test("onSaveUserDateOfBirth: calls Auth with ISO date and updates user on success", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "dateOfBirth", value: "01-01-1990" } });
    });
    await act(async () => {
      await result.current.onSaveUserDateOfBirth();
    });
    expect(Auth.updateUserAttributes).toHaveBeenCalledWith(
      MOCK_COGNITO_USER,
      expect.objectContaining({ birthdate: "1990-01-01" })
    );
    expect(result.current.user.dateOfBirth).toBe("01-01-1990");
    expect(result.current.dateOfBirthError).toBe("");
  });

  // ─── Save nationality ─────────────────────────────────────────────────────

  test("onSaveUserNationality: sets nationalityError for too-short value", async () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "nationality", value: "A" } });
    });
    await act(async () => {
      await result.current.onSaveUserNationality();
    });
    expect(result.current.nationalityError).toBe("Nationality must be 2 to 64 characters.");
    expect(Auth.updateUserAttributes).not.toHaveBeenCalled();
  });

  test("onSaveUserNationality: sets nationalityError for value with invalid characters", async () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "nationality", value: "Dutch123" } });
    });
    await act(async () => {
      await result.current.onSaveUserNationality();
    });
    expect(result.current.nationalityError).toBe("Use letters, spaces, hyphens, or apostrophes.");
  });

  test("onSaveUserNationality: saves valid nationality and updates user state", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "nationality", value: "German" } });
    });
    await act(async () => {
      await result.current.onSaveUserNationality();
    });

    expect(Auth.updateUserAttributes).toHaveBeenCalledWith(
      MOCK_COGNITO_USER,
      expect.objectContaining({ "custom:nationality": "German" })
    );
    expect(result.current.user.nationality).toBe("German");
    expect(result.current.nationalityError).toBe("");
  });

  // ─── Key-press handlers ───────────────────────────────────────────────────

  test("onKeyPressName: triggers save on Enter key", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    globalThis.fetch.mockResolvedValue({ json: () => Promise.resolve({ statusCode: 200 }) });
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "name", value: "Alice" } });
    });
    await act(async () => {
      result.current.onKeyPressName({ key: "Enter" });
      await Promise.resolve();
    });
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  test("onKeyPressName: does not trigger save for non-Enter keys", async () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onKeyPressName({ key: "a" });
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
