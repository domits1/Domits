import React, {useState, useEffect} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'
import styles from './hostverification.module.css'
import Toast from '../../../components/toast/Toast' // Import the Toast component
import {Auth} from 'aws-amplify' // Import the Auth module
import {verifyCode, sendVerificationCode} from './services/verificationServices' // Import the API function

function PhoneNumberConfirmView() {
  const location = useLocation()
  const navigate = useNavigate() // Initialize navigate hook
  const {phoneNumber} = location.state || {} // Get phoneNumber and userId from location.state
  const [code, setCode] = useState('') // State for the verification code
  const [toastMessage, setToastMessage] = useState({message: '', status: ''}) // State for Toast feedback
  const [isLoading, setIsLoading] = useState(false) // State to track loading
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    const asyncUserId = async () => {
      try {
        const userInfo = await Auth.currentAuthenticatedUser()
        await setUserId(userInfo.attributes.sub)
      } catch (error) {
        console.error('Error setting user id:', error)
      }
    }
    asyncUserId()
  }, [])

  // Validate the code input
  const validateCode = input => {
    return /^\d{6}$/.test(input) // Check if input is exactly 6 digits
  }

  // Handle input change
  const handleCodeChange = event => {
    const input = event.target.value
    setCode(input)
  }

  // Handle Continue button click
  const handleContinue = async () => {
    if (!validateCode(code)) {
      setToastMessage({
        message: 'Please enter a valid 6-digit code.',
        status: 'error',
      })
      return
    }

    // Proceed with verification
    setIsLoading(true) // Start loading indicator
    const userData = {userId, code} // Prepare the data for the API
    console.log('Verifying code:', userData)
    try {
      await verifyCode(userData) // Call the API
      setToastMessage({
        message: 'Code verified successfully!',
        status: 'success',
      })
      console.log('Code verified successfully:', code)

      // Redirect to /verify after a short delay
      setTimeout(() => {
        navigate('/verify')
      }, 3000) // 3-second delay to show the toast message
    } catch (error) {
      console.error('Error verifying code:', error)
      setToastMessage({
        message: error.message, // Show the detailed error message
        status: 'error',
      })
    } finally {
      setIsLoading(false) // Stop loading indicator
    }
  }

  const handleResendCode = async () => {
    try {
      setIsLoading(true) // Start loading state
      const userData = {
        userId, // Use the plain string value
        phoneNumber, // Use the sanitized phone number
      }

      // Call the sendVerificationCode service
      await sendVerificationCode(userData)

      // Show success toast message
      setToastMessage({
        message: `Verification code resent to ${phoneNumber}`,
        status: 'success',
      })
    } catch (error) {
      // Show error toast message
      setToastMessage({
        message: 'Failed to resend the verification code. Please try again.',
        status: 'error',
      })
      console.error('Error resending verification code:', error)
    } finally {
      setIsLoading(false) // Stop loading state
    }
  }

  // Check if the Continue button should be disabled
  const isButtonDisabled = code.length !== 6 || isLoading

  return (
    <main className={styles['verification-container']}>
      <div className={styles['headertext-container']}>
        <h1>What number can guests reach you on?</h1>
        <p>
          We will send you reservation requests, reminders, and other
          notifications. You should be able to receive phone calls and text
          messages on this number.
        </p>
      </div>
      <div className={styles['code-input-container']}>
        <p>
          Enter the 6-digit code that Domits just sent to{' '}
          <strong>{phoneNumber || 'your phone number'}</strong>:
        </p>
        <input
          type="text"
          placeholder="Enter code"
          value={code}
          onChange={handleCodeChange}
          maxLength={6} // Limit input to 6 characters
        />
        <button
          className={`${styles['publish-btn']} ${
            isButtonDisabled ? styles['disabled-btn'] : ''
          }`}
          disabled={isButtonDisabled}
          onClick={handleContinue}>
          {isLoading ? 'Verifying...' : 'Continue'}
        </button>
        <p>
          Didn't receive the code?{' '}
          <span
            onClick={() =>
              handleResendCode(
                {userId}, // Replace with actual user ID
                {phoneNumber}, // Replace with actual phone number
                setToastMessage, // Pass the toast message setter
                setIsLoading, // Pass the loading state setter
              )
            }
            disabled={isLoading}>
            {' '}
            Resend Code{' '}
          </span>
        </p>
      </div>
      <hr />
      <div className={styles['bottom-container']}></div>
      <div className={styles['back-btn']}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="25"
          height="33">
          <path
            d="M15 6l-6 6 6 6"
            stroke="#000"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p>Back</p>
      </div>
      <Toast
        message={toastMessage.message}
        status={toastMessage.status}
        duration={3000}
        onClose={() => setToastMessage({message: '', status: ''})}
      />
    </main>
  )
}

export default PhoneNumberConfirmView
