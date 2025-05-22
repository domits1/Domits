import React, { useEffect, useState } from 'react';
import Pages from "../../Pages.js";
import '../styles/HostDistribution.css';

import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import airbnb_logo from "../../../../images/icon-airbnb.png";
import booking_logo from "../../../../images/icon-booking.png";
import expedia_logo from "../../../../images/icon-expedia.png";
import homeaway_logo from "../../../../images/icon-homeaway.png";
import tripadvisor_logo from "../../../../images/icon-tripadvisor.png";
import vrbo_logo from "../../../../images/icon-vrbo.png";
import three_dots from "../../../../images/three-dots-grid.svg";

import { Auth } from "aws-amplify";
import { fetchChannels } from "../services/fetchChannelsService.js";
import { handleAddChannelService } from "../services/addChannelService.js";
import { deleteChannelService } from "../services/deleteChannelService.js";
import useFetchUser from "../../../../hooks/useFetchUser.js";
import useFetchAccommodations from "../hooks/useFetchAccommodations.js";
import useManageChannels from "../hooks/useManageChannels";

import allChannels from "../store/channelData.js";
import { generateUUID } from "../../../../utils/generateUUID.js";
import { getChannelLogo } from "../utils/getChannelLogo.js";
import { handleICal } from "../utils/iCalHandler.js";
import { handlePageRange } from "../utils/handlePageRange.js";
import { toggleAddChannelButtonMenu } from "../utils/toggleAddChannelButtonMenu.js";
import { toggleChannelManageMenu } from "../utils/toggleChannelManageMenu.js";
import { toggleThreeDotsMenu } from "../utils/toggleThreeDotsMenu.js";
import { renderThreeDotsMenu } from "../components/renderThreeDotsMenu";
import AddChannelButtonMenu from "../components/renderAddChannelButtonMenu";

function AddAccommodationsView({
  channelId,
  accommodations,
  channelData,
  tempListedAccommodations,
  handleViewAddAccommodationsButton,
  handleAddAccommodationButton
}) {
  const listedAccommodations = channelData.find(ch => ch.id.S === channelId)?.ListedAccommodations.L || [];
  const tempAccommodations = tempListedAccommodations[channelId] || [];

  const listedAccommodationIds = [
    ...listedAccommodations.map(acc => acc.M.AccommodationId),
    ...tempAccommodations.map(acc => acc.AccommodationId),
  ];

  return (
    <div className="addAccommodatonsViewContent">
      <div className='closeAddViewContent'>
        <button
          className='closeAddViewButton'
          onClick={() => handleViewAddAccommodationsButton(channelId)}
        >
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {accommodations
            .filter(acc => !listedAccommodationIds.includes(acc.ID))
            .map((acc) => (
              <tr key={acc.ID}>
                <td>{acc.Title.S}</td>
                <td>{acc.GuestAmount.N}</td>
                <td>{acc.Rent.S}</td>
                <td>{acc.Drafted ? 'Unavailable' : 'Available'}</td>
                <td>
                  <button onClick={() => handleAddAccommodationButton(channelId, acc.ID)}>
                    Add
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function RemoveAccommodationsView({
  channelId,
  channelData,
  tempListedAccommodations,
  handleViewRemoveAccommodationsButton,
  handleRemoveAccommodationButton
}) {
  const listedAccommodations = channelData.find(ch => ch.id.S === channelId)?.ListedAccommodations.L || [];
  const tempAccommodations = tempListedAccommodations[channelId] || [];

  const combinedAccommodations = [
    ...listedAccommodations.map(acc => ({ ...acc.M, id: { S: acc.M.AccommodationId } })),
    ...tempAccommodations.map(acc => ({ ...acc, id: { S: acc.AccommodationId } }))
  ];

  return (
    <div className="removeAccommodationsViewContent">
      <div className='closeRemoveViewContent'>
        <button
          className='closeRemoveViewButton'
          onClick={() => handleViewRemoveAccommodationsButton(channelId)}
        >
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {combinedAccommodations.map((acc) => (
            <tr key={acc.AccommodationId}>
              <td>{acc.Title.S}</td>
              <td>{acc.GuestAmount.N}</td>
              <td>{acc.Rent.S}</td>
              <td>{acc.Availability.S}</td>
              <td>
                <button
                  onClick={() => handleRemoveAccommodationButton(channelId, acc.AccommodationId)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChannelManageMenu({
  channelId,
  activeAddAccommodationsView,
  activeRemoveAccommodationsView,
  handleViewAddAccommodationsButton,
  handleViewRemoveAccommodationsButton,
  handleEnableButton,
  handleDisableButton,
  renderAddAccommodationsView,
  renderRemoveAccommodationsView
}) {
  return (
    <div className="channelManageMenuContent">
      <div className="channelManageButtonContainer">
        <button
          className="channelManageMenuButton"
          onClick={() => handleViewAddAccommodationsButton(channelId)}
        >
          + Add Accommodations
        </button>
        <div
          className={`addAccommodationsViewContainer ${
            activeAddAccommodationsView === channelId ? 'visible' : ''
          }`}
        >
          {activeAddAccommodationsView === channelId && renderAddAccommodationsView(channelId)}
        </div>

        <button
          className="channelManageMenuButton"
          onClick={() => handleViewRemoveAccommodationsButton(channelId)}
        >
          - Remove Accommodations
        </button>
        <div
          className={`removeAccommodationsViewContainer ${
            activeRemoveAccommodationsView === channelId ? 'visible' : ''
          }`}
        >
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
}

function ChannelRow({
  channel,
  activeManageDropdown,
  handleToggleManageMenu,
  renderChannelManageMenu,
  activeThreeDotsDropdown,
  handleToggleThreeDots,
  renderThreeDotsMenu,
  handleEnableButton,
  handleDisableButton
}) {
  const channelId = channel.id.S;
  const channelName = channel.ChannelName.S || 'Channel';
  const channelStatus = channel.Status === true;

  return (
    <div className="host-dist-box-container" key={channelId}>
      <div className="host-dist-box-row">
        <img
          className="channelLogo"
          src={getChannelLogo(channelName)}
          alt={`${channelName} Logo`}
        />
        <p className="channelFont">{channelName}</p>
        <p>
          <label className="toggle-status-switch">
            <input
              type="checkbox"
              checked={channelStatus}
              onChange={() => (channelStatus ? handleDisableButton(channelId) : handleEnableButton(channelId))}
            />
            <span className="slider"></span>
          </label>
        </p>

        <p className="totalListedAccommodations">
          {channel.ListedAccommodations.L?.length || '0'} Listed Accommodations
        </p>

        <button
          className="channelManageButton"
          onClick={() => handleToggleManageMenu(channelId)}
        >
          Manage
        </button>
        {activeManageDropdown === channelId && (
          <div className="channelManageContainer visible">
            {renderChannelManageMenu(channelId)}
          </div>
        )}

        <button className="threeDotsButton" onClick={() => handleToggleThreeDots(channelId)}>
          <img src={three_dots} alt="Three Dots" />
        </button>
        {activeThreeDotsDropdown === channelId && (
          <div className="threeDotsContainer visible">
            {renderThreeDotsMenu(channelId)}
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelPagination({
  currentPage,
  itemsPerPage,
  totalLength,
  onPageChange,
  startPage,
  endPage
}) {
  return (
    <div className="channelNavigation">
      <button
        className="prevChannelButton"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
      >
        Previous
      </button>

      {[...Array(endPage - startPage + 1)].map((_, idx) => {
        const pageIndex = startPage + idx;
        return (
          <button
            key={pageIndex}
            className={`channelPageButton ${currentPage === pageIndex ? 'active' : ''}`}
            onClick={() => onPageChange(pageIndex)}
          >
            {pageIndex}
          </button>
        );
      })}

      <button
        className="nextChannelButton"
        onClick={() =>
          onPageChange(
            currentPage < Math.ceil(totalLength / itemsPerPage)
              ? currentPage + 1
              : currentPage
          )
        }
        disabled={currentPage === Math.ceil(totalLength / itemsPerPage)}
      >
        Next
      </button>
    </div>
  );
}

function HostDistribution() {
  const userId = useFetchUser();
  const accommodations = useFetchAccommodations(userId);
  const { channelData, setChannelData, refreshChannels } = useManageChannels(userId);

  const [dropdownAddChannelsVisible, setDropdownAddChannelsVisible] = useState(false);
  const [activeManageDropdown, setActiveManageDropdown] = useState(null);
  const [activeThreeDotsDropdown, setActiveThreeDotsDropdown] = useState(null);

  const [activeAddAccommodationsView, setActiveAddAccommodationsView] = useState(null);
  const [activeRemoveAccommodationsView, setActiveRemoveAccommodationsView] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalChannels = channelData.length;
  const { startPage, endPage } = handlePageRange(totalChannels, itemsPerPage, currentPage);

  const [selectedChannel, setSelectedChannel] = useState("Select Channel");
  const [apiKey, setApiKey] = useState("");
  const addedChannels = channelData.map(ch => ch.ChannelName.S);

  const [tempListedAccommodations, setTempListedAccommodations] = useState([]);

  useEffect(() => {
  }, [channelData]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (activeManageDropdown) {
        const manageContainer = document.querySelector('.channelManageContainer.visible');
        if (manageContainer && !manageContainer.contains(event.target)) {
          setActiveManageDropdown(null);
        }
      }

      if (activeThreeDotsDropdown) {
        const threeDotsContainer = document.querySelector('.threeDotsContainer.visible');
        if (threeDotsContainer && !threeDotsContainer.contains(event.target)) {
          setActiveThreeDotsDropdown(null);
        }
      }

      if (dropdownAddChannelsVisible) {
        const addChannelMenu = document.querySelector('.addChannelButtonMenu.visible');
        if (addChannelMenu && !addChannelMenu.contains(event.target)) {
          setDropdownAddChannelsVisible(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeManageDropdown, activeThreeDotsDropdown, dropdownAddChannelsVisible]);
  
  const handleToggleAddChannel = () => {
    toggleAddChannelButtonMenu(
      setDropdownAddChannelsVisible,
      setActiveManageDropdown,
      setActiveThreeDotsDropdown,
      setActiveRemoveAccommodationsView
    );
  };
  const handleSelectChange = (e) => setSelectedChannel(e.target.value);
  const handleInputChange = (e) => setApiKey(e.target.value);

  const handleCancelAddChannel = () => {
    setSelectedChannel("Select Channel");
    setApiKey("");
    setDropdownAddChannelsVisible(false);
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    const result = await handleAddChannelService(userId, selectedChannel, apiKey);

    if (result.success) {
      toast.success("Channel added successfully!");
      setSelectedChannel("Select Channel");
      setApiKey("");
      setDropdownAddChannelsVisible(false);

      const updated = await fetchChannels(userId);
      setChannelData(updated);
    } else {
      toast.error(result.error || "Failed to add channel");
    }
  };

  const handleToggleManageMenu = (channelId) => {
    toggleChannelManageMenu(
      channelId,
      activeManageDropdown,
      setActiveManageDropdown,
      setDropdownAddChannelsVisible,
      setActiveThreeDotsDropdown,
      setActiveAddAccommodationsView,
      setActiveRemoveAccommodationsView
    );
  };

  const handleEnableButton = (channelId) => {
    setChannelData(prev => {
      const idx = prev.findIndex(c => c.id.S === channelId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx].Status = true;
      return updated;
    });
    toast.info("Channel has been enabled!");
  };

  const handleDisableButton = (channelId) => {
    setChannelData(prev => {
      const idx = prev.findIndex(c => c.id.S === channelId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx].Status = false;
      return updated;
    });
    toast.warn("Channel has been disabled!");
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
      setActiveAddAccommodationsView(null);
    } else {
      setActiveRemoveAccommodationsView(channelId);
      setActiveAddAccommodationsView(null);
    }
  };

  const handleAddAccommodationButton = (channelId, accommodationId) => {
    const found = accommodations.find(acc => acc.ID === accommodationId);
    if (!found) {
      console.error('Accommodation not found');
      return;
    }

    if (
      tempListedAccommodations[channelId]?.length > 0 ||
      channelData.find(ch => ch.id.S === channelId)?.ListedAccommodations.L.length > 0
    ) {
      toast.warn("You can only add one accommodation per channel!");
      return;
    }

    const newAcc = {
      AccommodationId: { S: found.ID },
      Title: { S: found.Title.S },
      GuestAmount: { N: found.GuestAmount.N },
      Rent: { S: found.Rent.S },
      Availability: { S: found.Drafted ? 'Unavailable' : 'Available' }
    };

    setTempListedAccommodations(prev => ({
      ...prev,
      [channelId]: [newAcc]
    }));

    toast.success(`Added accommodation "${found.Title.S}" to channel!`);
  };

  const handleRemoveAccommodationButton = (channelId, accommodationId) => {
    setTempListedAccommodations(prev => {
      const existing = prev[channelId] || [];
      return {
        ...prev,
        [channelId]: existing.filter(a => a.AccommodationId !== accommodationId)
      };
    });

    setChannelData(prev => {
      const idx = prev.findIndex(ch => ch.id.S === channelId);
      if (idx === -1) return prev;
      const updated = [...prev];
      const listed = updated[idx].ListedAccommodations.L || [];
      updated[idx].ListedAccommodations.L = listed.filter(acc => acc.M.AccommodationId !== accommodationId);
      return updated;
    });

    toast.info("Accommodation removed from channel.");
  };

  const renderAddAccommodationsView = (id) => (
    <AddAccommodationsView
      channelId={id}
      accommodations={accommodations}
      channelData={channelData}
      tempListedAccommodations={tempListedAccommodations}
      handleViewAddAccommodationsButton={handleViewAddAccommodationsButton}
      handleAddAccommodationButton={handleAddAccommodationButton}
    />
  );

  const renderRemoveAccommodationsView = (id) => (
    <RemoveAccommodationsView
      channelId={id}
      channelData={channelData}
      tempListedAccommodations={tempListedAccommodations}
      handleViewRemoveAccommodationsButton={handleViewRemoveAccommodationsButton}
      handleRemoveAccommodationButton={handleRemoveAccommodationButton}
    />
  );

  const renderChannelManageMenu = (channelId) => (
    <ChannelManageMenu
      channelId={channelId}
      activeAddAccommodationsView={activeAddAccommodationsView}
      activeRemoveAccommodationsView={activeRemoveAccommodationsView}
      handleViewAddAccommodationsButton={handleViewAddAccommodationsButton}
      handleViewRemoveAccommodationsButton={handleViewRemoveAccommodationsButton}
      handleEnableButton={handleEnableButton}
      handleDisableButton={handleDisableButton}
      renderAddAccommodationsView={renderAddAccommodationsView}
      renderRemoveAccommodationsView={renderRemoveAccommodationsView}
    />
  );

  const handleToggleThreeDots = (channelId) => {
    toggleThreeDotsMenu(channelId, setActiveThreeDotsDropdown);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="containerHostDistribution">
      <div className="host-dist-header">
        <h2 className="connectedChannelTitle">Connected channels</h2>
        <div className="addChannelButtonMenuContainer">
          <button className="addChannelButton" onClick={handleToggleAddChannel}>
            + Add channel
          </button>
          <div className={`addChannelButtonMenu ${dropdownAddChannelsVisible ? 'visible' : ''}`}>
            <AddChannelButtonMenu
              addedChannels={addedChannels}
              selectedChannel={selectedChannel}
              handleSelectChange={handleSelectChange}
              apiKey={apiKey}
              handleInputChange={handleInputChange}
              handleCancelAddChannel={handleCancelAddChannel}
              handleAddChannel={handleAddChannel}
            />
          </div>
        </div>
      </div>

      <div className="host-dist-content">
        <Pages />

        <div className="channelContents">
          <div className="contentContainer-channel">
            {channelData
              .sort((a, b) => {
                const nameA = a.ChannelName.S;
                const nameB = b.ChannelName.S;
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
              })
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((channel) => (
                <ChannelRow
                  key={channel.id.S}
                  channel={channel}
                  activeManageDropdown={activeManageDropdown}
                  handleToggleManageMenu={handleToggleManageMenu}
                  renderChannelManageMenu={renderChannelManageMenu}
                  activeThreeDotsDropdown={activeThreeDotsDropdown}
                  handleToggleThreeDots={handleToggleThreeDots}
                  renderThreeDotsMenu={(channelId) =>
                    renderThreeDotsMenu(
                      channelId,
                      channelData,
                      tempListedAccommodations,
                      setTempListedAccommodations,
                      setActiveThreeDotsDropdown
                    )
                  }
                  handleEnableButton={handleEnableButton}
                  handleDisableButton={handleDisableButton}
                />
              ))}
          </div>

          <ChannelPagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalLength={totalChannels}
            onPageChange={handlePageChange}
            startPage={startPage}
            endPage={endPage}
          />
        </div>
      </div>
    </div>
  );
}

export default HostDistribution;
