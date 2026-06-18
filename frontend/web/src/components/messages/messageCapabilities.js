export const MESSAGE_CAPABILITIES = {
  host: {
    canCreateContact: true,
    canSearch: true,
    canSort: true,
    canFilterByReadStatus: true,
    canManageConversation: true,
    canUseChannelManagement: true,
    canUseAttachments: true,
    canViewBookingContext: true,
    canViewListingPanel: true,
  },
  guest: {
    canCreateContact: false,
    canSearch: false,
    canSort: false,
    canFilterByReadStatus: false,
    canManageConversation: false,
    canUseChannelManagement: false,
    canUseAttachments: true,
    canViewBookingContext: true,
    canViewListingPanel: true,
  },
};

export const getMessageCapabilities = (dashboardType) =>
  MESSAGE_CAPABILITIES[dashboardType] || MESSAGE_CAPABILITIES.guest;
