import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Auth } from "aws-amplify";
import { confirmEmailChange } from "../../features/guestdashboard/emailSettings";
import useUserProfile from "../../hooks/useUserProfile";

jest.mock("aws-amplify");

jest.mock("../../features/guestdashboard/emailSettings", () => ({
  confirmEmailChange: jest.fn(),
}));

jest.mock("react-select-country-list", () => () => ({
  getLabels: () => ["Netherlands", "Germany", "France", "Spain"],
}));

const MOCK_COGNITO_USER = {
  username: "user-abc-123",
  attributes: {
    email: "test@example.com",
    given_name: "John",
    family_name: "Doe",
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
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.fetch = jest.fn();
    globalThis.alert = jest.fn();
    Auth.currentAuthenticatedUser.mockImplementation(() => new Promise(() => {}));
    Auth.getPreferredMFA.mockResolvedValue("NOMFA");
    Auth.updateUserAttributes.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── Initial state ────────────────────────────────────────────────────────

  test("all user fields start as empty strings before fetch resolves", () => {
    Auth.currentAuthenticatedUser.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useUserProfile());

    expect(result.current.user.email).toBe("");
    expect(result.current.user.firstName).toBe("");
    expect(result.current.user.lastName).toBe("");
    expect(result.current.user.nationality).toBe("");
    expect(result.current.isVerifying).toBe(false);
    expect(result.current.dateOfBirthError).toBe("");
    expect(result.current.nationalityError).toBe("");
    expect(result.current.emailError).toBe("");
    expect(result.current.emailSuccess).toBe(false);
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
    expect(result.current.user.firstName).toBe("John");
    expect(result.current.user.lastName).toBe("Doe");
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
      result.current.onInputChange({ target: { name: "firstName", value: "Jane" } });
    });
    expect(result.current.tempUser.firstName).toBe("Jane");
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

  test("onDateOfBirthChange stores the selected date as DD-MM-YYYY", () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onDateOfBirthChange(new Date(1990, 0, 1));
    });
    expect(result.current.tempUser.dateOfBirth).toBe("01-01-1990");
  });

  test("onDateOfBirthChange clears the field when passed a null date", () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onDateOfBirthChange(new Date(1990, 0, 1));
    });
    act(() => {
      result.current.onDateOfBirthChange(null);
    });
    expect(result.current.tempUser.dateOfBirth).toBe("");
  });

  test("onDateOfBirthChange clears a previous dateOfBirthError", async () => {
    const { result } = renderHook(() => useUserProfile());
    await act(async () => {
      await result.current.onSaveUserDateOfBirth();
    });
    expect(result.current.dateOfBirthError).not.toBe("");

    act(() => {
      result.current.onDateOfBirthChange(new Date(1990, 0, 1));
    });
    expect(result.current.dateOfBirthError).toBe("");
  });

  test("onCountryCodeChange updates selectedCountryCode", () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onCountryCodeChange({ target: { value: "+44" } });
    });
    expect(result.current.selectedCountryCode).toBe("+44");
  });

  // ─── Title / Sex (deferred save) ──────────────────────────────────────────

  const testDeferredField = ({ label, changeKey, saveKey, attrKey, value, userKey }) => {
    test(`${changeKey} updates tempUser.${userKey} without saving immediately`, () => {
      const { result } = renderHook(() => useUserProfile());
      act(() => {
        result.current[changeKey]({ target: { value } });
      });
      expect(result.current.tempUser[userKey]).toBe(value);
      expect(result.current.user[userKey]).toBe("");
      expect(Auth.updateUserAttributes).not.toHaveBeenCalled();
    });

    test(`${saveKey} saves the pending ${label} and updates user state`, async () => {
      Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
      const { result } = renderHook(() => useUserProfile());
      act(() => {
        result.current[changeKey]({ target: { value } });
      });
      let saveResult;
      await act(async () => {
        saveResult = await result.current[saveKey]();
      });
      expect(Auth.updateUserAttributes).toHaveBeenCalledWith(
        MOCK_COGNITO_USER,
        expect.objectContaining({ [attrKey]: value })
      );
      expect(result.current.user[userKey]).toBe(value);
      expect(saveResult).toBe(true);
    });

    test(`${saveKey} returns false when Auth.updateUserAttributes rejects`, async () => {
      Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
      Auth.updateUserAttributes.mockRejectedValueOnce(new Error("Cognito error"));
      const { result } = renderHook(() => useUserProfile());
      act(() => {
        result.current[changeKey]({ target: { value } });
      });
      let saveResult;
      await act(async () => {
        saveResult = await result.current[saveKey]();
      });
      expect(saveResult).toBe(false);
    });
  };

  testDeferredField({
    label: "title",
    changeKey: "onTitleChange",
    saveKey: "onSaveUserTitle",
    attrKey: "custom:title",
    value: "Ms.",
    userKey: "title",
  });

  testDeferredField({
    label: "sex",
    changeKey: "onSexChange",
    saveKey: "onSaveUserSex",
    attrKey: "gender",
    value: "Female",
    userKey: "sex",
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

  const setFields = (result, fields) => {
    fields.forEach(([name, value]) => {
      act(() => {
        result.current.onInputChange({ target: { name, value } });
      });
    });
  };

  test.each([
    ["first name is empty", [], "Please provide a valid first name."],
    ["first name is whitespace-only", [["firstName", "   "]], "Please provide a valid first name."],
    ["first name contains digits", [["firstName", "John123"]], "Use letters, spaces, hyphens, or apostrophes."],
    [
      "last name contains digits",
      [["firstName", "Jane"], ["lastName", "Doe99"]],
      "Use letters, spaces, hyphens, or apostrophes.",
    ],
  ])("onSaveUserName: shows alert and skips fetch when %s", async (_label, fields, expectedAlert) => {
    const { result } = renderHook(() => useUserProfile());
    setFields(result, fields);
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserName();
    });
    expect(globalThis.alert).toHaveBeenCalledWith(expectedAlert);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(saveResult).toBe(false);
  });

  test.each([
    ["only a first name is provided", [["firstName", "Jane"]], "Jane", ""],
    ["both first and last name are provided", [["firstName", "Jane"], ["lastName", "Doe"]], "Jane", "Doe"],
  ])(
    "onSaveUserName: sends POST and updates user state when %s",
    async (_label, fields, expectedFirst, expectedLast) => {
      Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
      globalThis.fetch.mockResolvedValue({
        json: () => Promise.resolve({ statusCode: 200 }),
      });
      const { result } = renderHook(() => useUserProfile());
      setFields(result, fields);
      let saveResult;
      await act(async () => {
        saveResult = await result.current.onSaveUserName();
      });
      expect(globalThis.fetch).toHaveBeenCalled();
      expect(result.current.user.firstName).toBe(expectedFirst);
      expect(result.current.user.lastName).toBe(expectedLast);
      expect(saveResult).toBe(true);
    }
  );

  test("onSaveUserName: alerts and returns false when the API reports a non-200 status", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    globalThis.fetch.mockResolvedValue({
      json: () => Promise.resolve({ statusCode: 400 }),
    });
    const { result } = renderHook(() => useUserProfile());
    setFields(result, [["firstName", "Jane"]]);
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserName();
    });
    expect(globalThis.alert).toHaveBeenCalledWith("Failed to update name. Please try again.");
    expect(saveResult).toBe(false);
  });

  // ─── Save phone ───────────────────────────────────────────────────────────

  test("onSaveUserPhone: shows alert and skips fetch when phone is empty", async () => {
    const { result } = renderHook(() => useUserProfile());
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserPhone();
    });
    expect(globalThis.alert).toHaveBeenCalledWith("Please enter a phone number.");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(saveResult).toBe(false);
  });

  test("onSaveUserPhone: shows a single alert (not a duplicate) when the request throws", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    globalThis.fetch.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onPhoneChange({ target: { value: "612345678" } });
    });
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserPhone();
    });
    expect(globalThis.alert).toHaveBeenCalledWith("Failed to update phone number. Please try again.");
    expect(globalThis.alert).toHaveBeenCalledTimes(1);
    expect(saveResult).toBe(false);
  });

  // ─── Save email ───────────────────────────────────────────────────────────

  test("onSaveUserEmail: sets emailError when tempUser email is empty", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    const { result } = renderHook(() => useUserProfile());
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserEmail();
    });
    expect(result.current.emailError).toBe("Please provide a valid email address.");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(saveResult).toBe(false);
  });

  test("onSaveUserEmail: sets emailError for malformed email", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "email", value: "not-an-email" } });
    });
    await act(async () => {
      await result.current.onSaveUserEmail();
    });
    expect(result.current.emailError).toBe("Please provide a valid email address.");
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
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserEmail();
    });
    expect(result.current.isVerifying).toBe(true);
    expect(result.current.emailError).toBe("");
    expect(saveResult).toBe(true);
  });

  test("onSaveUserEmail: sets emailError when API reports email already in use, even on a 400 response", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "This email address is already in use." }),
    });
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "email", value: "taken@example.com" } });
    });
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserEmail();
    });
    expect(result.current.emailError).toBe("This email address is already in use.");
    expect(saveResult).toBe(false);
  });

  test("onSaveUserEmail: sets a generic emailError when the response is not ok and carries no known message", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: "Internal Server Error" }),
    });
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "email", value: "new@example.com" } });
    });
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserEmail();
    });
    expect(result.current.emailError).toBe("Failed to update email. Please try again later.");
    expect(saveResult).toBe(false);
  });

  const getIntoEmailVerifyingState = async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    globalThis.fetch.mockResolvedValueOnce({
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
    return result;
  };

  test("onSaveUserEmail in verifying state: sets emailError on an incorrect verification code", async () => {
    confirmEmailChange.mockResolvedValue({ success: false });
    const result = await getIntoEmailVerifyingState();

    act(() => {
      result.current.onVerificationInputChange({ target: { value: "000000" } });
    });
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserEmail();
    });

    expect(result.current.emailError).toBe("Incorrect verification code.");
    expect(result.current.isVerifying).toBe(true);
    expect(saveResult).toBe(false);
  });

  test("onSaveUserEmail in verifying state: calls confirmEmailChange with the entered code and shows success", async () => {
    confirmEmailChange.mockResolvedValue({ success: true });
    const result = await getIntoEmailVerifyingState();
    expect(result.current.isVerifying).toBe(true);

    act(() => {
      result.current.onVerificationInputChange({ target: { value: "123456" } });
    });
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserEmail();
    });

    expect(confirmEmailChange).toHaveBeenCalledWith("123456");
    expect(result.current.user.email).toBe("new@example.com");
    expect(result.current.isVerifying).toBe(false);
    expect(result.current.emailSuccess).toBe(true);
    expect(saveResult).toBe(true);
  });

  // ─── Save date of birth ───────────────────────────────────────────────────

  test("onSaveUserDateOfBirth: sets dateOfBirthError when date is empty", async () => {
    const { result } = renderHook(() => useUserProfile());
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserDateOfBirth();
    });
    expect(result.current.dateOfBirthError).toBe("Please enter a date of birth.");
    expect(Auth.updateUserAttributes).not.toHaveBeenCalled();
    expect(saveResult).toBe(false);
  });

  test("onSaveUserDateOfBirth: sets dateOfBirthError for wrong format", async () => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "dateOfBirth", value: "not-a-date" } });
    });
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserDateOfBirth();
    });
    expect(result.current.dateOfBirthError).toBe("Use format DD-MM-YYYY.");
    expect(saveResult).toBe(false);
  });

  test("onSaveUserDateOfBirth: calls Auth with ISO date and updates user on success", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "dateOfBirth", value: "01-01-1990" } });
    });
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserDateOfBirth();
    });
    expect(Auth.updateUserAttributes).toHaveBeenCalledWith(
      MOCK_COGNITO_USER,
      expect.objectContaining({ birthdate: "1990-01-01" })
    );
    expect(result.current.user.dateOfBirth).toBe("01-01-1990");
    expect(result.current.dateOfBirthError).toBe("");
    expect(saveResult).toBe(true);
  });

  // ─── Save nationality ─────────────────────────────────────────────────────

  test.each([
    ["A", "Nationality must be 2 to 64 characters."],
    ["Dutch123", "Use letters, spaces, hyphens, or apostrophes."],
  ])("onSaveUserNationality: sets nationalityError for %p", async (value, expectedError) => {
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "nationality", value } });
    });
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserNationality();
    });
    expect(result.current.nationalityError).toBe(expectedError);
    expect(Auth.updateUserAttributes).not.toHaveBeenCalled();
    expect(saveResult).toBe(false);
  });

  test("onSaveUserNationality: saves valid nationality and updates user state", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "nationality", value: "German" } });
    });
    let saveResult;
    await act(async () => {
      saveResult = await result.current.onSaveUserNationality();
    });

    expect(Auth.updateUserAttributes).toHaveBeenCalledWith(
      MOCK_COGNITO_USER,
      expect.objectContaining({ "custom:nationality": "German" })
    );
    expect(saveResult).toBe(true);
    expect(result.current.user.nationality).toBe("German");
    expect(result.current.nationalityError).toBe("");
  });

  // ─── Key-press handlers ───────────────────────────────────────────────────

  test("onKeyPressName: triggers save on Enter key", async () => {
    Auth.currentAuthenticatedUser.mockResolvedValue(MOCK_COGNITO_USER);
    globalThis.fetch.mockResolvedValue({ json: () => Promise.resolve({ statusCode: 200 }) });
    const { result } = renderHook(() => useUserProfile());
    act(() => {
      result.current.onInputChange({ target: { name: "firstName", value: "Alice" } });
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
