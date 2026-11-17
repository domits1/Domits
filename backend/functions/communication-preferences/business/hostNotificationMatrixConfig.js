const HOST_NOTIFICATION_EVENT_DEFINITIONS = `
propertyManager|manager_new_booking|New booking|email
propertyManager|manager_booking_modification|Booking modification|email
propertyManager|manager_cancellation|Cancellation|email
propertyManager|manager_payment_failure|Payment failure
propertyManager|manager_double_booking_risk|Double-booking risk
propertyManager|manager_channel_disconnected|Channel disconnected
propertyManager|manager_calendar_sync_failed|Calendar sync failed
propertyManager|manager_listing_mapping_error|Listing mapping error
propertyManager|manager_new_guest_message|New guest message
propertyManager|manager_unanswered_message|Unanswered message
propertyManager|manager_cleaning_task_created|Cleaning task created
propertyManager|manager_cleaning_task_overdue|Cleaning task overdue
propertyManager|manager_maintenance_issue|Maintenance issue
propertyManager|manager_check_in_issue|Check-in issue
propertyManager|manager_review_received|Review received
propertyManager|manager_low_review|Low review
propertyManager|manager_payout_generated|Payout generated
propertyManager|manager_payout_failed|Payout failed
propertyManager|manager_kyc_required|KYC required
propertyManager|manager_property_unpublished|Property unpublished
bookings|booking_inquiry_received|Booking inquiry received|email
bookings|booking_created|Booking created|email
bookings|booking_confirmed|Booking confirmed|email
bookings|booking_modified|Booking modified|email
bookings|booking_cancelled_by_guest|Booking cancelled by guest|email
bookings|booking_cancelled_by_host|Booking cancelled by host|email
bookings|booking_cancellation_refund_initiated|Booking cancellation refund initiated|email
bookings|booking_cancellation_refund_completed|Booking cancellation refund completed|email
bookings|booking_payment_failed|Booking payment failed
bookings|booking_payment_received|Booking payment received
bookings|booking_payment_partially_received|Payment partially received
bookings|booking_payment_overdue|Payment overdue
bookings|booking_date_approaching|Booking date approaching
bookings|booking_check_in_approaching|Check-in approaching
bookings|booking_check_out_approaching|Check-out approaching
bookings|booking_guest_no_show|Guest no-show
bookings|booking_completed|Booking completed
propertyOwner|owner_new_booking|New booking|email
propertyOwner|owner_booking_cancelled|Booking cancelled|email
propertyOwner|owner_revenue_received|Revenue received
propertyOwner|owner_payout_generated|Owner payout generated
propertyOwner|owner_payout_completed|Payout completed
propertyOwner|owner_payout_failed|Payout failed
propertyOwner|owner_property_unavailable|Property unavailable
propertyOwner|owner_major_maintenance|Major maintenance
propertyOwner|owner_negative_review|Negative review
propertyOwner|owner_monthly_performance_report|Monthly performance report
propertyOwner|owner_monthly_statement|Monthly statement
propertyOwner|owner_contract_issue|Contract issue
finance|finance_guest_payment_received|Guest payment received
finance|finance_payment_failed|Payment failed
finance|finance_refund_initiated|Refund initiated
finance|finance_refund_completed|Refund completed
finance|finance_owner_payout_generated|Owner payout generated
finance|finance_owner_payout_failed|Owner payout failed
finance|finance_commission_calculated|Commission calculated
finance|finance_reconciliation_mismatch|Reconciliation mismatch
finance|finance_unmatched_transaction|Unmatched transaction
finance|finance_chargeback|Chargeback
finance|finance_tax_reporting_event|Tax/reporting event
finance|finance_accounting_export_failed|Accounting export failed
distribution|distribution_listing_published|Listing published
distribution|distribution_listing_unpublished|Listing unpublished
distribution|distribution_channel_connected|Channel connected
distribution|distribution_channel_disconnected|Channel disconnected
distribution|distribution_api_authentication_failed|API authentication failed
distribution|distribution_property_mapping_failed|Property mapping failed
distribution|distribution_rate_sync_failed|Rate sync failed
distribution|distribution_availability_sync_failed|Availability sync failed
distribution|distribution_reservation_sync_failed|Reservation sync failed
distribution|distribution_duplicate_reservation_detected|Duplicate reservation detected
distribution|distribution_inventory_mismatch|Inventory mismatch
distribution|distribution_channel_api_outage|Channel API outage
compliance|compliance_kyc_rejected|KYC rejected
compliance|compliance_identity_verification_failed|Identity verification failed
compliance|compliance_document_expired|Compliance document expired
compliance|compliance_account_restricted|Account restricted
tasks|task_new_booking|New booking
tasks|task_cleaning_required|Cleaning required
tasks|task_cleaning_assigned|Cleaning assigned
tasks|task_cleaning_overdue|Cleaning overdue
tasks|task_maintenance_issue|Maintenance issue
tasks|task_guest_arrival|Guest arrival
tasks|task_guest_departure|Guest departure
tasks|task_guest_request|Guest request
tasks|task_emergency_property_issue|Emergency property issue
tasks|task_completed|Task completed
`;

const categories = new Map();

for (const definition of HOST_NOTIFICATION_EVENT_DEFINITIONS.trim().split("\n")) {
  const [categoryKey, eventKey, eventLabel, requiredChannel] = definition.split("|");
  const category = categories.get(categoryKey) ?? {
    key: categoryKey,
    labelKey: categoryKey,
    events: [],
  };

  category.events.push({
    key: eventKey,
    event: eventLabel,
    ...(requiredChannel ? { requiredChannels: [requiredChannel] } : {}),
  });

  categories.set(categoryKey, category);
}

export const HOST_NOTIFICATION_CATEGORIES = [...categories.values()];

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
