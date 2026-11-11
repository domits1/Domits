const createCategory = (key, events) => ({
  key,
  labelKey: key,
  events: events.map(([eventKey, label, requiredEmail = false]) => ({
    key: eventKey,
    event: label,
    ...(requiredEmail ? { requiredChannels: ["email"] } : {}),
  })),
});

export const HOST_NOTIFICATION_CATEGORIES = [
  createCategory("propertyManager", [
    ["manager_new_booking", "New booking", true],
    ["manager_booking_modification", "Booking modification", true],
    ["manager_cancellation", "Cancellation", true],
    ["manager_payment_failure", "Payment failure"],
    ["manager_double_booking_risk", "Double-booking risk"],
    ["manager_channel_disconnected", "Channel disconnected"],
    ["manager_calendar_sync_failed", "Calendar sync failed"],
    ["manager_listing_mapping_error", "Listing mapping error"],
    ["manager_new_guest_message", "New guest message"],
    ["manager_unanswered_message", "Unanswered message"],
    ["manager_cleaning_task_created", "Cleaning task created"],
    ["manager_cleaning_task_overdue", "Cleaning task overdue"],
    ["manager_maintenance_issue", "Maintenance issue"],
    ["manager_check_in_issue", "Check-in issue"],
    ["manager_review_received", "Review received"],
    ["manager_low_review", "Low review"],
    ["manager_payout_generated", "Payout generated"],
    ["manager_payout_failed", "Payout failed"],
    ["manager_kyc_required", "KYC required"],
    ["manager_property_unpublished", "Property unpublished"],
  ]),
  createCategory("bookings", [
    ["booking_inquiry_received", "Booking inquiry received", true],
    ["booking_created", "Booking created", true],
    ["booking_confirmed", "Booking confirmed", true],
    ["booking_modified", "Booking modified", true],
    ["booking_cancelled_by_guest", "Booking cancelled by guest", true],
    ["booking_cancelled_by_host", "Booking cancelled by host", true],
    ["booking_cancellation_refund_initiated", "Booking cancellation refund initiated", true],
    ["booking_cancellation_refund_completed", "Booking cancellation refund completed", true],
    ["booking_payment_failed", "Booking payment failed"],
    ["booking_payment_received", "Booking payment received"],
    ["booking_payment_partially_received", "Payment partially received"],
    ["booking_payment_overdue", "Payment overdue"],
    ["booking_date_approaching", "Booking date approaching"],
    ["booking_check_in_approaching", "Check-in approaching"],
    ["booking_check_out_approaching", "Check-out approaching"],
    ["booking_guest_no_show", "Guest no-show"],
    ["booking_completed", "Booking completed"],
  ]),
  createCategory("propertyOwner", [
    ["owner_new_booking", "New booking", true],
    ["owner_booking_cancelled", "Booking cancelled", true],
    ["owner_revenue_received", "Revenue received"],
    ["owner_payout_generated", "Owner payout generated"],
    ["owner_payout_completed", "Payout completed"],
    ["owner_payout_failed", "Payout failed"],
    ["owner_property_unavailable", "Property unavailable"],
    ["owner_major_maintenance", "Major maintenance"],
    ["owner_negative_review", "Negative review"],
    ["owner_monthly_performance_report", "Monthly performance report"],
    ["owner_monthly_statement", "Monthly statement"],
    ["owner_contract_issue", "Contract issue"],
  ]),
  createCategory("finance", [
    ["finance_guest_payment_received", "Guest payment received"],
    ["finance_payment_failed", "Payment failed"],
    ["finance_refund_initiated", "Refund initiated"],
    ["finance_refund_completed", "Refund completed"],
    ["finance_owner_payout_generated", "Owner payout generated"],
    ["finance_owner_payout_failed", "Owner payout failed"],
    ["finance_commission_calculated", "Commission calculated"],
    ["finance_reconciliation_mismatch", "Reconciliation mismatch"],
    ["finance_unmatched_transaction", "Unmatched transaction"],
    ["finance_chargeback", "Chargeback"],
    ["finance_tax_reporting_event", "Tax/reporting event"],
    ["finance_accounting_export_failed", "Accounting export failed"],
  ]),
  createCategory("distribution", [
    ["distribution_listing_published", "Listing published"],
    ["distribution_listing_unpublished", "Listing unpublished"],
    ["distribution_channel_connected", "Channel connected"],
    ["distribution_channel_disconnected", "Channel disconnected"],
    ["distribution_api_authentication_failed", "API authentication failed"],
    ["distribution_property_mapping_failed", "Property mapping failed"],
    ["distribution_rate_sync_failed", "Rate sync failed"],
    ["distribution_availability_sync_failed", "Availability sync failed"],
    ["distribution_reservation_sync_failed", "Reservation sync failed"],
    ["distribution_duplicate_reservation_detected", "Duplicate reservation detected"],
    ["distribution_inventory_mismatch", "Inventory mismatch"],
    ["distribution_channel_api_outage", "Channel API outage"],
  ]),
  createCategory("compliance", [
    ["compliance_kyc_rejected", "KYC rejected"],
    ["compliance_identity_verification_failed", "Identity verification failed"],
    ["compliance_document_expired", "Compliance document expired"],
    ["compliance_account_restricted", "Account restricted"],
  ]),
  createCategory("tasks", [
    ["task_new_booking", "New booking"],
    ["task_cleaning_required", "Cleaning required"],
    ["task_cleaning_assigned", "Cleaning assigned"],
    ["task_cleaning_overdue", "Cleaning overdue"],
    ["task_maintenance_issue", "Maintenance issue"],
    ["task_guest_arrival", "Guest arrival"],
    ["task_guest_departure", "Guest departure"],
    ["task_guest_request", "Guest request"],
    ["task_emergency_property_issue", "Emergency property issue"],
    ["task_completed", "Task completed"],
  ]),
];

export const REQUIRED_HOST_NOTIFICATION_EMAIL_EVENT_KEYS = Object.freeze(
  HOST_NOTIFICATION_CATEGORIES.flatMap(({ events }) =>
    events.filter(({ requiredChannels }) => requiredChannels?.includes("email")).map(({ key }) => key)
  )
);

export const isRequiredHostNotificationEmail = (eventKey) =>
  REQUIRED_HOST_NOTIFICATION_EMAIL_EVENT_KEYS.includes(eventKey);

export const HOST_NOTIFICATION_EVENT_KEYS = Object.freeze(
  HOST_NOTIFICATION_CATEGORIES.flatMap(({ events }) => events.map(({ key }) => key))
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
