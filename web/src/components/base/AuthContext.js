import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [credentials, setCredentials] = useState({});

    const setAuthCredentials = (email, password) => {
        setCredentials({ email, password });
    };

    return (
        <AuthContext.Provider value={{ credentials, setAuthCredentials }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
