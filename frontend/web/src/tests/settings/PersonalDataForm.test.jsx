import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import PersonalDataForm from "../../features/hostdashboard/hostsettings/components/PersonalDataForm";

const baseProps = {
  user: { picture: "" },
  tempUser: {
    firstName: "John",
    lastName: "Doe",
    title: "",
    email: "john@example.com",
    phone: "",
    sex: "",
    dateOfBirth: "",
    placeOfBirth: "",
    nationality: "",
  },
  isUploadingPhoto: false,
  photoError: "",
  photoInputRef: { current: null },
  onPhotoButtonClick: jest.fn(),
  onPhotoRemove: jest.fn(),
  onPhotoInputChange: jest.fn(),
  titleOptions: [""],
  sexOptions: [""],
  placeOfBirthOptions: [],
  countryCodes: [{ code: "+31", name: "Netherlands" }],
  selectedCountryCode: "+31",
  stripPhone: "",
  dateOfBirthError: "",
  nationalityError: "",
  isVerifying: false,
  verificationCode: "",
  onTitleChange: jest.fn(),
  onInputChange: jest.fn(),
  onSexChange: jest.fn(),
  onCountryCodeChange: jest.fn(),
  onPhoneChange: jest.fn(),
  onDateOfBirthChange: jest.fn(),
  onVerificationInputChange: jest.fn(),
  onSaveAll: jest.fn(),
  isSaving: false,
  saveSuccess: false,
  onVerifyEmail: jest.fn(),
  language: "en",
  languageOptions: [{ value: "en", label: "English" }],
  onLanguageChange: jest.fn(),
  dateFormat: "",
  dateFormatOptions: [],
  onDateFormatChange: jest.fn(),
  priceFormat: "",
  priceFormatOptions: [],
  onPriceFormatChange: jest.fn(),
  showPrefFormats: false,
  showAuthMfa: false,
  authStatus: { emailVerified: true, phoneVerified: false, preferredMFA: "NOMFA" },
  isChangingPassword: false,
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  passwordError: "",
  isSavingPassword: false,
  passwordChangeSuccess: false,
  onOpenPasswordChange: jest.fn(),
  onClosePasswordChange: jest.fn(),
  onCurrentPasswordChange: jest.fn(),
  onNewPasswordChange: jest.fn(),
  onConfirmPasswordChange: jest.fn(),
  onSubmitPasswordChange: jest.fn(),
};

const renderForm = (overrides = {}) => render(<PersonalDataForm {...baseProps} {...overrides} />);

describe("PersonalDataForm password management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("displays the password field as hidden characters", () => {
    renderForm();

    expect(screen.getByText("••••••••")).toBeInTheDocument();
  });

  test("shows a Change Password button", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Change Password" })).toBeInTheDocument();
  });

  test("clicking Change Password opens the password change flow", async () => {
    const onOpenPasswordChange = jest.fn();
    renderForm({ onOpenPasswordChange });

    await userEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(onOpenPasswordChange).toHaveBeenCalled();
  });

  test("does not render the password change flow when closed", () => {
    renderForm({ isChangingPassword: false });

    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
  });

  test("renders current, new and confirm password fields as password inputs when open", () => {
    renderForm({ isChangingPassword: true });

    expect(screen.getByLabelText("Current password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("New password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute("type", "password");
  });

  test("typing in the password fields calls the matching handlers", async () => {
    const onCurrentPasswordChange = jest.fn();
    const onNewPasswordChange = jest.fn();
    const onConfirmPasswordChange = jest.fn();
    renderForm({ isChangingPassword: true, onCurrentPasswordChange, onNewPasswordChange, onConfirmPasswordChange });

    await userEvent.type(screen.getByLabelText("Current password"), "a");
    await userEvent.type(screen.getByLabelText("New password"), "b");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "c");

    expect(onCurrentPasswordChange).toHaveBeenCalled();
    expect(onNewPasswordChange).toHaveBeenCalled();
    expect(onConfirmPasswordChange).toHaveBeenCalled();
  });

  test("toggling the eye icon reveals and re-hides a password field independently of the others", async () => {
    renderForm({ isChangingPassword: true });

    const currentPasswordInput = screen.getByLabelText("Current password");
    const newPasswordInput = screen.getByLabelText("New password");
    const currentPasswordField = currentPasswordInput.closest(".pd-field");

    await userEvent.click(within(currentPasswordField).getByRole("button", { name: "Show password" }));

    expect(currentPasswordInput).toHaveAttribute("type", "text");
    expect(newPasswordInput).toHaveAttribute("type", "password");

    await userEvent.click(within(currentPasswordField).getByRole("button", { name: "Hide password" }));

    expect(currentPasswordInput).toHaveAttribute("type", "password");
  });

  test("submitting the password change flow calls onSubmitPasswordChange", async () => {
    const onSubmitPasswordChange = jest.fn();
    renderForm({ isChangingPassword: true, onSubmitPasswordChange });

    await userEvent.click(screen.getByRole("button", { name: "Save password" }));

    expect(onSubmitPasswordChange).toHaveBeenCalled();
  });

  test("pressing Enter in a password field submits the form", async () => {
    const onSubmitPasswordChange = jest.fn();
    renderForm({ isChangingPassword: true, onSubmitPasswordChange });

    await userEvent.type(screen.getByLabelText("Current password"), "{Enter}");

    expect(onSubmitPasswordChange).toHaveBeenCalled();
  });

  test("cancelling the password change flow calls onClosePasswordChange", async () => {
    const onClosePasswordChange = jest.fn();
    renderForm({ isChangingPassword: true, onClosePasswordChange });

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClosePasswordChange).toHaveBeenCalled();
  });

  test("shows a password error message when present", () => {
    renderForm({ isChangingPassword: true, passwordError: "New password and confirmation do not match." });

    expect(screen.getByText("New password and confirmation do not match.")).toBeInTheDocument();
  });

  test("shows a success message once the password has been changed", () => {
    renderForm({ isChangingPassword: true, passwordChangeSuccess: true });

    expect(screen.getByText("Password changed successfully.")).toBeInTheDocument();
  });

  test("shows Close instead of Cancel once the password has been changed successfully", () => {
    renderForm({ isChangingPassword: true, passwordChangeSuccess: true });

    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  test("disables the save button while the password change is in flight", () => {
    renderForm({ isChangingPassword: true, isSavingPassword: true });

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });
});

describe("PersonalDataForm photo feedback", () => {
  test("shows an uploaded confirmation as a status message when photoSuccess is 'uploaded'", () => {
    renderForm({ photoSuccess: "uploaded" });

    const message = screen.getByText("Photo uploaded!");
    expect(message).toBeInTheDocument();
    expect(message).toHaveAttribute("role", "status");
    expect(message).toHaveClass("pd-photo-success");
  });

  test("shows a removed confirmation as a status message when photoSuccess is 'removed'", () => {
    renderForm({ photoSuccess: "removed" });

    const message = screen.getByText("Photo removed!");
    expect(message).toBeInTheDocument();
    expect(message).toHaveAttribute("role", "status");
    expect(message).toHaveClass("pd-photo-success");
  });

  test("shows a photo error as an alert with the dedicated photo-error style, not the generic field style", () => {
    renderForm({ photoError: "Photo must be smaller than 5MB." });

    const message = screen.getByText("Photo must be smaller than 5MB.");
    expect(message).toBeInTheDocument();
    expect(message).toHaveAttribute("role", "alert");
    expect(message).toHaveClass("pd-photo-error");
    expect(message).not.toHaveClass("pd-field-error");
  });

  test("shows no photo feedback message when there is neither an error nor a success state", () => {
    renderForm({ photoError: "", photoSuccess: "" });

    expect(screen.queryByText("Photo uploaded!")).not.toBeInTheDocument();
    expect(screen.queryByText("Photo removed!")).not.toBeInTheDocument();
  });
});
