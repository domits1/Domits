import React, {createContext, useContext, useState} from 'react'

const AuthContext = createContext()

export const AuthProvider = ({children}) => {
  const [authState, setAuthState] = useState({
    credentials: {},
    userEmail: '', // Explicitly include userEmail
  })

  const setAuthCredentials = (email, password) => {
    setAuthState({
      credentials: {email, password},
      userEmail: email, // Update userEmail here
    })
  }

  return (
    <AuthContext.Provider value={{...authState, setAuthCredentials}}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
