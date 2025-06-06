import {beforeEach, describe, expect, it} from "@jest/globals";
import {LanguageReferences} from "../../../../features/translation/services/Languages";
import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import PasswordView from "../views/PasswordView";
import {fireEvent, render} from "@testing-library/react-native";
import PersonalDetailsView from "../views/PersonalDetailsView";
import EmailView from "../views/EmailView";
import Register from "../screens/register";

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({navigate: jest.fn()}),
}));

jest.mock('../../../../context/AuthContext', () => ({
    useAuth: () => ({setAuthCredentials: jest.fn()}),
}));

jest.mock('@aws-amplify/auth', () => ({
    signUp: jest.fn(),
}));

describe('Register screen', () => {
    beforeEach(async () => {
        await i18n.use(initReactI18next).init({
            lng: 'en',
            fallbackLng: 'en',
            resources: LanguageReferences,
            interpolation: {
                escapeValue: false
            }
        });
    });

    let getByPlaceholderText, getByText;

    beforeEach(() => {
        const utils = render(
            <Register/>
        )

        getByPlaceholderText = utils.getByPlaceholderText;
        getByText = utils.getByText;
    })

    it('displays validation errors for empty fields', () => {
        fireEvent.press(getByText('Sign up'));
        expect(getByText("First name is not valid.")).toBeTruthy();
        fireEvent.changeText(getByPlaceholderText('First Name'), 'John')
        fireEvent.press(getByText('Sign up'));
        expect(getByText("Last name is not valid.")).toBeTruthy();
        fireEvent.changeText(getByPlaceholderText('Last Name'), 'Doe')
        fireEvent.press(getByText('Sign up'));
        expect(getByText("Email is not valid.")).toBeTruthy();
        fireEvent.changeText(getByPlaceholderText('Email'), 'example@mail.com')
        fireEvent.press(getByText('Sign up'));
        expect(getByText("Password must be stronger.")).toBeTruthy();
    });

})

describe('Password component', () => {
    beforeEach(async () => {
        await i18n.use(initReactI18next).init({
            lng: 'en',
            fallbackLng: 'en',
            resources: LanguageReferences,
            interpolation: {
                escapeValue: false
            }
        });
    });

    let mockHandleValidFormChange;
    let mockSetFormData;
    let formData;
    let getByPlaceholderText, getByTestId;

    beforeEach(() => {
        mockHandleValidFormChange = jest.fn();
        mockSetFormData = jest.fn();
        formData = {password: ''};

        const utils = render(
            <PasswordView
                formData={formData}
                setFormData={mockSetFormData}
                handleValidFormChange={mockHandleValidFormChange}
            />
        );

        getByPlaceholderText = utils.getByPlaceholderText;
        getByTestId = utils.getByTestId;
    });

    const mockVeryWeakPassword = 'password';
    const mockWeakPassword = 'Password';
    const mockStrongPassword = 'Password1';
    const mockVeryStrongPassword = 'Password1!';

    it('Should display password strength', () => {
        const passwordInput = getByPlaceholderText('Password');

        fireEvent.changeText(passwordInput, mockVeryWeakPassword);
        expect(getByTestId('password-strength').children.includes('Very Weak')).toBeTruthy();

        fireEvent.changeText(passwordInput, mockWeakPassword);
        expect(getByTestId('password-strength').children.includes('Weak')).toBeTruthy();

        fireEvent.changeText(passwordInput, mockStrongPassword);
        expect(getByTestId('password-strength').children.includes('Good')).toBeTruthy();

        fireEvent.changeText(passwordInput, mockVeryStrongPassword);
        expect(getByTestId('password-strength').children.includes('Strong')).toBeTruthy();
    });

    it("Should correctly validate password requirements", () => {
        const passwordInput = getByPlaceholderText('Password');

        fireEvent.changeText(passwordInput, mockVeryWeakPassword);
        expect(getByTestId('requirement-length').children.includes("✘"));
        expect(getByTestId('requirement-uppercase').children.includes("✘"));
        expect(getByTestId('requirement-number').children.includes("✘"));
        expect(getByTestId('requirement-special-character').children.includes("✘"));
        expect(mockHandleValidFormChange).toHaveBeenCalledWith('password', false);

        fireEvent.changeText(passwordInput, mockVeryStrongPassword);
        expect(getByTestId('requirement-length').children.includes("✔"));
        expect(getByTestId('requirement-uppercase').children.includes("✔"));
        expect(getByTestId('requirement-number').children.includes("✔"));
        expect(getByTestId('requirement-special-character').children.includes("✔"));
        expect(mockHandleValidFormChange).toHaveBeenCalledWith('password', true);
    })
})

describe('Personal details component', () => {
    beforeEach(async () => {
        await i18n.use(initReactI18next).init({
            lng: 'en',
            fallbackLng: 'en',
            resources: LanguageReferences,
            interpolation: {
                escapeValue: false
            }
        });
    });

    let formData;
    let mockHandleDataChange;
    let mockHandleValidFormChange;
    let getByPlaceholderText, getByTestId, queryByText, getByText;

    beforeEach(() => {
        formData = {firstName: '', lastName: ''};
        mockHandleDataChange = jest.fn();
        mockHandleValidFormChange = jest.fn();

        const utils = render(
            <PersonalDetailsView
                formData={formData}
                handleDataChange={mockHandleDataChange}
                handleValidFormChange={mockHandleValidFormChange}
            />
        );

        getByPlaceholderText = utils.getByPlaceholderText;
        getByTestId = utils.getByTestId;
        queryByText = utils.queryByText;
        getByText = utils.getByText;
    });

    it('Should render name input fields', () => {
        expect(getByPlaceholderText('First Name')).toBeTruthy();
        expect(getByPlaceholderText('Last Name')).toBeTruthy();
    });

    it('Should display error for short name', () => {
        const firstNameInput = getByPlaceholderText('First Name');
        fireEvent.changeText(firstNameInput, '');
        expect(getByText("First name can't be empty.")).toBeTruthy();
        expect(mockHandleValidFormChange).toHaveBeenCalledWith('firstname', false);

        fireEvent.changeText(firstNameInput, 'E');
        expect(getByText("First name must be at least 2 characters.")).toBeTruthy();
        expect(mockHandleValidFormChange).toHaveBeenCalledWith('firstname', false);

        const lastNameInput = getByPlaceholderText('Last Name');
        fireEvent.changeText(lastNameInput, '');
        expect(getByText("Last name can't be empty.")).toBeTruthy();
        expect(mockHandleValidFormChange).toHaveBeenCalledWith('lastname', false);

        fireEvent.changeText(lastNameInput, 'E');
        expect(getByText("Last name must be at least 2 characters.")).toBeTruthy();
        expect(mockHandleValidFormChange).toHaveBeenCalledWith('lastname', false);
    })

    it('Should not display error for valid name', () => {
        const firstNameInput = getByPlaceholderText('First Name');
        fireEvent.changeText(firstNameInput, 'John');

        expect(queryByText("First name can't be empty.")).toBeFalsy();
        expect(queryByText('First name must be at least 2 characters.')).toBeFalsy();
        expect(mockHandleValidFormChange).toHaveBeenCalledWith('firstname', true);

        const lastNameInput = getByPlaceholderText('Last Name');
        fireEvent.changeText(lastNameInput, 'Doe');

        expect(queryByText("Last name can't be empty.")).toBeFalsy();
        expect(queryByText('Last name must be at least 2 characters.')).toBeFalsy();
        expect(mockHandleValidFormChange).toHaveBeenCalledWith('lastname', true);

    })
})

describe('Email component', () => {
    beforeEach(async () => {
        await i18n.use(initReactI18next).init({
            lng: 'en',
            fallbackLng: 'en',
            resources: LanguageReferences,
            interpolation: {
                escapeValue: false
            }
        });
    });

    let mockHandleValidFormChange;
    let mockHandleDataChange;
    let formData;
    let getByPlaceholderText, getByText, queryByText;

    beforeEach(() => {
        mockHandleValidFormChange = jest.fn();
        mockHandleDataChange = jest.fn();
        formData = {password: ''};

        const utils = render(
            <EmailView
                formData={formData}
                handleDataChange={mockHandleDataChange}
                handleValidFormChange={mockHandleValidFormChange}
            />
        )

        getByPlaceholderText = utils.getByPlaceholderText;
        getByText = utils.getByText;
        queryByText = utils.queryByText;
    })

    it('Should display error for invalid email', () => {
        const emailInput = getByPlaceholderText('Email');
        fireEvent.changeText(emailInput, '');
        expect(getByText("Email can't be empty.")).toBeTruthy();
        expect(mockHandleValidFormChange).toHaveBeenCalledWith('email', false);

        fireEvent.changeText(emailInput, 'invalid@email');
        expect(getByText("Does not follow the email format example@mail.com"));
        expect(mockHandleValidFormChange).toHaveBeenCalledWith('email', false);
    })

    it('Should display no errors for valid email', () => {
        const emailInput = getByPlaceholderText('Email');
        fireEvent.changeText(emailInput, 'valid@mail.com');
        expect(queryByText("Email can't be empty.")).toBeFalsy();
        expect(queryByText("Does not follow the email format example@mail.com")).toBeFalsy();
        expect(mockHandleValidFormChange).toHaveBeenCalledWith('email', true);
    })
})