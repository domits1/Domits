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
    const itemsPerPage = 3;
    const accommodationsLength = accommodations.length;
    const pricingPannel = (pannelNumber) => setCurrentPannel(pannelNumber);

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
                        console.log('Retrieved data:', parsedBody);
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

    const handlePageRange = () => {
        const totalPages = Math.ceil(accommodationsLength / itemsPerPage);
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
    };

    const handleDetailsView = () => {
        toggleView('details');
    };

    const handleTableView = () => {
        toggleView('table');
    }

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
                                    {accommodations
                                        .slice((currentPannel - 1) * itemsPerPage, currentPannel * itemsPerPage)
                                        .map((accommodation, index) => (
                                            <div key={index} className="accommodation-card">
                                                <img className="accommodation-card-img"
                                                     src={accommodation.Images.M.image1.S} alt="Accommodation Image"/>
                                                <div className="accommodation-card-details">
                                                    <p>{accommodation.Title.S}</p>
                                                    <p>Guests: {accommodation.GuestAmount.N}</p>
                                                    <p>Rate: {accommodation.Rent.N || accommodation.Rent.S}</p>
                                                    <p>Availability: {accommodation.Drafted.BOOL ? 'Unavailable' : 'Available'}</p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ) : (
                            <div className="pricing-table-view">
                                <table className="pricing-table">
                                    <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Guests</th>
                                        <th>Rate</th>
                                        <th>Availability</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {accommodations.map((accommodation, index) => (
                                        <tr key={index}>
                                            <td>{accommodation.Title.S}</td>
                                            <td>{accommodation.GuestAmount.N}</td>
                                            <td>{accommodation.Rent.N || accommodation.Rent.S}</td>
                                            <td>{accommodation.Drafted.BOOL ? 'Unavailable' : 'Available'}</td>
                                        </tr>
                                    ))}
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
                                    onClick={() => pricingPannel(currentPannel < Math.ceil(accommodationsLength / itemsPerPage) ? currentPannel + 1 : currentPannel)}
                                    disabled={currentPannel === Math.ceil(accommodationsLength / itemsPerPage)}>
                                Next
                            </button>
                        </div>
                        <div className="pricing-action-buttons">
                            <button>Edit</button>
                            <button>Undo</button>
                            <button>Save</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HostPricing;
