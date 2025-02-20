import React from 'react'
import {Navigate} from 'react-router-dom'
import {useUser} from '../UserContext'

const HostProtectedRoute = ({children}) => {
  const {role, isLoading} = useUser()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (role !== 'Host') {
    return <Navigate to="/" replace />
  }

  return children
}

export default HostProtectedRoute
