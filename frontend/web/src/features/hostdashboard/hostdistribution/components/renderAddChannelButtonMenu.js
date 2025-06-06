import allChannels from "../store/channelData";
import React from "react";

const AddChannelButtonMenu = ({
                                  addedChannels,
                                  selectedChannel,
                                  handleSelectChange,
                                  apiKey,
                                  handleInputChange,
                                  handleCancelAddChannel,
                                  handleAddChannel
                              }) => {

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
                    type="text"
                    placeholder="API Key"
                    className="channelAPIKey"
                    value={apiKey}
                    onChange={handleInputChange}
                />
            </div>
            <div className="addCancelButtonContainer">
                <button className="addChannelButtonMenuButton Cancel" onClick={handleCancelAddChannel}>
                    Cancel
                </button>
                <button className="addChannelButtonMenuButton Add" onClick={handleAddChannel}>
                    Add
                </button>
            </div>
        </div>
    );
};

export default AddChannelButtonMenu;
