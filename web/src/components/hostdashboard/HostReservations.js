import React, {useEffect, useState} from 'react';
import Pages from "./Pages.js";
import '././HostReservations.css';
import info from "../../images/icons/info.png";
import {Auth} from "aws-amplify";
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
import spinner from "../../images/spinnner.gif";
import {useNavigate} from "react-router-dom";

const HostReservations = () => {
    const [userId, setUserId] = useState({});
    const [options] = useState(["Booking requests", "Accepted", "Reserved", "Cancelled", "All"]);
    const [selectedOption, setSelectedOption] = useState("Booking requests");
    const [reservations, setReservations] = useState([]);
    const [pendingReservations, setPendingReservations] = useState([]);
    const [acceptedReservations, setAcceptedReservations] = useState([]);
    const [reservedReservations, setReservedReservations] = useState([]);
    const [cancelledReservations, setCancelledReservations] = useState([]);
    const [reservationDisplay, setReservationDisplay] = useState([]);
    const [selectedReservations, setSelectedReservations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const pageCount = reservationDisplay ? Math.ceil(reservationDisplay.length / 5) : 0;
    const indexOfLastItem = currentPage * 5;
    const indexOfFirstItem = indexOfLastItem - 5;
    const currentItems = reservationDisplay ? reservationDisplay.slice(indexOfFirstItem, indexOfLastItem) : [];
    const navigate = useNavigate();

    useEffect(() => {
        if (currentItems.length === 0 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    }, [currentItems.length, currentPage]);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);
    const handleCheckboxChange = (event, reservation) => {
        const checked = event.target.checked;
        if (checked) {
            setSelectedReservations([...selectedReservations, reservation]);
        } else {
            setSelectedReservations(selectedReservations.filter(item => item.ID !== reservation.ID));
        }
    };

    const handleData = (data) => {
        if (data) {
            setReservations(data.allReservations);
            setAcceptedReservations(data.acceptedReservations);
            setReservedReservations(data.reservedReservations);
            setCancelledReservations(data.cancelledReservations);
            setPendingReservations(data.pendingReservations);
        }
    };
    useEffect(() => {
        switch (selectedOption) {
            case "Booking requests":
                setReservationDisplay(pendingReservations);
                break;
            case "Accepted":
                setReservationDisplay(acceptedReservations);
                break;
            case "Reserved":
                setReservationDisplay(reservedReservations);
                break;
            case "Cancelled":
                setReservationDisplay(cancelledReservations);
                break;
            case "All":
                setReservationDisplay(reservations);
                break;
            default:
                setReservationDisplay([]);
                break;
        }
    }, [selectedOption, reservations, pendingReservations, acceptedReservations, reservedReservations, cancelledReservations]);

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
                const parsedData = JSON.parse(data.body);
                await handleData(parsedData);
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
                    setSelectedReservations([]);
                    await fetchReservations();
                } catch (error) {
                    console.error(error);
                } finally {
                    window.alert("Update successful");
                }
            }
        }
    }
    useEffect(() => {
        if (userId) {
            fetchReservations();
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
                        {isLoading ? (
                            <div className="spinner">
                                <img src={spinner} alt='spinner'/>
                            </div>
                            ) :
                            reservationDisplay && reservationDisplay.length > 0 ? (
                                currentItems
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
                                            <p onClick={() => navigate(`/listingdetails?ID=${reservation.AccoID}`)}
                                            className="reservation-link">{reservation.Title}</p>
                                            <p>{DateFormatterDD_MM_YYYY(reservation.StartDate)} - {DateFormatterDD_MM_YYYY(reservation.EndDate)}</p>
                                            {selectedOption === "All" && (
                                                <div className="status-display">
                                                    <p>Status: </p>
                                                    <p style={{
                                                        color: reservation.Status === 'ACCEPTED' ? 'green' :
                                                            reservation.Status === 'CANCELLED' ? 'red' :
                                                                reservation.Status === 'RESERVED' ? '#003366': 'inherit'
                                                    }}>{reservation.Status}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))
                            ) : (
                                <p>You do not have any booking requests at the moment...</p>
                            )}
                    </section>
                    <section className="pagination">
                        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                            {'<'}
                        </button>
                        {Array.from({length: pageCount}, (_, index) => (
                            <button key={index + 1} onClick={() => paginate(index + 1)}
                                    disabled={currentPage === index + 1}>
                                {index + 1}
                            </button>
                        ))}
                        <button onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === pageCount || pageCount === 0}>
                            {'>'}
                        </button>
                    </section>
                    {selectedOption === "Booking requests" && selectedReservations.length > 0 && (
                        <div className="btn-box">
                            <button className="btn-undo" onClick={() => handleUndoSelect()}>Undo select</button>
                            <p className="selected-text">{selectedReservations.length} items selected</p>
                            <div className="btn-group">
                                <button className="btn-deny" onClick={() => asyncUpdateReservation("CANCELLED")}>Deny
                                </button>
                                <button className="btn-approve"
                                        onClick={() => asyncUpdateReservation("ACCEPTED")}>Approve
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </section>
        </main>
    );
}

export default HostReservations;
