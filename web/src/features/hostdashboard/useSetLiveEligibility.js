import {useState} from 'react'
import {getVerificationStatusFromDB} from '../verification/hostverification/services/verificationServices'

export const useSetLiveEligibility = ({userId}) => {
  const [liveEligibility, setLiveEligibility] = useState(false)
  const [liveEligibilityError, setLiveEligibilityError] = useState('')
  const [liveEligibilityLoading, setLiveEligibilityLoading] = useState(false)

  const fetchVerificationStatus = async () => {
    setLiveEligibilityLoading(true)
    try {
      const status = await getVerificationStatusFromDB(userId)
      const isVerified = status.verificationStatus === 'verified'
      setLiveEligibility(isVerified)
    } catch (error) {
      if (error.statusCode === 404) {
        setLiveEligibility(false)
      } else {
        setLiveEligibilityError(error.message)
        console.error('Error fetching verification status:', error)
      }
    } finally {
      setLiveEligibilityLoading(false)
    }
  }
  return {
    liveEligibility,
    liveEligibilityError,
    liveEligibilityLoading,
    fetchVerificationStatus,
  }
}
