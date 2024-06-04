import React, {useEffect, useState} from 'react';
import Pages from "./Pages.js";
import '././HostReservations.css';
import info from "../../images/icons/info.png";
import {Auth} from "aws-amplify";
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
import spinner from "../../images/spinnner.gif";

const HostReservations = () => {
    const [userId, setUserId] = useState({});
    const [options] = useState(["Booking requests", "Accepted", "Reserved", "Cancelled", "All"]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [reservations, setReservations] = useState([]);
    const [selectedReservations, setSelectedReservations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);


    const handleCheckboxChange = (event, reservation) => {
        const checked = event.target.checked;
        if (checked) {
            setSelectedReservations([...selectedReservations, reservation]);
        } else {
            setSelectedReservations(selectedReservations.filter(item => item.ID !== reservation.ID));
        }
    };

    const handleOptionClick = (option) => {
        setSelectedOption(option);
    };

    const handleUndoSelect = () => {
        setSelectedReservations([]);
    }

    useEffect(() => {
        const setUserIdAsync = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                await setUserId(userInfo.attributes.sub);
            } catch (error) {
                console.error("Error setting user id:", error);
            }
        };

        setUserIdAsync();
    }, []);
    const fetchReservations = async () => {
        if (!userId) {
            console.log("No user!")
            return;
        } else {
            setIsLoading(true);
            try {
                const response = await fetch('https://5ycj23b6db.execute-api.eu-north-1.amazonaws.com/default/FetchReservations', {
                    method: 'POST',
                    body: JSON.stringify({ HostID: userId }),
                    headers: {'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }
                const data = await response.json();
                if (data.body && typeof data.body === 'string') {
                    const reservationsArray = JSON.parse(data.body);
                    if (Array.isArray(reservationsArray)) {
                        setReservations(reservationsArray);
                    } else {
                        console.error("Parsed data is not an array:", reservationsArray);
                        setReservations([]);
                    }
                }
            } catch (error) {
                console.error("Unexpected error:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };
    const asyncUpdateReservation = async (status) => {
        if (window.confirm(`Do you wish to set these booking request(s) as ${status.toLowerCase()}?`)) {
            for (let i = 0; i < selectedReservations.length; i++) {
                try {
                    const options = {
                        Status: status,
                        ID: selectedReservations[i].ID
                    }
                    console.log(options);
                    const response = await fetch('https://5ycj23b6db.execute-api.eu-north-1.amazonaws.com/default/UpdateReservation', {
                        method: 'PUT',
                        body: JSON.stringify(options),
                        headers: {
                            'Content-type': 'application/json; charset=UTF-8',
                        }
                    });
                    if (!response.ok) {
                        window.alert("Update failed");
                        throw new Error('Failed to fetch');
                    }
                } catch (error) {
                    console.error(error);
                } finally {
                    window.alert("Update successful");
                    setSelectedReservations([]);
                    await fetchReservations();
                }
            }
        }
    }
    useEffect(() => {
        if (userId) {
            fetchReservations();
            setSelectedOption("Booking requests");
        }
    }, [userId]);
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
                    <button className="refresh-btn" onClick={() => fetchReservations()}>Refresh</button>
                    <section className="reservation-display">
                        {isLoading ?
                            <div className="spinner">
                                <img src={spinner} alt='spinner'/>
                            </div>
                            :
                            reservations.length > 0 ? (
                                reservations
                                    .filter(reservation => selectedOption === "Booking requests" ? reservation.Status === "PENDING" :
                                        selectedOption === "Accepted" ? reservation.Status === "ACCEPTED" :
                                            selectedOption === "Reserved" ? reservation.Status === "RESERVED" :
                                                selectedOption === "Cancelled" ? reservation.Status === "CANCELLED" : true)
                                    .map(reservation => (
                                        <div className="reservation-item" key={reservation.ID}>
                                            {selectedOption === "Booking requests" && (
                                                <input
                                                    type="checkbox"
                                                    className="check-box"
                                                    checked={selectedReservations.some(item => item.ID === reservation.ID)}
                                                    onChange={(event) => handleCheckboxChange(event, reservation)}
                                                />
                                            )}
                                            <p>{reservation.ID}</p>
                                            <p>{reservation.Accommodation.Title}</p>
                                            <p>{DateFormatterDD_MM_YYYY(reservation.StartDate)} - {DateFormatterDD_MM_YYYY(reservation.EndDate)}</p>
                                        </div>
                                    ))
                            ) : (
                                <p>You do not have any booking requests at the moment...</p>
                            )}
                    </section>
                    {selectedOption === "Booking requests" && selectedReservations.length > 0 && (
                        <div className="btn-box">
                            <button className="btn-undo" onClick={() => handleUndoSelect()}>Undo select</button>
                            <p className="selected-text">{selectedReservations.length} items selected</p>
                            <div className="btn-group">
                                <button className="btn-deny" onClick={() => asyncUpdateReservation("CANCELLED")}>Deny</button>
                                <button className="btn-approve" onClick={() => asyncUpdateReservation("ACCEPTED")}>Approve</button>
                            </div>
                        </div>
                    )}
                </section>
            </section>
        </main>
    );
}

export default HostReservations;
