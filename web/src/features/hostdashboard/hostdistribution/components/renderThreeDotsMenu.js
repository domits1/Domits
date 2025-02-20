import {deleteChannelService} from '../services/deleteChannelService'
import React from 'react'
import {singleChannelSave} from '../services/singleChannelSaveService'

export const renderThreeDotsMenu = (
  channelId,
  channelData,
  tempListedAccommodations,
  setTempListedAccommodations,
  setActiveThreeDotsDropdown,
) => {
  return (
    <div className="threeDotsMenuContent">
      <button
        className="threeDotsButtonMenu delete"
        onClick={() =>
          deleteChannelService(
            channelId,
            channelData,
            setActiveThreeDotsDropdown,
          )
        }>
        Delete
      </button>
      <button
        className="threeDotsButtonMenu"
        onClick={() =>
          singleChannelSave(
            channelId,
            channelData,
            tempListedAccommodations,
            setTempListedAccommodations,
            setActiveThreeDotsDropdown,
          )
        }>
        Save
      </button>
    </div>
  )
}
