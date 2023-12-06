import React from "react";
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ADashboard from './aDashboard';
import Navbar from './navbar'
import './dashboard.css';


function HomeDashboard() {
    return (
        <div className="App">
            <Navbar />
                <div className="content">
                    <ADashboard/>
                </div>
        </div>
    );
}

export default HomeDashboard;