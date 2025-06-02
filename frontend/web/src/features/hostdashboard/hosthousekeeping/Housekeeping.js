import React, { useEffect, useState } from "react";
import Pages from "../Pages.js";
import "./Housekeeping.css";
import { useNavigate } from 'react-router-dom';
import { getTasks } from "./helper/breezewayAPI-call.jsx";
import BreezewayRedirectWidget from "./components/BreezewayRedirectWidget.jsx";
import TurnoRedirectWidget from "./components/TurnoRedirectWidget.jsx";

const HostPropertyCare = () => {
    const navigate = useNavigate();

    const handleContactNavigation = () => {
        navigate('/contact');
    };
    
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        getTasks().then(data => setTasks(data))
        .catch((error) => console.error("Error fetching tasks:", error));
    }, []);

    return (
        <main className="page-body">
        <h2>Housekeeping</h2>
            <section className='host-pc-property'>
                <Pages/>
                <div className="property-content">
                    <div>
                        <h3 className="property-h3">
                            Are you looking for a cleaner, housekeeper, or maintenance handyman? Our partner Mostpros
                            has a network of home service professionals ready to support you.
                            <span className="property-span"
                                onClick={handleContactNavigation}
                            > Send us a message here
                            </span> and we connect you with them.
                        </h3>                        
                    </div>
                    <div>
                        <h1>Breezeway Tasks</h1>
                        <ul>
                            {tasks.map(task => (
                            <li key={task.id}>{task.name}</li>
                            ))}
                            <BreezewayRedirectWidget/>
                        </ul>
                        <h1>Turno Tasks</h1>
                        <ul>
                            <TurnoRedirectWidget/>
                        </ul>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default HostPropertyCare;
