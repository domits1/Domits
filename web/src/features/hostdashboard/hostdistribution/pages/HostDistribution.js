import React, {useEffect, useState} from 'react';
import Pages from "../../Pages.js";
import '../styles/HostDistribution.css';
import airbnb_logo from "../../../../images/icon-airbnb.png";
import booking_logo from "../../../../images/icon-booking.png";
import expedia_logo from "../../../../images/icon-expedia.png";
import homeaway_logo from "../../../../images/icon-homeaway.png";
import tripadvisor_logo from "../../../../images/icon-tripadvisor.png";
import vrbo_logo from "../../../../images/icon-vrbo.png";
import three_dots from "../../../../images/three-dots-grid.svg";
import {Auth} from "aws-amplify";
import allChannels from "../store/channelData.js";
import {generateUUID} from "../../../../utils/generateUUID.js";
import {getChannelLogo} from "../utils/getChannelLogo.js"
import {handleICal} from "../utils/iCalHandler.js";
import {handlePageRange} from "../utils/handlePageRange.js";
import {renderAddChannelButtonMenu} from "../components/renderAddChannelButtonMenu"
import {deleteChannelService} from "../services/deleteChannelService.js";
import {fetchChannels} from "../services/fetchChannelsService.js"
import {handleAddChannelService} from "../services/addChannelService.js";
import useFetchUser from "../../../../hooks/useFetchUser.js";
import useFetchChannels from "../hooks/useFetchChannels.js";
import useFetchAccommodations from "../hooks/useFetchAccommodations.js";

function HostDistribution() {
    const userId = useFetchUser();
    const accommodations = useFetchAccommodations(userId);
    const [dropdownAddChannelsVisible, setDropdownAddChannelsVisible] = useState(false);
    const [activeManageDropdown, setActiveManageDropdown] = useState(null);
    const [activeThreeDotsDropdown, setActiveThreeDotsDropdown] = useState(null);
    const channelData = useFetchChannels(userId);
    const [activeAddAccommodationsView, setActiveAddAccommodationsView] = useState(null);
    const [tempListedAccommodations, setTempListedAccommodations] = useState([]);
    const [activeRemoveAccommodationsView, setActiveRemoveAccommodationsView] = useState(null);

    const [currentPannel, setCurrentPannel] = useState(1);
    const itemsPerPage = 5;
    const channelLength = channelData.length;
    const channelPannel = (pannelNumber) => setCurrentPannel(pannelNumber);

    const [selectedChannel, setSelectedChannel] = useState("Select Channel");
    const [apiKey, setApiKey] = useState("");
    const addedChannels = channelData.map(channel => channel.ChannelName);

    const {startPage, endPage} = handlePageRange(channelLength, itemsPerPage, currentPannel);

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
        setSelectedChannel("Select Channel");
        setApiKey("");

        setDropdownAddChannelsVisible(false);
    };

    const handleAddChannel = async (e) => {
        e.preventDefault();

        const result = await handleAddChannelService(userId, selectedChannel, apiKey);

        if (result.success) {
            alert('Channel added successfully');
            setSelectedChannel("Select Channel");
            setApiKey("");
            setDropdownAddChannelsVisible(false);

            const updatedChannels = await fetchChannels(userId);
            setChannelData(updatedChannels);
        } else {
            alert(result.error || 'Failed to add channel');
        }
    };

    const renderAddChannelButtonMenu = () => {

        const availableChannels = allChannels.filter(channel => !addedChannels.includes(channel));

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
                            {availableChannels.map(channel => (
                                <option key={channel} value={channel}>
                                    {channel}
                                </option>
                            ))}
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
            const channelIndex = prevState.findIndex(channel => channel.id === channelId);

            if (channelIndex === -1) {
                console.error(`Channel with ID ${channelId} not found`);
                return prevState;
            }

            const updatedChannels = [...prevState];
            updatedChannels[channelIndex].Status = true;

            return updatedChannels;
        });
    };

    const handleDisableButton = (channelId) => {
        setChannelData(prevState => {
            const channelIndex = prevState.findIndex(channel => channel.id === channelId);

            if (channelIndex === -1) {
                console.error(`Channel with ID ${channelId} not found`);
                return prevState;
            }

            const updatedChannels = [...prevState];
            updatedChannels[channelIndex].Status = false;

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
        const accommodationToAdd = accommodations.find(acc => acc.ID === accommodationId);

        if (!accommodationToAdd) {
            console.error('Accommodation not found');
            return;
        }

        const newAccommodation = {
            AccommodationId: {S: accommodationToAdd.ID},
            Title: {S: accommodationToAdd.Title.S},
            GuestAmount: {N: accommodationToAdd.GuestAmount.N},
            Rent: {S: accommodationToAdd.Rent.S},
            Availability: {S: accommodationToAdd.Drafted ? 'Unavailable' : 'Available'}
        };

        setTempListedAccommodations(prevState => {
            const existingAccommodations = prevState[channelId] || [];
            const isAlreadyAdded = existingAccommodations.some(acc => acc.AccommodationId === newAccommodation.AccommodationId);

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
                [channelId]: existingAccommodations.filter(acc => acc.AccommodationId !== accommodationId)
            };
        });

        setChannelData(prevState => {
            const channelIndex = prevState.findIndex(channel => channel.id === channelId);
            if (channelIndex !== -1) {
                const updatedChannels = [...prevState];
                const existingListedAccommodations = updatedChannels[channelIndex].ListedAccommodations.L || [];

                updatedChannels[channelIndex].ListedAccommodations.L = existingListedAccommodations.filter(
                    acc => acc.M.AccommodationId !== accommodationId
                );

                return updatedChannels;
            }
            return prevState;
        });
    };

    const renderAddAccommodationsView = (id) => {
        const channelId = id;

        const listedAccommodations = channelData.find(channel => channel.id === channelId)?.ListedAccommodations.L || [];
        const tempAccommodations = tempListedAccommodations[channelId] || [];

        const listedAccommodationIds = [
            ...listedAccommodations.map(acc => acc.M.AccommodationId),
            ...tempAccommodations.map(acc => acc.AccommodationId),
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
                        .filter(accommodation => !listedAccommodationIds.includes(accommodation.ID))
                        .map((accommodation) => (
                            <tr key={accommodation.ID}>
                                <td>{accommodation.Title.S}</td>
                                <td>{accommodation.GuestAmount.N}</td>
                                <td>{accommodation.Rent.S}</td>
                                <td>{accommodation.Drafted ? 'Unavailable' : 'Available'}</td>
                                <td>
                                    <button onClick={() => handleAddAccommodationButton(channelId, accommodation.ID)}>
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

        const listedAccommodations = channelData.find(channel => channel.id === channelId)?.ListedAccommodations.L || [];
        const tempAccommodations = tempListedAccommodations[channelId] || [];

        const combinedAccommodations = [
            ...listedAccommodations.map(acc => ({...acc.M, id: {S: acc.M.AccommodationId}})),
            ...tempAccommodations.map(acc => ({...acc, id: {S: acc.AccommodationId}}))
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
                        <tr key={accommodation.AccommodationId}>
                            <td>{accommodation.Title.S}</td>
                            <td>{accommodation.GuestAmount.N}</td>
                            <td>{accommodation.Rent.S}</td>
                            <td>{accommodation.Availability.S}</td>
                            <td>
                                <button
                                    onClick={() => handleRemoveAccommodationButton(channelId, accommodation.AccommodationId)}>
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

    const handelSingleChannelSave = async (channelId) => {
        const channel = channelData.find(channel => channel.id === channelId);

        if (!channel) {
            console.error(`Channel with ID ${channelId} not found`);
            return;
        }

        const accommodationsToSync = tempListedAccommodations[channelId] || [];

        if (accommodationsToSync.length === 0) {
            try {
                const response = await fetch('https://9uv5o7aiz6.execute-api.eu-north-1.amazonaws.com/dev/Host-ChannelManagement-Production-Update-Channel', {
                    method: 'PUT',
                    body: JSON.stringify({
                        id: channelId,
                        APIKey: channel.APIKey.S,
                        ChannelName: channel.ChannelName.S,
                        ListedAccommodations: channel.ListedAccommodations || {L: []},
                        Status: channel.Status,
                        UserId: channel.UserId
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
                    AccommodationId: {S: acc.AccommodationId},
                    Title: {S: acc.Title.S},
                    GuestAmount: {N: acc.GuestAmount.N},
                    Rent: {S: acc.Rent.S},
                    Availability: {S: acc.Availability.S}
                }
            }))
        ];

        try {
            const response = await fetch('https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/EditSingleChannel', {
                method: 'PUT',
                body: JSON.stringify({
                    id: channelId,
                    APIKey: channel.APIKey.S,
                    ChannelName: channel.ChannelName.S,
                    ListedAccommodations: {L: updatedListedAccommodations},
                    Status: channel.Status,
                    UserId: channel.UserId
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8'
                }
            });

            const result = await response.json();

            if (result.statusCode === 200) {
                alert('Accommodations synced successfully!');

                setTempListedAccommodations(prevState => {
                    const newState = {...prevState};
                    delete newState[channelId];
                    return newState;
                });

                setChannelData(prevState => {
                    const updatedChannels = [...prevState];
                    const channelIndex = updatedChannels.findIndex(ch => ch.id === channelId);
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

    const renderThreeDotsMenu = (channelId) => {
        return (
            <div className="threeDotsMenuContent">
                <button className="threeDotsButtonMenu delete"
                        onClick={() => deleteChannelService(channelId, setChannelData, setCurrentPannel, setActiveThreeDotsDropdown)}>
                    Delete
                </button>
                <button className="threeDotsButtonMenu"
                        onClick={() => handelSingleChannelSave(channelId)}>
                    Save
                </button>
            </div>
        );
    }

    return (
        <div className="containerHostDistribution">
            <div className="host-dist-header">
                <h2 className="connectedChannelTitle">Connected channels</h2>
                <button className="exportICalButton" onClick={handleICal}>
                    Export to calender
                </button>
                <div className="addChannelButtonMenuContainer">
                    <button className="addChannelButton" onClick={toggleAddChannelButtonMenu}>
                        + Add channel
                    </button>
                    <div className={`addChannelButtonMenu ${dropdownAddChannelsVisible ? 'visible' : ''}`}>
                        {renderAddChannelButtonMenu(addedChannels)}
                    </div>
                </div>
            </div>
            <div className="host-dist-content">
                <Pages/>
                <div className="channelContents">
                    <div className="contentContainer-channel">
                        {channelData
                            .sort((a, b) => {
                                const nameA = a.ChannelName;
                                const nameB = b.ChannelName;
                                if (nameA < nameB) return -1;
                                if (nameA > nameB) return 1;
                                return 0;
                            })
                            .slice((currentPannel - 1) * itemsPerPage, currentPannel * itemsPerPage)
                            .map((channel) => (
                                <div className="host-dist-box-container" key={channel.id}>
                                    <div className="host-dist-box-row">
                                        <img className="channelLogo"
                                             src={getChannelLogo(channel.ChannelName)}
                                             alt={`${channel.ChannelName} Logo`}
                                        />
                                        <p className="channelFont">{channel.ChannelName || 'Channel'}</p>
                                        <p>
                                            <label className="toggle-status-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={channel.Status === true}
                                                    onChange={() => channel.Status ? handleDisableButton(channel.id) : handleEnableButton(channel.id)}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                        </p>
                                        <p className="totalListedAccommodations">{channel.ListedAccommodations || '0'} Listed
                                            Accommodations
                                        </p>
                                        <button className="channelManageButton"
                                                onClick={() => toggleChannelManageMenu(channel.id)}>
                                            Manage
                                        </button>
                                        {activeManageDropdown === channel.id && (
                                            <div className="channelManageContainer visible">
                                                {renderChannelManageMenu(channel.id)}
                                            </div>
                                        )}
                                        <button className="threeDotsButton"
                                                onClick={() => toggleThreeDotsMenu(channel.id)}>
                                            <img src={three_dots} alt="Three Dots"/>
                                        </button>
                                        {activeThreeDotsDropdown === channel.id && (
                                            <div className="threeDotsContainer visible">
                                                {renderThreeDotsMenu(channel.id)}
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
