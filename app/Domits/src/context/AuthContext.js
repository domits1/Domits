import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchUserAttributes, getCurrentUser } from '@aws-amplify/auth';

// Create a Context with default values.
const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  userAttributes: null,
  checkAuth: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userAttributes, setUserAttributes] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await getCurrentUser();
      const attributes = await fetchUserAttributes(userData);
      console.log('User data:', userData); // Log user data on success
      console.log('User Attributes:', attributes);
      setUser(userData);
      setUserAttributes(attributes);
    } catch (error) {
      console.error('checkAuth error:', error); // Detailed logging of the error
      setUser(null);
      setUserAttributes(null);
    }
  };

  return (
      <AuthContext.Provider value={{ isAuthenticated: !!user, user, userAttributes, checkAuth }}>
        {children}
      </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
