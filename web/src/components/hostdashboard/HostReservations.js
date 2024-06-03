import React, {useEffect, useState} from 'react';
import Pages from "./Pages.js";
import {getUserAttributes} from "../utils/userAttributes";
import '././HostReservations.css';
import info from "../../images/icons/info.png";

const HostReservations = () => {
    const [user, setUser] = useState({});
    const [options] = useState(["Booking requests", "Accepted", "Reserved", "Cancelled", "All"]);
    const [selectedOption, setSelectedOption] = useState(null);

    const handleOptionClick = (option) => {
        setSelectedOption(option);
    };

    useEffect(() => {
        const asyncSetUser = async () => {
            const userAttributes = await getUserAttributes();
            setUser(userAttributes);
        }
        asyncSetUser();
    }, []);
    return (
        <main className="container">
            <section className='body' style={{
                display: "flex",
                flexDirection: "row"
            }}>
                <Pages />
                <section className="reservation-content">
                    <h1 className="header">Manage reservations</h1>
                    <div className="reservation-info">
                        <img src={info} className="info-icon"/>
                        <p className="info-msg">You can manage your reservations or booking requests here</p>
                    </div>
                    <section className="reservation-selector">
                        {options.map((option, index) => (
                            <div
                                key={index}
                                className={`option ${selectedOption === option ? 'selected' : ''}`}
                                onClick={() => handleOptionClick(option)}
                            >
                                {option}
                            </div>
                        ))}
                    </section>
                </section>
            </section>
        </main>
    );
}

export default HostReservations;
