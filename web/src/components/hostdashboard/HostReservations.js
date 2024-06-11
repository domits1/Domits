import React, {useEffect, useState} from 'react';
import Pages from "./Pages.js";
import '././HostReservations.css';
import info from "../../images/icons/info.png";
import {Auth} from "aws-amplify";
import spinner from "../../images/spinnner.gif";
import ReservationItem from "../utils/ReservationItem";
import chevron from "../../images/icons/sort-solid.svg";

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
    const amountOfItems = 10;
    const pageCount = reservationDisplay ? Math.ceil(reservationDisplay.length / amountOfItems) : 0;
    const indexOfLastItem = currentPage * amountOfItems;
    const indexOfFirstItem = indexOfLastItem - amountOfItems;
    const currentItems = reservationDisplay ? reservationDisplay.slice(indexOfFirstItem, indexOfLastItem) : [];
    const [reversed, setReversed] = useState(false);

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

    const selectAll = () => {
        setSelectedReservations(pendingReservations);
    }

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
                setReservationDisplay(!reversed ? pendingReservations : pendingReservations.reverse());
                break;
            case "Accepted":
                setReservationDisplay(!reversed ? acceptedReservations : acceptedReservations.reverse());
                break;
            case "Reserved":
                setReservationDisplay(!reversed ? reservedReservations :reservedReservations.reverse());
                break;
            case "Cancelled":
                setReservationDisplay(!reversed ? cancelledReservations : cancelledReservations.reverse());
                break;
            case "All":
                setReservationDisplay(!reversed ? reservations : reservations.reverse());
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
    const fetchReservations = async (index) => {
        if (!userId) {
            console.log("No user!")
            return;
        } else {
            setIsLoading(true);
            try {
                const response = await fetch('https://5ycj23b6db.execute-api.eu-north-1.amazonaws.com/default/FetchReservations', {
                    method: 'POST',
                    body: JSON.stringify({
                        HostID: userId,
                        index: index ? index : null
                    }),
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

    const sortReservations = async (index) => {
        await fetchReservations(index);
        setReversed(!reversed);
    }
    const asyncUpdateReservation = async (status) => {
        if (window.confirm(`Do you wish to set these booking request(s) as ${status.toLowerCase()}?`)) {
                try {
                    for (let i = 0; i < selectedReservations.length; i++) {
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
                    <div className="util-box">
                        {selectedOption === "Booking requests" &&
                            <button className="refresh-btn" onClick={() => selectAll()}>Select all</button>}
                        <button className="refresh-btn" onClick={() => fetchReservations()}>Refresh</button>
                    </div>
                    <section className="reservation-display">
                        {isLoading ? (
                                <div className="spinner">
                                <img src={spinner} alt='spinner'/>
                                </div>
                            ) :
                            reservationDisplay && reservationDisplay.length > 0 ? (
                                <table>
                                    <thead>
                                    <tr>
                                        {selectedOption === 'Booking requests' && <th>Select</th>}
                                        <th>Requested on<img src={chevron} className="sort" alt="sort" onClick={()=> sortReservations('createdAt')}/></th>
                                        <th>Guest name</th>
                                        <th>Reservation date</th>
                                        {selectedOption === 'All' && <th>Status<img className="sort" src={chevron} onClick={()=> sortReservations('Status')} alt="sort" /></th>}
                                        <th>Price<img src={chevron} className="sort" onClick={()=> sortReservations('Price')} alt="sort"/></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {currentItems.map(reservation => (
                                        <ReservationItem
                                            key={reservation.ID}
                                            reservation={reservation}
                                            selectedOption={selectedOption}
                                            selectedReservations={selectedReservations}
                                            handleCheckboxChange={handleCheckboxChange}
                                        />
                                    ))}
                                    </tbody>
                                </table>
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
                                <button className="btn-deny" onClick={() => asyncUpdateReservation("Cancelled")}>Deny
                                </button>
                                <button className="btn-approve"
                                        onClick={() => asyncUpdateReservation("Accepted")}>Approve
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
