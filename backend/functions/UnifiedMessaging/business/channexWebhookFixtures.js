export const baseWebhookEvent = (overrides = {}) => {
  const { payload: payloadOverrides = {}, ...topLevelOverrides } = overrides;

  return {
    event: "message",
    payload: {
      id: "channex-msg-1",
      message: "Thanks a lot.",
      meta: null,
      sender: "guest",
      property_id: "channex-property-1",
      booking_id: "channex-booking-1",
      message_thread_id: "channex-thread-1",
      live_feed_event_id: "channex-live-1",
      attachments: [],
      have_attachment: false,
      ota_message_id: "ota-msg-1",
      ...payloadOverrides,
    },
    property_id: "channex-property-1",
    user_id: null,
    timestamp: "2021-12-24T00:00:00.0000Z",
    ...topLevelOverrides,
  };
};
