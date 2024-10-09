import React, {useEffect, useState} from 'react';
import Pages from "./Pages.js";
import './HostDistribution.css';
import airbnb_logo from "../../images/icon-airbnb.png";
import booking_logo from "../../images/icon-booking.png";
import expedia_logo from "../../images/icon-expedia.png";
import homeaway_logo from "../../images/icon-homeaway.png";
import tripadvisor_logo from "../../images/icon-tripadvisor.png";
import vrbo_logo from "../../images/icon-vrbo.png";
import three_dots from "../../images/three-dots-grid.svg";
import {Auth} from "aws-amplify";
import {formatDate, uploadICalToS3} from "../utils/iCalFormatHost.js";

function HostDistribution() {
    const [userId, setUserId] = useState(null);
    const [accommodations, setAccommodations] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [dropdownAddChannelsVisible, setDropdownAddChannelsVisible] = useState(false);
    const [activeManageDropdown, setActiveManageDropdown] = useState(null);
    const [activeThreeDotsDropdown, setActiveThreeDotsDropdown] = useState(null);
    const [channelData, setChannelData] = useState([]);
    const [activeAddAccommodationsView, setActiveAddAccommodationsView] = useState(null);
    const [tempListedAccommodations, setTempListedAccommodations] = useState([]);
    const [activeRemoveAccommodationsView, setActiveRemoveAccommodationsView] = useState(null);

    const [currentPannel, setCurrentPannel] = useState(1);
    const itemsPerPage = 5;
    const channelLength = channelData.length;
    const channelPannel = (pannelNumber) => setCurrentPannel(pannelNumber);

    const [selectedChannel, setSelectedChannel] = useState("Select Channel");
    const [apiKey, setApiKey] = useState("");

    useEffect(() => {
        const asyncSetUserId = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setUserId(userInfo.attributes.sub);
            } catch (error) {
                console.error("Error setting user id:", error);
            }
        };

        asyncSetUserId();
    }, []);

    useEffect(() => {
            if (!userId) return;
            const asyncRetrieveBookingData = async () => {
                try {
                    const response = await fetch('https://fqujcw5loe.execute-api.eu-north-1.amazonaws.com/default/retrieveBookingsDataByUserId', {
                        method: 'POST',
                        body: JSON.stringify({
                            GuestID: userId,
                            Status: 'Accepted'
                        }),
                        headers: {
                            'Content-type': 'application/json; charset=UTF-8',
                        }
                    });
                    if (!response.ok) {
                        throw new Error('Failed to fetch');
                    }
                    const data = await response.json();

                    if (data.body && typeof data.body === 'string') {
                        const retrievedBookingDataArray = JSON.parse(data.body);

                        if (Array.isArray(retrievedBookingDataArray)) {
                            setBookings(retrievedBookingDataArray);
                        } else {
                            console.error('Retrieved data is not an array:', retrievedBookingDataArray);
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch booking data:', error);
                }
            }
            asyncRetrieveBookingData();
        }, [userId]
    );

    useEffect(() => {
            const handleGetAccomodations = async () => {
                if (!userId) return;

                else {
                    const ownerId = userId;

                    try {
                        const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/getAccommodationByOwner', {
                            method: 'POST',
                            body: JSON.stringify({id: ownerId}),
                            headers: {
                                'Content-type': 'application/json; charset=UTF-8',
                            }
                        });
                        if (!response.ok) {
                            throw new Error('Failed to fetch');
                        }
                        const data = await response.json();

                        if (data.body && typeof data.body === 'string') {
                            const accommodationsArray = JSON.parse(data.body);
                            if (Array.isArray(accommodationsArray)) {
                                setAccommodations(accommodationsArray);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to fetch accommodations:', error);
                    }
                }
            };

            handleGetAccomodations();
        }, [userId]
    );

    const asyncRetrieveChannelData = async () => {
        if (!userId) return;
        try {
            const response = await fetch('https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/retrieveChannelsData', {
                method: 'POST',
                body: JSON.stringify({
                    UserId: userId
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch');
            }
            const data = await response.json();

            if (data.body && typeof data.body === 'string') {
                const retrievedChannelDataArray = JSON.parse(data.body);
                if (Array.isArray(retrievedChannelDataArray)) {
                    setChannelData(retrievedChannelDataArray);
                } else {
                    console.error('Retrieved data is not an array:', retrievedChannelDataArray);
                }
            }
        } catch (error) {
            console.error('Failed to fetch channel data:', error);
        }
    }

    useEffect(() => {
        asyncRetrieveChannelData();
    }, [userId]);

    const getChannelLogo = (channelName) => {
        switch (channelName) {
            case 'Airbnb':
                return airbnb_logo;
            case 'Booking.com':
                return booking_logo;
            case 'Expedia':
                return expedia_logo;
            case 'HomeAway':
                return homeaway_logo;
            case 'TripAdvisor':
                return tripadvisor_logo;
            case 'Vrbo':
                return vrbo_logo;
            default:
                return '';
        }
    };

    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert("The URL has been copied to your clipboard: " + text);
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    };

    const handleICal = async (e) => {
        e.preventDefault();

        let uid;
        let dtStamp;
        let dtStart;
        let dtEnd;
        let accommodationId;
        let street;
        let city;
        let country;
        let location;
        let status;
        let summary;
        let ownerId;

        let params;

        let listOfAccommodations = [];

        for (let i = 0; i < accommodations.length; i++) {
            for (let j = 0; j < accommodations[i].DateRanges.L.length; j++) {
                uid = generateUUID();
                dtStamp = formatDate(new Date());
                dtStart = formatDate(new Date(accommodations[i].DateRanges.L[j].M.startDate.S));
                dtEnd = formatDate(new Date(accommodations[i].DateRanges.L[j].M.endDate.S));
                accommodationId = accommodations[i].ID.S;
                street = accommodations[i].Street.S;
                city = accommodations[i].City.S;
                country = accommodations[i].Country.S;
                location = street + ', ' + city + ', ' + country;
                if (accommodations[i].Drafted.BOOL === true) {
                    status = 'Unavailable';
                } else if (accommodations[i].Drafted.BOOL === false) {
                    status = 'Available';
                }
                summary = accommodations[i].Title.S + ' - ' + status;
                ownerId = accommodations[i].OwnerId.S;

                params = {
                    UID: uid,
                    Dtstamp: dtStamp,
                    Dtstart: dtStart,
                    Dtend: dtEnd,
                    Summary: summary,
                    Location: location,
                    AccommodationId: accommodationId,
                    OwnerId: ownerId,
                }
                listOfAccommodations.push(params);
            }
        }

        try {
            const uploadURL = await uploadICalToS3(listOfAccommodations, userId);
            if (uploadURL) {
                copyToClipboard(uploadURL);
            } else {
                console.error('Failed to POST iCal data');
            }
        } catch (error) {
            console.error('Failed to POST iCal data:', error);
        }
    }

    const handlePageRange = () => {
        const totalPages = Math.ceil(channelLength / itemsPerPage);
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

    const toggleAddChannelButtonMenu = () => {
        setDropdownAddChannelsVisible(!dropdownAddChannelsVisible);
        setActiveManageDropdown(null);
        setActiveThreeDotsDropdown(null);
        setActiveRemoveAccommodationsView(null);
    }

    const handleSelectChange = (event) => {
        setSelectedChannel(event.target.value);
    };

    const handleInputChange = (event) => {
        setApiKey(event.target.value);
    };

    const handleCancelAddChannel = () => {
        // Reset state to default values
        setSelectedChannel("Select Channel");
        setApiKey("");

        // Close the dropdown
        setDropdownAddChannelsVisible(false);
    };

    const handleAddChannel = async (e) => {
        e.preventDefault();
        // Add channel to the database
        let id = generateUUID();
        let ChannelName = selectedChannel;
        let APIKey = apiKey;
        let UserId = userId;
        let ListedAccommodations = [];
        let Status = false;

        if (selectedChannel === "Select Channel" && apiKey === "" || selectedChannel === "Select Channel" || apiKey === "") {
            alert('Please fill in all fields');
            return;
        }

        try {
            const response = await fetch('https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/CreateChannel', {
                method: 'POST',
                body: JSON.stringify({
                    id: id,
                    ChannelName: ChannelName,
                    APIKey: APIKey,
                    UserId: UserId,
                    ListedAccommodations: ListedAccommodations,
                    Status: Status
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });

            const data = await response.json();

            if (data.statusCode === 200) {
                alert('Channel added successfully');
                // Reset state to default values
                setSelectedChannel("Select Channel");
                setApiKey("");
                setDropdownAddChannelsVisible(!dropdownAddChannelsVisible);

                await asyncRetrieveChannelData();
            } else {
                alert('Failed to add channel');
            }
        } catch (error) {
            console.error('Failed to add channel:', error);
        }
    }

    const renderAddChannelButtonMenu = () => {
        return (
            <div className="addChannelButtonMenuContent">
                <div className="addChannelInputFields">
                    <label className="channelLabel">Channel</label>
                    <div className="channelCustomDropdown">
                        <select
                            className="channels"
                            value={selectedChannel}
                            onChange={handleSelectChange}
                        >
                            <option value="Select Channel">Select Channel</option>
                            <option value="Airbnb">Airbnb</option>
                            <option value="Booking.com">Booking.com</option>
                            <option value="Expedia">Expedia</option>
                            <option value="HomeAway">HomeAway</option>
                            <option value="TripAdvisor">TripAdvisor</option>
                            <option value="Vrbo">Vrbo</option>
                        </select>
                    </div>
                    <label className="channelLabel">API Key</label>
                    <input
                        type={"text"}
                        placeholder={"API Key"}
                        className={"channelAPIKey"}
                        value={apiKey}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="addCancelButtonContainer">
                    <button className={"addChannelButtonMenuButton Cancel"} onClick={handleCancelAddChannel}>Cancel
                    </button>
                    <button className="addChannelButtonMenuButton Add" onClick={handleAddChannel}>Add</button>
                </div>
            </div>
        );
    };

    const toggleChannelManageMenu = (channelId) => {
        if (activeManageDropdown === channelId) {
            setActiveManageDropdown(null);
            setDropdownAddChannelsVisible(false);
            setActiveThreeDotsDropdown(null);
            setActiveAddAccommodationsView(null);
            setActiveRemoveAccommodationsView(null);
        } else {
            setActiveManageDropdown(channelId);
            setDropdownAddChannelsVisible(false);
            setActiveThreeDotsDropdown(null);
            setActiveAddAccommodationsView(null);
            setActiveRemoveAccommodationsView(null);
        }
    }

    const handleEnableButton = (channelId) => {
        setChannelData(prevState => {
            const channelIndex = prevState.findIndex(channel => channel.id.S === channelId);

            if (channelIndex === -1) {
                console.error(`Channel with ID ${channelId} not found`);
                return prevState;
            }

            const updatedChannels = [...prevState];
            updatedChannels[channelIndex].Status.BOOL = true;

            return updatedChannels;
        });
    };

    const handleDisableButton = (channelId) => {
        setChannelData(prevState => {
            const channelIndex = prevState.findIndex(channel => channel.id.S === channelId);

            if (channelIndex === -1) {
                console.error(`Channel with ID ${channelId} not found`);
                return prevState;
            }

            const updatedChannels = [...prevState];
            updatedChannels[channelIndex].Status.BOOL = false;

            return updatedChannels;
        });
    };

    const handleViewAddAccommodationsButton = (channelId) => {
        if (activeAddAccommodationsView === channelId) {
            setActiveAddAccommodationsView(null);
            setActiveRemoveAccommodationsView(null);
        } else {
            setActiveAddAccommodationsView(channelId);
            setActiveRemoveAccommodationsView(null);
        }
    };

    const handleViewRemoveAccommodationsButton = (channelId) => {
        if (activeRemoveAccommodationsView === channelId) {
            setActiveRemoveAccommodationsView(null);
            setActiveAddAccommodationsView(null)
        } else {
            setActiveRemoveAccommodationsView(channelId);
            setActiveAddAccommodationsView(null)
        }
    };

    const handleAddAccommodationButton = (channelId, accommodationId) => {
        const accommodationToAdd = accommodations.find(acc => acc.ID.S === accommodationId);

        if (!accommodationToAdd) {
            console.error('Accommodation not found');
            return;
        }

        const newAccommodation = {
            AccommodationId: {S: accommodationToAdd.ID.S},
            Title: {S: accommodationToAdd.Title.S},
            GuestAmount: {N: accommodationToAdd.GuestAmount.N},
            Rent: {S: accommodationToAdd.Rent.S},
            Availability: {S: accommodationToAdd.Drafted.BOOL ? 'Unavailable' : 'Available'}
        };

        setTempListedAccommodations(prevState => {
            const existingAccommodations = prevState[channelId] || [];
            const isAlreadyAdded = existingAccommodations.some(acc => acc.AccommodationId.S === newAccommodation.AccommodationId.S);

            if (!isAlreadyAdded) {
                return {
                    ...prevState,
                    [channelId]: [...existingAccommodations, newAccommodation]
                };
            } else {
                return prevState;
            }
        });
    };

    const handleRemoveAccommodationButton = (channelId, accommodationId) => {
        setTempListedAccommodations(prevState => {
            const existingAccommodations = prevState[channelId] || [];
            return {
                ...prevState,
                [channelId]: existingAccommodations.filter(acc => acc.AccommodationId.S !== accommodationId)
            };
        });

        setChannelData(prevState => {
            const channelIndex = prevState.findIndex(channel => channel.id.S === channelId);
            if (channelIndex !== -1) {
                const updatedChannels = [...prevState];
                const existingListedAccommodations = updatedChannels[channelIndex].ListedAccommodations.L || [];

                updatedChannels[channelIndex].ListedAccommodations.L = existingListedAccommodations.filter(
                    acc => acc.M.AccommodationId.S !== accommodationId
                );

                return updatedChannels;
            }
            return prevState;
        });
    };

    const renderAddAccommodationsView = (id) => {
        const channelId = id;

        const listedAccommodations = channelData.find(channel => channel.id.S === channelId)?.ListedAccommodations.L || [];
        const tempAccommodations = tempListedAccommodations[channelId] || [];

        const listedAccommodationIds = [
            ...listedAccommodations.map(acc => acc.M.AccommodationId.S),
            ...tempAccommodations.map(acc => acc.AccommodationId.S),
        ];

        return (
            <div className="addAccommodatonsViewContent">
                <div className='closeAddViewContent'>
                    <button className='closeAddViewButton'
                            onClick={() => handleViewAddAccommodationsButton(channelId)}>
                        X
                    </button>
                </div>
                <table>
                    <thead>
                    <tr>
                        <th>Accommodation</th>
                        <th>Guest Amount</th>
                        <th>Price</th>
                        <th>Availability</th>
                    </tr>
                    </thead>
                    <tbody>
                    {accommodations
                        .filter(accommodation => !listedAccommodationIds.includes(accommodation.ID.S))
                        .map((accommodation) => (
                            <tr key={accommodation.ID.S}>
                                <td>{accommodation.Title.S}</td>
                                <td>{accommodation.GuestAmount.N}</td>
                                <td>{accommodation.Rent.S}</td>
                                <td>{accommodation.Drafted.BOOL ? 'Unavailable' : 'Available'}</td>
                                <td>
                                    <button onClick={() => handleAddAccommodationButton(channelId, accommodation.ID.S)}>
                                        Add
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderRemoveAccommodationsView = (id) => {
        const channelId = id;

        const listedAccommodations = channelData.find(channel => channel.id.S === channelId)?.ListedAccommodations.L || [];
        const tempAccommodations = tempListedAccommodations[channelId] || [];

        const combinedAccommodations = [
            ...listedAccommodations.map(acc => ({...acc.M, id: {S: acc.M.AccommodationId.S}})),
            ...tempAccommodations.map(acc => ({...acc, id: {S: acc.AccommodationId.S}}))
        ];

        return (
            <div className="removeAccommodationsViewContent">
                <div className='closeRemoveViewContent'>
                    <button className='closeRemoveViewButton'
                            onClick={() => handleViewRemoveAccommodationsButton(channelId)}>
                        X
                    </button>
                </div>
                <table>
                    <thead>
                    <tr>
                        <th>Accommodation</th>
                        <th>Guest Amount</th>
                        <th>Price</th>
                        <th>Availability</th>
                    </tr>
                    </thead>
                    <tbody>
                    {combinedAccommodations.map((accommodation) => (
                        <tr key={accommodation.AccommodationId.S}>
                            <td>{accommodation.Title.S}</td>
                            <td>{accommodation.GuestAmount.N}</td>
                            <td>{accommodation.Rent.S}</td>
                            <td>{accommodation.Availability.S}</td>
                            <td>
                                <button
                                    onClick={() => handleRemoveAccommodationButton(channelId, accommodation.AccommodationId.S)}>
                                    Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderChannelManageMenu = (channelId) => {
        return (
            <div className="channelManageMenuContent">
                <div className="channelManageButtonContainer">
                    <button className="channelManageMenuButton"
                            onClick={() => handleViewAddAccommodationsButton(channelId)}>
                        + Add Accommodations
                    </button>
                    <div
                        className={`addAccommodationsViewContainer ${activeAddAccommodationsView === channelId ? 'visible' : ''}`}>
                        {activeAddAccommodationsView === channelId && renderAddAccommodationsView(channelId)}
                    </div>
                    <button className="channelManageMenuButton"
                            onClick={() => handleViewRemoveAccommodationsButton(channelId)}>
                        - Remove Accommodations
                    </button>
                    <div
                        className={`removeAccommodationsViewContainer ${activeRemoveAccommodationsView === channelId ? 'visible' : ''}`}>
                        {activeRemoveAccommodationsView === channelId && renderRemoveAccommodationsView(channelId)}
                    </div>
                    <button className="channelManageMenuButton enabled" onClick={() => handleEnableButton(channelId)}>
                        Enable channel
                    </button>
                    <button className="channelManageMenuButton disabled" onClick={() => handleDisableButton(channelId)}>
                        Disable channel
                    </button>
                </div>
            </div>
        );
    };

    const handelSingleChannelSync = async (channelId) => {
        const channel = channelData.find(channel => channel.id.S === channelId);

        if (!channel) {
            console.error(`Channel with ID ${channelId} not found`);
            return;
        }

        const accommodationsToSync = tempListedAccommodations[channelId] || [];

        if (accommodationsToSync.length === 0) {
            try {
                const response = await fetch('https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/EditSingleChannel', {
                    method: 'POST',
                    body: JSON.stringify({
                        id: channelId,
                        APIKey: channel.APIKey.S,
                        ChannelName: channel.ChannelName.S,
                        ListedAccommodations: channel.ListedAccommodations || { L: [] },
                        Status: channel.Status.BOOL,
                        UserId: channel.UserId.S
                    }),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8'
                    }
                });

                const result = await response.json();

                if (result.statusCode === 200) {
                    alert('Channel synced successfully!');
                } else {
                    alert('Failed to sync the channel');
                }
            } catch (error) {
                console.error('Error syncing the channel without changes:', error);
            }
            setActiveThreeDotsDropdown(null);
            return;
        }

        const currentListedAccommodations = channel.ListedAccommodations?.L || [];
        const updatedListedAccommodations = [
            ...currentListedAccommodations,
            ...accommodationsToSync.map(acc => ({
                M: {
                    AccommodationId: { S: acc.AccommodationId.S },
                    Title: { S: acc.Title.S },
                    GuestAmount: { N: acc.GuestAmount.N },
                    Rent: { S: acc.Rent.S },
                    Availability: { S: acc.Availability.S }
                }
            }))
        ];

        try {
            const response = await fetch('https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/EditSingleChannel', {
                method: 'POST',
                body: JSON.stringify({
                    id: channelId,
                    APIKey: channel.APIKey.S,
                    ChannelName: channel.ChannelName.S,
                    ListedAccommodations: { L: updatedListedAccommodations },
                    Status: channel.Status.BOOL,
                    UserId: channel.UserId.S
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8'
                }
            });

            const result = await response.json();

            if (result.statusCode === 200) {
                alert('Accommodations synced successfully!');

                setTempListedAccommodations(prevState => {
                    const newState = { ...prevState };
                    delete newState[channelId];
                    return newState;
                });

                setChannelData(prevState => {
                    const updatedChannels = [...prevState];
                    const channelIndex = updatedChannels.findIndex(ch => ch.id.S === channelId);
                    if (channelIndex !== -1) {
                        updatedChannels[channelIndex].ListedAccommodations.L = updatedListedAccommodations;
                    }
                    setActiveThreeDotsDropdown(null);
                    return updatedChannels;
                });
            } else {
                alert('Failed to sync accommodations');
            }
        } catch (error) {
            console.error('Error syncing accommodations:', error);
        }
    };

    const toggleThreeDotsMenu = (channelId) => {
        if (activeThreeDotsDropdown === channelId) {
            setActiveThreeDotsDropdown(null);
            setDropdownAddChannelsVisible(false);
            setActiveManageDropdown(null);
            setActiveAddAccommodationsView(null);
        } else {
            setActiveThreeDotsDropdown(channelId);
            setDropdownAddChannelsVisible(false);
            setActiveManageDropdown(null);
        }
    }

    const handleDeleteChannel = async (channelId) => {
        if (!window.confirm('Are you sure you want to delete this channel?')) return;

        try {
            const response = await fetch('https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/DeleteChannel', {
                method: 'DELETE',
                body: JSON.stringify({
                    id: channelId
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });

            const data = await response.json();

            if (data.statusCode === 200) {
                alert('Channel deleted successfully');
                setChannelData(prevData => prevData.filter(channel => channel.id.S !== channelId));
                setCurrentPannel(1);
                setActiveThreeDotsDropdown(null);
            } else {
                alert('Failed to delete channel');
            }
        } catch (error) {
            console.error('Failed to delete channel:', error);
        }
    };

    const renderThreeDotsMenu = (channelId) => {
        return (
            <div className="threeDotsMenuContent">
                <button className="threeDotsButtonMenu delete"
                        onClick={() => handleDeleteChannel(channelId)}>
                    Delete
                </button>
                <button className="threeDotsButtonMenu"
                        onClick={() => handelSingleChannelSync(channelId)}>
                    Sync
                </button>
            </div>
        );
    }

    return (
        <div className="containerHostDistribution">
            <div className="host-dist-header">
                <h2 className="connectedChannelTitle">Connected channels</h2>
                <button className="syncChannelButton" onClick={handleICal}>
                    Export to calender
                </button>
                <div className="addChannelButtonMenuContainer">
                    <button className="addChannelButton" onClick={toggleAddChannelButtonMenu}>
                        + Add channel
                    </button>
                    <div className={`addChannelButtonMenu ${dropdownAddChannelsVisible ? 'visible' : ''}`}>
                        {renderAddChannelButtonMenu()}
                    </div>
                </div>
            </div>
            <div className="host-dist-content">
                <Pages/>
                <div className="channelContents">
                    <div className="contentContainer-channel">
                        {channelData
                            .sort((a, b) => {
                                const nameA = a.ChannelName.S.toLowerCase();
                                const nameB = b.ChannelName.S.toLowerCase();
                                if (nameA < nameB) return -1;
                                if (nameA > nameB) return 1;
                                return 0;
                            })
                            .slice((currentPannel - 1) * itemsPerPage, currentPannel * itemsPerPage)
                            .map((channel) => (
                                <div className="host-dist-box-container" key={channel.id.S}>
                                    <div className="host-dist-box-row">
                                        <img className="channelLogo"
                                             src={getChannelLogo(channel.ChannelName.S)}
                                             alt={`${channel.ChannelName.S} Logo`}
                                        />
                                        <p className="channelFont">{channel.ChannelName.S || 'Channel'}</p>
                                        <p>
                                            <label className="toggle-status-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={channel.Status.BOOL === true}
                                                    onChange={() => channel.Status.BOOL ? handleDisableButton(channel.id.S) : handleEnableButton(channel.id.S)}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                        </p>
                                        <p className="totalListedAccommodations">{channel.ListedAccommodations.L.length || '0'} Listed
                                            Accommodations
                                        </p>
                                        <button className="channelManageButton"
                                                onClick={() => toggleChannelManageMenu(channel.id.S)}>
                                            Manage
                                        </button>
                                        {activeManageDropdown === channel.id.S && (
                                            <div className="channelManageContainer visible">
                                                {renderChannelManageMenu(channel.id.S)}
                                            </div>
                                        )}
                                        <button className="threeDotsButton"
                                                onClick={() => toggleThreeDotsMenu(channel.id.S)}>
                                            <img src={three_dots} alt="Three Dots"/>
                                        </button>
                                        {activeThreeDotsDropdown === channel.id.S && (
                                            <div className="threeDotsContainer visible">
                                                {renderThreeDotsMenu(channel.id.S)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                    <div className="channelNavigation">
                        <button className="prevChannelButton"
                                onClick={() => channelPannel(currentPannel > 1 ? currentPannel - 1 : 1)}
                                disabled={currentPannel === 1}>
                            Previous
                        </button>
                        {[...Array(endPage - startPage + 1)].map((_, index) => {
                            const pageIndex = startPage + index;
                            return (
                                <button key={pageIndex}
                                        className={`channelPageButton ${currentPannel === pageIndex ? 'active' : ''}`}
                                        onClick={() => channelPannel(pageIndex)}>
                                    {pageIndex}
                                </button>
                            );
                        })}
                        <button className="nextChannelButton"
                                onClick={() => channelPannel(currentPannel < Math.ceil(channelLength / itemsPerPage) ? currentPannel + 1 : currentPannel)}
                                disabled={currentPannel === Math.ceil(channelLength / itemsPerPage)}>
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HostDistribution;
