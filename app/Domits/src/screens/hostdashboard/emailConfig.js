import {
  updateUserAttribute,
  confirmUserAttribute,
  sendUserAttributeVerificationCode,
} from 'aws-amplify/auth';

// Function to update the email and send a verification code
export async function changeEmail(newEmail) {
  try {
    // Update the email attribute
    const output = await updateUserAttribute({
      userAttribute: {
        attributeKey: 'email',
        value: newEmail,
      },
    });

    const {nextStep} = output;
    if (nextStep.updateAttributeStep === 'CONFIRM_ATTRIBUTE_WITH_CODE') {
      console.log(
        `Verification code sent to: ${nextStep.codeDeliveryDetails?.destination}`,
      );
      return {success: true, message: 'Verification code sent.'};
    }

    return {success: false, message: 'Unexpected response from Amplify.'};
  } catch (error) {
    console.error('Error changing email:', error);
    return {success: false, error: error.message};
  }
}

// Function to confirm email change using the verification code
export async function confirmEmailChange(verificationCode) {
  try {
    await confirmUserAttribute({
      userAttributeKey: 'email',
      confirmationCode: verificationCode,
    });

    return {success: true, message: 'Email successfully confirmed.'};
  } catch (error) {
    console.error('Error confirming email change:', error);
    return {success: false, error: error.message};
  }
}

// Function to send a verification code manually
export async function resendEmailVerificationCode() {
  try {
    await sendUserAttributeVerificationCode({
      userAttributeKey: 'email',
    });
    return {success: true, message: 'Verification code resent successfully.'};
  } catch (error) {
    console.error('Error resending verification code:', error);
    return {success: false, error: error.message};
  }
}
