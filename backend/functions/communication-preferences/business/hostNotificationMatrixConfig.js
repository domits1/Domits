export const REQUIRED_HOST_NOTIFICATION_EMAIL_EVENT_KEYS = Object.freeze([
  "manager_new_booking",
  "manager_booking_modification",
  "manager_cancellation",
  "booking_inquiry_received",
  "booking_created",
  "booking_confirmed",
  "booking_modified",
  "booking_cancelled_by_guest",
  "booking_cancelled_by_host",
  "booking_cancellation_refund_initiated",
  "booking_cancellation_refund_completed",
  "owner_new_booking",
  "owner_booking_cancelled",
]);

export const isRequiredHostNotificationEmail = (eventKey) =>
  REQUIRED_HOST_NOTIFICATION_EMAIL_EVENT_KEYS.includes(eventKey);

export const HOST_NOTIFICATION_CATEGORIES = [
  {
    key: "propertyManager",
    labelKey: "propertyManager",
    events: [
      { key: "manager_new_booking", event: "New booking", requiredChannels: ["email"] },
      { key: "manager_booking_modification", event: "Booking modification", requiredChannels: ["email"] },
      { key: "manager_cancellation", event: "Cancellation", requiredChannels: ["email"] },
      { key: "manager_payment_failure", event: "Payment failure" },
      { key: "manager_double_booking_risk", event: "Double-booking risk" },
      { key: "manager_channel_disconnected", event: "Channel disconnected" },
      { key: "manager_calendar_sync_failed", event: "Calendar sync failed" },
      { key: "manager_listing_mapping_error", event: "Listing mapping error" },
      { key: "manager_new_guest_message", event: "New guest message" },
      { key: "manager_unanswered_message", event: "Unanswered message" },
      { key: "manager_cleaning_task_created", event: "Cleaning task created" },
      { key: "manager_cleaning_task_overdue", event: "Cleaning task overdue" },
      { key: "manager_maintenance_issue", event: "Maintenance issue" },
      { key: "manager_check_in_issue", event: "Check-in issue" },
      { key: "manager_review_received", event: "Review received" },
      { key: "manager_low_review", event: "Low review" },
      { key: "manager_payout_generated", event: "Payout generated" },
      { key: "manager_payout_failed", event: "Payout failed" },
      { key: "manager_kyc_required", event: "KYC required" },
      { key: "manager_property_unpublished", event: "Property unpublished" },
    ],
  },
  {
    key: "bookings",
    labelKey: "bookings",
    events: [
      { key: "booking_inquiry_received", event: "Booking inquiry received", requiredChannels: ["email"] },
      { key: "booking_created", event: "Booking created", requiredChannels: ["email"] },
      { key: "booking_confirmed", event: "Booking confirmed", requiredChannels: ["email"] },
      { key: "booking_modified", event: "Booking modified", requiredChannels: ["email"] },
      { key: "booking_cancelled_by_guest", event: "Booking cancelled by guest", requiredChannels: ["email"] },
      { key: "booking_cancelled_by_host", event: "Booking cancelled by host", requiredChannels: ["email"] },
      { key: "booking_cancellation_refund_initiated", event: "Booking cancellation refund initiated", requiredChannels: ["email"] },
      { key: "booking_cancellation_refund_completed", event: "Booking cancellation refund completed", requiredChannels: ["email"] },
      { key: "booking_payment_failed", event: "Booking payment failed" },
      { key: "booking_payment_received", event: "Booking payment received" },
      { key: "booking_payment_partially_received", event: "Payment partially received" },
      { key: "booking_payment_overdue", event: "Payment overdue" },
      { key: "booking_date_approaching", event: "Booking date approaching" },
      { key: "booking_check_in_approaching", event: "Check-in approaching" },
      { key: "booking_check_out_approaching", event: "Check-out approaching" },
      { key: "booking_guest_no_show", event: "Guest no-show" },
      { key: "booking_completed", event: "Booking completed" },
    ],
  },
  {
    key: "propertyOwner",
    labelKey: "propertyOwner",
    events: [
      { key: "owner_new_booking", event: "New booking", requiredChannels: ["email"] },
      { key: "owner_booking_cancelled", event: "Booking cancelled", requiredChannels: ["email"] },
      { key: "owner_revenue_received", event: "Revenue received" },
      { key: "owner_payout_generated", event: "Owner payout generated" },
      { key: "owner_payout_completed", event: "Payout completed" },
      { key: "owner_payout_failed", event: "Payout failed" },
      { key: "owner_property_unavailable", event: "Property unavailable" },
      { key: "owner_major_maintenance", event: "Major maintenance" },
      { key: "owner_negative_review", event: "Negative review" },
      { key: "owner_monthly_performance_report", event: "Monthly performance report" },
      { key: "owner_monthly_statement", event: "Monthly statement" },
      { key: "owner_contract_issue", event: "Contract issue" },
    ],
  },
  {
    key: "finance",
    labelKey: "finance",
    events: [
      { key: "finance_guest_payment_received", event: "Guest payment received" },
      { key: "finance_payment_failed", event: "Payment failed" },
      { key: "finance_refund_initiated", event: "Refund initiated" },
      { key: "finance_refund_completed", event: "Refund completed" },
      { key: "finance_owner_payout_generated", event: "Owner payout generated" },
      { key: "finance_owner_payout_failed", event: "Owner payout failed" },
      { key: "finance_commission_calculated", event: "Commission calculated" },
      { key: "finance_reconciliation_mismatch", event: "Reconciliation mismatch" },
      { key: "finance_unmatched_transaction", event: "Unmatched transaction" },
      { key: "finance_chargeback", event: "Chargeback" },
      { key: "finance_tax_reporting_event", event: "Tax/reporting event" },
      { key: "finance_accounting_export_failed", event: "Accounting export failed" },
    ],
  },
  {
    key: "distribution",
    labelKey: "distribution",
    events: [
      { key: "distribution_listing_published", event: "Listing published" },
      { key: "distribution_listing_unpublished", event: "Listing unpublished" },
      { key: "distribution_channel_connected", event: "Channel connected" },
      { key: "distribution_channel_disconnected", event: "Channel disconnected" },
      { key: "distribution_api_authentication_failed", event: "API authentication failed" },
      { key: "distribution_property_mapping_failed", event: "Property mapping failed" },
      { key: "distribution_rate_sync_failed", event: "Rate sync failed" },
      { key: "distribution_availability_sync_failed", event: "Availability sync failed" },
      { key: "distribution_reservation_sync_failed", event: "Reservation sync failed" },
      { key: "distribution_duplicate_reservation_detected", event: "Duplicate reservation detected" },
      { key: "distribution_inventory_mismatch", event: "Inventory mismatch" },
      { key: "distribution_channel_api_outage", event: "Channel API outage" },
    ],
  },
  {
    key: "compliance",
    labelKey: "compliance",
    events: [
      { key: "compliance_kyc_rejected", event: "KYC rejected" },
      { key: "compliance_identity_verification_failed", event: "Identity verification failed" },
      { key: "compliance_document_expired", event: "Compliance document expired" },
      { key: "compliance_account_restricted", event: "Account restricted" },
    ],
  },
  {
    key: "tasks",
    labelKey: "tasks",
    events: [
      { key: "task_new_booking", event: "New booking" },
      { key: "task_cleaning_required", event: "Cleaning required" },
      { key: "task_cleaning_assigned", event: "Cleaning assigned" },
      { key: "task_cleaning_overdue", event: "Cleaning overdue" },
      { key: "task_maintenance_issue", event: "Maintenance issue" },
      { key: "task_guest_arrival", event: "Guest arrival" },
      { key: "task_guest_departure", event: "Guest departure" },
      { key: "task_guest_request", event: "Guest request" },
      { key: "task_emergency_property_issue", event: "Emergency property issue" },
      { key: "task_completed", event: "Task completed" },
    ],
  },
];

export const HOST_NOTIFICATION_EVENT_KEYS = Object.freeze(
  HOST_NOTIFICATION_CATEGORIES.flatMap((category) => category.events.map((event) => event.key))
);

export const DEFAULT_HOST_NOTIFICATION_CHANNEL_PREFERENCES = Object.freeze({
  inApp: true,
  email: true,
  sms: false,
});

export const DEFAULT_HOST_NOTIFICATION_PREFERENCES = Object.freeze(
  Object.fromEntries(HOST_NOTIFICATION_EVENT_KEYS.map((eventKey) => [
    eventKey,
    { ...DEFAULT_HOST_NOTIFICATION_CHANNEL_PREFERENCES },
  ]))
);
