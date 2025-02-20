import {Auth} from 'aws-amplify'

export async function changeEmail(newEmail) {
  try {
    const user = await Auth.currentAuthenticatedUser()

    await Auth.updateUserAttributes(user, {
      email: newEmail,
    })

    await Auth.verifyCurrentUserAttribute('email')

    return {success: true}
  } catch (error) {
    console.error('Error changing email:', error)
    return {success: false, error}
  }
}

export async function confirmEmailChange(verificationCode) {
  try {
    await Auth.verifyCurrentUserAttributeSubmit('email', verificationCode)
    return {success: true}
  } catch (error) {
    console.error('Error confirming email change:', error)
    return {success: false, error}
  }
}

export async function confirmUsernameChange(verificationCode) {
  try {
    // Call Cognito API to verify the username change using the verification code
    await Auth.verifyCurrentUserAttributeSubmit('email', verificationCode)
    return {success: true}
  } catch (error) {
    console.error('Error confirming username change:', error)
    return {success: false, error}
  }
}
