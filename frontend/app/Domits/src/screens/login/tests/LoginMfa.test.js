import React from 'react';
import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {confirmSignIn, signIn} from '@aws-amplify/auth';
import {LanguageReferences} from '../../../features/translation/services/Languages';
import {HOME_SCREEN} from '../../../navigation/utils/NavigationNameConstants';
import LoginScreen from '../loginScreen';

const mockNavigate = jest.fn();
const mockCheckAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate}),
  useFocusEffect: callback => {
    const {useEffect} = require('react');
    useEffect(() => callback(), [callback]);
  },
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({checkAuth: mockCheckAuth, isAuthenticated: false}),
}));

jest.mock('@aws-amplify/auth', () => ({
  signIn: jest.fn(),
  confirmSignIn: jest.fn(),
}));

jest.mock('react-native-get-random-values', () => ({}));

jest.mock('@aws-amplify/ui-react-native/src/primitives', () => ({
  Label: ({children}) => {
    const {createElement} = require('react');
    const {Text} = require('react-native');
    return createElement(Text, null, children);
  },
}));

jest.mock('../../loadingscreen/screens/LoadingScreen', () => () => null);

const EMAIL = 'host@example.com';
const PASSWORD = 'Secret123!';
const CODE = '123456';
const TOTP_STEP = {
  isSignedIn: false,
  nextStep: {signInStep: 'CONFIRM_SIGN_IN_WITH_TOTP_CODE'},
};
const SIGNED_IN = {isSignedIn: true, nextStep: {signInStep: 'DONE'}};
const SESSION_EXPIRED_MESSAGE =
  'Your sign-in session expired. Please sign in again.';
const UNSUPPORTED_MESSAGE =
  'This sign-in method is not supported yet. Please contact support.';
const INVALID_CODE_MESSAGE = 'Invalid code. Please try again.';
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

const authError = name => Object.assign(new Error(name), {name});

const renderLogin = () => render(<LoginScreen />);

const submitPassword = async screen => {
  fireEvent.changeText(screen.getByPlaceholderText('Email'), EMAIL);
  fireEvent.changeText(screen.getByPlaceholderText('Password'), PASSWORD);
  await act(async () => {
    fireEvent.press(screen.getByText('Log in'));
  });
};

const reachCodeStep = async () => {
  signIn.mockResolvedValue(TOTP_STEP);
  const screen = renderLogin();
  await submitPassword(screen);
  await screen.findByText('Two-factor authentication');
  return screen;
};

const enterCodeAndVerify = async (screen, code = CODE) => {
  fireEvent.changeText(screen.getByPlaceholderText('6-digit code'), code);
  await act(async () => {
    fireEvent.press(screen.getByText('Verify'));
  });
};

const expectPasswordFormWithEmailKept = async screen => {
  await screen.findByText('Log in or sign up');
  expect(screen.getByPlaceholderText('Email').props.value).toBe(EMAIL);
  expect(screen.getByPlaceholderText('Password').props.value).toBe('');
};

describe('Login screen with authenticator app MFA', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockCheckAuth.mockResolvedValue(undefined);
    await i18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      resources: LanguageReferences,
      interpolation: {escapeValue: false},
    });
  });

  it('completes a normal login by refreshing the auth state before navigating home', async () => {
    signIn.mockResolvedValue(SIGNED_IN);
    const screen = renderLogin();

    await submitPassword(screen);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(HOME_SCREEN));
    expect(signIn).toHaveBeenCalledWith({username: EMAIL, password: PASSWORD});
    expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    expect(mockCheckAuth.mock.invocationCallOrder[0]).toBeLessThan(
      mockNavigate.mock.invocationCallOrder[0],
    );
  });

  it('shows the code step instead of navigating when the authenticator app code is required', async () => {
    const screen = await reachCodeStep();

    expect(
      screen.getByText('Enter the 6-digit code from your authenticator app.'),
    ).toBeTruthy();
    const codeInput = screen.getByPlaceholderText('6-digit code');
    expect(codeInput.props.keyboardType).toBe('number-pad');
    expect(codeInput.props.maxLength).toBe(6);
    expect(codeInput.props.textContentType).toBe('oneTimeCode');
    expect(codeInput.props.autoComplete).toBe('sms-otp');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockCheckAuth).not.toHaveBeenCalled();
  });

  it('confirms a valid code and then completes the login', async () => {
    confirmSignIn.mockResolvedValue(SIGNED_IN);
    const screen = await reachCodeStep();

    await enterCodeAndVerify(screen);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(HOME_SCREEN));
    expect(confirmSignIn).toHaveBeenCalledWith({challengeResponse: CODE});
    expect(mockCheckAuth).toHaveBeenCalledTimes(1);
  });

  it('rejects a code that is not exactly 6 digits without calling Cognito', async () => {
    const screen = await reachCodeStep();

    await enterCodeAndVerify(screen, '12345');

    expect(await screen.findByText(INVALID_CODE_MESSAGE)).toBeTruthy();
    expect(confirmSignIn).not.toHaveBeenCalled();
  });

  it('keeps the code step open and explains when the code does not match', async () => {
    confirmSignIn.mockRejectedValue(authError('CodeMismatchException'));
    const screen = await reachCodeStep();

    await enterCodeAndVerify(screen);

    expect(await screen.findByText(INVALID_CODE_MESSAGE)).toBeTruthy();
    expect(screen.getByText('Two-factor authentication')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each(['TooManyRequestsException', 'LimitExceededException'])(
    'shows the rate limit message when Cognito throttles the attempts (%s)',
    async errorName => {
      confirmSignIn.mockRejectedValue(authError(errorName));
      const screen = await reachCodeStep();

      await enterCodeAndVerify(screen);

      expect(
        await screen.findByText(
          'Too many attempts. Please wait a moment and try again.',
        ),
      ).toBeTruthy();
    },
  );

  it('treats an expired code as an invalid code', async () => {
    confirmSignIn.mockRejectedValue(authError('ExpiredCodeException'));
    const screen = await reachCodeStep();

    await enterCodeAndVerify(screen);

    expect(await screen.findByText(INVALID_CODE_MESSAGE)).toBeTruthy();
    expect(screen.getByText('Two-factor authentication')).toBeTruthy();
  });

  it('shows the generic error when the code is accepted but the sign-in is not complete', async () => {
    confirmSignIn.mockResolvedValue(TOTP_STEP);
    const screen = await reachCodeStep();

    await enterCodeAndVerify(screen);

    expect(await screen.findByText(GENERIC_MESSAGE)).toBeTruthy();
    expect(screen.getByText('Two-factor authentication')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockCheckAuth).not.toHaveBeenCalled();
  });

  it('keeps the code step open with the generic error when completing the login fails', async () => {
    confirmSignIn.mockResolvedValue(SIGNED_IN);
    mockCheckAuth.mockRejectedValue(new Error('Auth state refresh failed'));
    const screen = await reachCodeStep();

    await enterCodeAndVerify(screen);

    expect(await screen.findByText(GENERIC_MESSAGE)).toBeTruthy();
    expect(screen.getByText('Two-factor authentication')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each(['NotAuthorizedException', 'SignInException'])(
    'returns to the password form with the email kept when the challenge is gone (%s)',
    async errorName => {
      confirmSignIn.mockRejectedValue(authError(errorName));
      const screen = await reachCodeStep();

      await enterCodeAndVerify(screen);

      await expectPasswordFormWithEmailKept(screen);
      expect(screen.getByText(SESSION_EXPIRED_MESSAGE)).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalled();
    },
  );

  it('goes back to the password form without an error from Back to login', async () => {
    const screen = await reachCodeStep();

    fireEvent.press(screen.getByText('Back to login'));

    await expectPasswordFormWithEmailKept(screen);
    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).toBeNull();
    expect(
      screen.queryByText('Invalid username or password. Please try again.'),
    ).toBeNull();
  });

  it('refuses an unsupported sign-in step without navigating', async () => {
    signIn.mockResolvedValue({
      isSignedIn: false,
      nextStep: {signInStep: 'CONFIRM_SIGN_IN_WITH_SMS_CODE'},
    });
    const screen = renderLogin();

    await submitPassword(screen);

    expect(await screen.findByText(UNSUPPORTED_MESSAGE)).toBeTruthy();
    expect(screen.queryByText('Two-factor authentication')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockCheckAuth).not.toHaveBeenCalled();
  });

  it('sends the code only once while a verification is in flight', async () => {
    confirmSignIn.mockReturnValue(new Promise(() => {}));
    const screen = await reachCodeStep();

    fireEvent.changeText(screen.getByPlaceholderText('6-digit code'), CODE);
    act(() => {
      fireEvent.press(screen.getByText('Verify'));
    });
    fireEvent.press(screen.getByText('Verifying...'));

    expect(confirmSignIn).toHaveBeenCalledTimes(1);
  });
});
