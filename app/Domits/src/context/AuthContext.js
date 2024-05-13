import React, { createContext, useContext, useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';

// Create a Context with default values.
const AuthContext = createContext({
    isAuthenticated: false,
    user: null,
    checkAuth: async () => {},
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Ensure you are calling the function correctly
            const userData = await Auth.currentAuthenticatedUser();
            console.log('User data:', userData); // Log user data on success
            setUser(userData);
        } catch (error) {
            console.error('checkAuth error:', error); // Detailed logging of the error
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
