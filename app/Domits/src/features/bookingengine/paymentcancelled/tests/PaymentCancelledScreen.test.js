import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {Alert} from 'react-native';
import {useStripe} from '@stripe/stripe-react-native';
import PaymentCancelled from '../screens/PaymentCancelled';
import * as NavigationNameConstants from '../../../../navigation/utils/NavigationNameConstants';
import {beforeEach, describe, expect, it} from '@jest/globals';

jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: jest.fn(),
}));

const mockNavigation = {
  navigate: jest.fn(),
};

const mockRoute = {
  params: {
    property: {
      pricing: {
        roomRate: 100,
        cleaning: 50,
        service: 25,
      },
    },
    guests: 2,
    nights: 3,
    paymentSecret: 'test_payment_secret',
    booking: '123',
  },
};

jest.spyOn(Alert, 'alert');

describe('PaymentCancelled Screen', () => {
  let mockInitPaymentSheet;
  let mockPresentPaymentSheet;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInitPaymentSheet = jest.fn();
    mockPresentPaymentSheet = jest.fn();

    useStripe.mockReturnValue({
      initPaymentSheet: mockInitPaymentSheet,
      presentPaymentSheet: mockPresentPaymentSheet,
    });
  });

  it('should render correctly with provided props', () => {
    const {getByText} = render(
      <PaymentCancelled navigation={mockNavigation} route={mockRoute} />,
    );

    expect(getByText('2 guests | 3 nights')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('should navigate to home screen when cancelled', () => {
    const {getByText} = render(
      <PaymentCancelled navigation={mockNavigation} route={mockRoute} />,
    );

    const cancelButton = getByText('Here');
    fireEvent.press(cancelButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      NavigationNameConstants.HOME_SCREEN,
    );
  });

  describe('Payment Sheet Interactions', () => {
    it('should initiate payment sheet successfully', async () => {
      mockInitPaymentSheet.mockResolvedValue({error: null});
      mockPresentPaymentSheet.mockResolvedValue({error: null});

      const {getByText} = render(
        <PaymentCancelled navigation={mockNavigation} route={mockRoute} />,
      );

      const tryAgainButton = getByText('Try Again');
      fireEvent.press(tryAgainButton);

      await waitFor(() => {
        expect(mockInitPaymentSheet).toHaveBeenCalledWith({
          paymentIntentClientSecret: 'test_payment_secret',
          merchantDisplayName: 'Domits',
        });

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          NavigationNameConstants.STRIPE_PAYMENT_CONFIRMED_SCREEN,
          {
            booking: '123',
            guests: 2,
            nights: 3,
          },
        );
      });
    });

    it('should handle payment sheet initialization error', async () => {
      mockInitPaymentSheet.mockResolvedValue({
        error: {message: 'Initialization error'},
      });

      const {getByText} = render(
        <PaymentCancelled navigation={mockNavigation} route={mockRoute} />,
      );

      const tryAgainButton = getByText('Try Again');
      fireEvent.press(tryAgainButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Something went wrong',
          'Please contact support',
        );

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          NavigationNameConstants.HOME_SCREEN,
        );
      });
    });

    it('should handle payment sheet presentation error', async () => {
      mockInitPaymentSheet.mockResolvedValue({error: null});
      mockPresentPaymentSheet.mockResolvedValue({
        error: {message: 'Presentation error'},
      });

      const {getByText} = render(
        <PaymentCancelled navigation={mockNavigation} route={mockRoute} />,
      );

      const tryAgainButton = getByText('Try Again');
      fireEvent.press(tryAgainButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Something went wrong',
          'Please contact support',
        );

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          NavigationNameConstants.HOME_SCREEN,
        );
      });
    });
  });

  it('should log errors during payment sheet process', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockInitPaymentSheet.mockRejectedValue(new Error('Unexpected error'));

    const {getByText} = render(
      <PaymentCancelled navigation={mockNavigation} route={mockRoute} />,
    );

    const tryAgainButton = getByText('Try Again');
    fireEvent.press(tryAgainButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});
