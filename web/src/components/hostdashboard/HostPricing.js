import React, {useEffect, useState} from 'react';
import Pages from "./Pages.js";
import "../hostdashboard/HostPricing.css";
import detailsIcon from "../../images/icons/content-view-detail-list-icon.svg";
import tableIcon from "../../images/icons/content-view-table-list-icon.svg";
import {Auth} from "aws-amplify";
import spinner from "../../images/spinnner.gif";

const HostPricing = () => {
    const [viewMode, setViewMode] = useState('details');
    const [userId, setUserId] = useState(null);
    const [accommodations, setAccommodations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPannel, setCurrentPannel] = useState(1);
    const accommodationsLength = accommodations.length;
    const pricingPannel = (pannelNumber) => setCurrentPannel(pannelNumber);
    const [editMode, setEditMode] = useState(false);
    const [editedRates, setEditedRates] = useState([]);
    const [originalRates, setOriginalRates] = useState([]);

    const itemsPerPageDetails = 3;
    const itemsPerPageTable = 7;

    const activeItemsPerPage = viewMode === 'details' ? itemsPerPageDetails : itemsPerPageTable;

    const startIndex = (currentPannel - 1) * activeItemsPerPage;
    const endIndex = currentPannel * activeItemsPerPage;
    const currentAccommodations = accommodations.slice(startIndex, endIndex);

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

    const fetchAccommodationsRates = async () => {
        setIsLoading(true);
        if (!userId) {
            return;
        } else {
            try {
                const response = await fetch('https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/Host-Onboarding-Production-Read-AccommodationRatesByOwner', {
                    method: 'POST',
                    body: JSON.stringify({
                        UserId: userId
                    }),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                });

                const data = await response.json();

                if (data.body && typeof data.body === 'string') {
                    const parsedBody = JSON.parse(data.body);
                    if (Array.isArray(parsedBody)) {
                        setAccommodations(parsedBody);
                    } else {
                        console.error('Retrieved data is not an array:', parsedBody);
                    }
                }
            } catch (error) {
                console.error("Error fetching accommodation data:", error);
            } finally {
                setIsLoading(false);
            }
        }
    }

    useEffect(() => {
        fetchAccommodationsRates();
    }, [userId]);

    useEffect(() => {
        if (accommodations.length > 0) {
            const initialRates = accommodations.map(acc => acc.Rent.N || acc.Rent.S || '');
            setEditedRates(initialRates);
            setOriginalRates(initialRates);
        }
    }, [accommodations]);

    const handlePageRange = () => {
        const totalPages = Math.ceil(accommodationsLength / activeItemsPerPage);
        let startPage = currentPannel - 2;

        if (startPage < 1) {
            startPage = 1;
        }

        let endPage = startPage + 4;
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(endPage - 4, 1);
        }

        return {startPage, endPage};
    };

    const {startPage, endPage} = handlePageRange();

    const toggleView = (mode) => {
        setViewMode(mode);
        setCurrentPannel(1);
    };

    const handleDetailsView = () => {
        toggleView('details');
    };

    const handleTableView = () => {
        toggleView('table');
    }

    const handleEditMode = () => {
        setEditMode(!editMode);
    }

    const handleRateChange = (e, index) => {
        const updatedRates = [...editedRates];
        updatedRates[index] = e.target.value;
        setEditedRates(updatedRates);
    };

    const handleSaveRates = async () => {
        const updatedAccommodations = accommodations.map((acc, i) => ({
            AccommodationId: acc.ID.S,
            OwnerId: userId,
            Rent: editedRates[i]
        }));

        try {
            const response = await fetch('https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/Host-Onboarding-Production-Update-AccommodationRates', {
                method: 'PUT',
                body: JSON.stringify({
                    Accommodations: updatedAccommodations
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });

            const data = await response.json();
            const parsedBody = JSON.parse(data.body);

            if (parsedBody && typeof parsedBody === 'object') {
                const updatedRates = parsedBody.map(acc => acc.Rent.N || acc.Rent.S || '');
                setOriginalRates(updatedRates);
                alert('Rates updated successfully');
            } else {
                console.error('Rates update failed:', parsedBody);
            }
        } catch
            (error) {
            alert('Rates update failed');
            console.error("Error updating rates:", error);
        }
    };

    const handleUndo = () => {
        setEditedRates([...originalRates]);
    };

    return (
        <div className="containerHostPricing">
            <div className="host-pricing-header">
                <h2 className="host-pricing-title">Pricing</h2>
                <div className="host-pricing-header-buttons">
                    <button className="refresh-accommodation-button" onClick={fetchAccommodationsRates}>Refresh</button>
                    <div className="pricing-switch-layout-button">
                        <button className="details-switch-button" onClick={handleDetailsView}>
                            <img src={detailsIcon} alt="detailsView"/>
                        </button>
                        <button className="table-switch-button" onClick={handleTableView}>
                            <img src={tableIcon} alt="tableView"/>
                        </button>
                    </div>
                </div>
            </div>
            <div className="hostdashboard-container">
                <Pages/>
                <div className="host-pricing-container">
                    {isLoading ? (
                        <div>
                            <img src={spinner}/>
                        </div>
                    ) : (
                        viewMode === 'details' ? (
                            <div className="pricing-details-view">
                                <div className="accommodation-cards">
                                    {currentAccommodations.map((accommodation, index) => {
                                        const globalIndex = startIndex + index;
                                        return (
                                            <div key={globalIndex} className="accommodation-card">
                                                <img
                                                    className="accommodation-card-img"
                                                    src={accommodation.Images.M.image1.S}
                                                    alt="Accommodation Image"
                                                />
                                                <div className="accommodation-card-details">
                                                    <div className="pricing-column">
                                                        <p className="pricing-title">{accommodation.Title.S}</p>
                                                        <p>{accommodation.Country.S}</p>
                                                        <p>{accommodation.City.S}, {accommodation.Street.S}</p>
                                                    </div>
                                                    <div className="pricing-column">
                                                        <p>Guests: {accommodation.GuestAmount.N}</p>
                                                        <p className="pricing-rate-input">
                                                            Rate:{' '}
                                                            {editMode ? (
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    value={editedRates[globalIndex] || ''}
                                                                    onChange={(e) => handleRateChange(e, globalIndex)}
                                                                />
                                                            ) : (
                                                                editedRates[globalIndex] || (accommodation.Rent.N || accommodation.Rent.S)
                                                            )}
                                                        </p>
                                                        <p>Availability: {accommodation.Drafted.BOOL ? 'Unavailable' : 'Available'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="pricing-table-view">
                                <table className="pricing-table">
                                    <thead>
                                    <tr>
                                        <th className="pricing-table-title">Title</th>
                                        <th>Country</th>
                                        <th>Address</th>
                                        <th className="pricing-table-guestAmount">Guests</th>
                                        <th>Rate</th>
                                        <th>Availability</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {currentAccommodations.map((accommodation, index) => {
                                        const globalIndex = startIndex + index;
                                        return (
                                            <tr key={globalIndex}>
                                                <td className="pricing-table-title">{accommodation.Title.S}</td>
                                                <td>{accommodation.Country.S}</td>
                                                <td>{accommodation.City.S}, {accommodation.Street.S}</td>
                                                <td>{accommodation.GuestAmount.N}</td>
                                                <td>
                                                    {editMode ? (
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={editedRates[globalIndex] || ''}
                                                            onChange={(e) => handleRateChange(e, globalIndex)}
                                                        />
                                                    ) : (
                                                        editedRates[globalIndex] || (accommodation.Rent.N || accommodation.Rent.S)
                                                    )}
                                                </td>
                                                <td>{accommodation.Drafted.BOOL ? 'Unavailable' : 'Available'}</td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                    <div className="pricing-bottom-buttons">
                        <div className="pricing-navigation-buttons">
                            <button className="pricing-prev-nav-button"
                                    onClick={() => pricingPannel(currentPannel > 1 ? currentPannel - 1 : 1)}
                                    disabled={currentPannel === 1}>
                                Previous
                            </button>
                            {[...Array(endPage - startPage + 1)].map((_, index) => {
                                const pageIndex = startPage + index;
                                return (
                                    <button key={pageIndex}
                                            className={`pricing-pagenumber-nav-button ${currentPannel === pageIndex ? 'active' : ''}`}
                                            onClick={() => pricingPannel(pageIndex)}>
                                        {pageIndex}
                                    </button>
                                );
                            })}
                            <button className="pricing-next-nav-button"
                                    onClick={() => pricingPannel(currentPannel < Math.ceil(accommodationsLength / activeItemsPerPage) ? currentPannel + 1 : currentPannel)}
                                    disabled={currentPannel === Math.ceil(accommodationsLength / activeItemsPerPage)}>
                                Next
                            </button>
                        </div>
                        <div className="pricing-action-buttons">
                            <button onClick={handleEditMode}>Edit</button>
                            <button onClick={handleUndo}>Undo</button>
                            <button className="pricing-action-save" onClick={handleSaveRates}>Save</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HostPricing;
