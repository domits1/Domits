// Loading.jsx
import React from 'react';
import './styles/Loading.css';

const Loading = () => {
    return (
        <div className="loading-container">
            <div className="loader"></div>
            <p>Fetching data, please wait...</p>
        </div>
    );
};

export default Loading;