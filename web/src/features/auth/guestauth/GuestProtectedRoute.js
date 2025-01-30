import React from 'react';
import {Navigate} from 'react-router-dom';
import { useUser } from '../UserContext';

const GuestProtectedRoute = ({ children }) => {
    const { role, isLoading } = useUser();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (role !== 'Host' && role !== 'Traveler') {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default GuestProtectedRoute;
