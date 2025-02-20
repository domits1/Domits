import {useState} from 'react'
import {useNavigate} from 'react-router-dom' // Import useNavigate
import {useEffect} from 'react'
import {Auth} from 'aws-amplify' // Import the Auth module
import {validatePhoneNumber} from '../utils/validation'

import {sendVerificationCode} from '../services/verificationServices' // Import the service function

export const usePhoneNumberForm = () => {
  const navigate = useNavigate() // Initialize useNavigate
  const [selectedCountry, setSelectedCountry] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [toastMessage, setToastMessage] = useState({message: '', status: ''})
  const [isLoading, setIsLoading] = useState(false) // Add loading state
  const [userId, setUserId] = useState(null) // Add user ID state

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

  const handleCountryChange = event => {
    const country = event.target.value
    setSelectedCountry(country)
  }

  const handlePhoneNumberChange = event => {
    const number = event.target.value
    setPhoneNumber(number)
  }

  const handleContinue = async () => {
    if (!selectedCountry || !phoneNumber.trim()) {
      setToastMessage({
        message: 'Please select a country and enter a phone number.',
        status: 'error',
      })
      return
    }

    if (!validatePhoneNumber(phoneNumber) || phoneNumber.trim().length < 7) {
      setToastMessage({
        message: 'Please enter a valid phone number (7-15 digits).',
        status: 'error',
      })
      return
    }

    const completePhoneNumber = `${selectedCountry} ${phoneNumber}`

    try {
      setIsLoading(true) // Set loading state to true
      const userData = {
        userId: userId, // Replace with actual user ID (e.g., from context or props)
        phoneNumber: completePhoneNumber,
      }

      // Call the sendVerificationCode service
      const response = await sendVerificationCode(userData)

      // Handle success
      setToastMessage({
        message: `Verification code sent to ${completePhoneNumber}`,
        status: 'success',
      })
      console.log('Verification code response:', response)

      // Redirect to the confirmation page after a short delay
      setTimeout(() => {
        navigate('/verify/phonenumber/confirm', {
          state: {phoneNumber: completePhoneNumber}, // Pass the complete phone number as state
        })
      }, 2000) // Delay for 2 seconds to show the success message
    } catch (error) {
      // Handle error
      setToastMessage({
        message: 'Failed to send verification code. Please try again.',
        status: 'error',
      })
      console.error('Error sending verification code:', error)
    } finally {
      setIsLoading(false) // Reset loading state
    }
  }

  const handleResendCode = async (
    userId,
    phoneNumber,
    setToastMessage,
    setIsLoading,
  ) => {
    if (!phoneNumber || phoneNumber.trim().length < 7) {
      setToastMessage({
        message: 'Please provide a valid phone number.',
        status: 'error',
      })
      return
    }

    try {
      setIsLoading(true) // Start loading state
      const userData = {
        userId: userId || '12345', // Replace with the actual user ID if available
        phoneNumber, // Pass the complete phone number
      }

      // Call the sendVerificationCode service
      await sendVerificationCode(userData)

      // Show success toast message
      setToastMessage({
        message: `Verification code resent to ${phoneNumber}`,
        status: 'success',
      })
      console.log('Resent verification code successfully.')
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

  const isButtonEnabled = selectedCountry && phoneNumber.trim()

  return {
    selectedCountry,
    phoneNumber,
    toastMessage,
    isLoading,
    isButtonEnabled,
    handleCountryChange,
    handlePhoneNumberChange,
    handleContinue,
    setToastMessage,
  }
}
