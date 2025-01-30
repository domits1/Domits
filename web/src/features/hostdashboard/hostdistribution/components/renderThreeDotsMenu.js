import {deleteChannelService} from "../services/deleteChannelService";
import {handelSingleChannelSave} from "../services/handleSingleChannelSave";
import React from "react";

export const renderThreeDotsMenu = (channelId, channelData, setTempListedAccommodations, setActiveThreeDotsDropdown) => {
    return (
        <div className="threeDotsMenuContent">
            <button className="threeDotsButtonMenu delete"
                    onClick={() => deleteChannelService(channelId, channelData, setActiveThreeDotsDropdown)}>
                Delete
            </button>
            <button className="threeDotsButtonMenu"
                    onClick={() => handelSingleChannelSave(channelId, channelData, setTempListedAccommodations, setActiveThreeDotsDropdown)}>
                Save
            </button>
        </div>
    );
};
