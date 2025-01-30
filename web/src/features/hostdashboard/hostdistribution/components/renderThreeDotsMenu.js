import {deleteChannelService} from "../services/deleteChannelService";
import {handelSingleChannelSave} from "../services/handleSingleChannelSave";
import React from "react";

export const renderThreeDotsMenu = (channelId, setChannelData, setTempListedAccommodations, setActiveThreeDotsDropdown) => {
    return (
        <div className="threeDotsMenuContent">
            <button className="threeDotsButtonMenu delete"
                    onClick={() => deleteChannelService(channelId, setChannelData, setActiveThreeDotsDropdown)}>
                Delete
            </button>
            <button className="threeDotsButtonMenu"
                    onClick={() => handelSingleChannelSave(channelId, setChannelData, setTempListedAccommodations, setActiveThreeDotsDropdown)}>
                Save
            </button>
        </div>
    );
};
