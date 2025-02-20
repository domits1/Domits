export const toggleAddChannelButtonMenu = (
  setDropdownAddChannelsVisible,
  setActiveManageDropdown,
  setActiveThreeDotsDropdown,
  setActiveRemoveAccommodationsView,
) => {
  setDropdownAddChannelsVisible(prev => !prev)
  setActiveManageDropdown(null)
  setActiveThreeDotsDropdown(null)
  setActiveRemoveAccommodationsView(null)
}
