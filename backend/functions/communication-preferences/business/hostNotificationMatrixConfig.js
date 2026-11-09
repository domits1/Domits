const createEvents = (prefix, rows) => rows.trim().split("\n").map((row) => {
  const [suffix, event] = row.split("|");
  return { key: prefix + "_" + suffix, event };
});

export const HOST_NOTIFICATION_CATEGORIES = [
  {
    key: "propertyManager",
    labelKey: "propertyManager",
    events: createEvents("manager", `
new_booking|New booking
booking_modification|Booking modification
cancellation|Cancellation
payment_failure|Payment failure
double_booking_risk|Double-booking risk
channel_disconnected|Channel disconnected
calendar_sync_failed|Calendar sync failed
listing_mapping_error|Listing mapping error
new_guest_message|New guest message
unanswered_message|Unanswered message
cleaning_task_created|Cleaning task created
cleaning_task_overdue|Cleaning task overdue
maintenance_issue|Maintenance issue
check_in_issue|Check-in issue
review_received|Review received
low_review|Low review
payout_generated|Payout generated
payout_failed|Payout failed
kyc_required|KYC required
property_unpublished|Property unpublished
    `),
  },
  {
    key: "bookings",
    labelKey: "bookings",
    events: createEvents("booking", `
inquiry_received|Booking inquiry received
created|Booking created
confirmed|Booking confirmed
modified|Booking modified
cancelled_by_guest|Booking cancelled by guest
cancelled_by_host|Booking cancelled by host
cancellation_refund_initiated|Booking cancellation refund initiated
cancellation_refund_completed|Booking cancellation refund completed
payment_failed|Booking payment failed
payment_received|Booking payment received
payment_partially_received|Payment partially received
payment_overdue|Payment overdue
date_approaching|Booking date approaching
check_in_approaching|Check-in approaching
check_out_approaching|Check-out approaching
guest_no_show|Guest no-show
completed|Booking completed
    `),
  },
  {
    key: "propertyOwner",
    labelKey: "propertyOwner",
    events: createEvents("owner", `
new_booking|New booking
booking_cancelled|Booking cancelled
revenue_received|Revenue received
payout_generated|Owner payout generated
payout_completed|Payout completed
payout_failed|Payout failed
property_unavailable|Property unavailable
major_maintenance|Major maintenance
negative_review|Negative review
monthly_performance_report|Monthly performance report
monthly_statement|Monthly statement
contract_issue|Contract issue
    `),
  },
  {
    key: "finance",
    labelKey: "finance",
    events: createEvents("finance", `
guest_payment_received|Guest payment received
payment_failed|Payment failed
refund_initiated|Refund initiated
refund_completed|Refund completed
owner_payout_generated|Owner payout generated
owner_payout_failed|Owner payout failed
commission_calculated|Commission calculated
reconciliation_mismatch|Reconciliation mismatch
unmatched_transaction|Unmatched transaction
chargeback|Chargeback
tax_reporting_event|Tax/reporting event
accounting_export_failed|Accounting export failed
    `),
  },
  {
    key: "distribution",
    labelKey: "distribution",
    events: createEvents("distribution", `
listing_published|Listing published
listing_unpublished|Listing unpublished
channel_connected|Channel connected
channel_disconnected|Channel disconnected
api_authentication_failed|API authentication failed
property_mapping_failed|Property mapping failed
rate_sync_failed|Rate sync failed
availability_sync_failed|Availability sync failed
reservation_sync_failed|Reservation sync failed
duplicate_reservation_detected|Duplicate reservation detected
inventory_mismatch|Inventory mismatch
channel_api_outage|Channel API outage
    `),
  },
  {
    key: "compliance",
    labelKey: "compliance",
    events: createEvents("compliance", `
kyc_rejected|KYC rejected
identity_verification_failed|Identity verification failed
document_expired|Compliance document expired
account_restricted|Account restricted
    `),
  },
  {
    key: "tasks",
    labelKey: "tasks",
    events: createEvents("task", `
new_booking|New booking
cleaning_required|Cleaning required
cleaning_assigned|Cleaning assigned
cleaning_overdue|Cleaning overdue
maintenance_issue|Maintenance issue
guest_arrival|Guest arrival
guest_departure|Guest departure
guest_request|Guest request
emergency_property_issue|Emergency property issue
completed|Task completed
    `),
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
