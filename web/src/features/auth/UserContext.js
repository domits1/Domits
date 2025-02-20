import React, {createContext, useContext, useState, useEffect} from 'react'
import {Auth} from 'aws-amplify'

const UserContext = createContext()

export const useUser = () => useContext(UserContext)

export const UserProvider = ({children}) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userInfo = await Auth.currentAuthenticatedUser({
          bypassCache: true,
        })
        if (
          userInfo &&
          userInfo.attributes &&
          'custom:group' in userInfo.attributes
        ) {
          setUser(userInfo)
          setRole(userInfo.attributes['custom:group'])
        } else {
          console.error('User role attribute missing, handling as guest')
          setUser(userInfo)
          setRole('Traveler')
        }
      } catch (error) {
        console.error("Error fetching user's role:", error)
        setUser(null)
        setRole(null)
      } finally {
        setIsLoading(false)
      }
    }
    checkUser()
  }, [])

  return (
    <UserContext.Provider value={{user, role, isLoading}}>
      {children}
    </UserContext.Provider>
  )
}
