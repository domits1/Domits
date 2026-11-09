export const HOST_NOTIFICATION_CATEGORIES = [
  {
    "key": "propertyManager",
    "labelKey": "propertyManager",
    "events": [
      {
        "key": "manager_new_booking",
        "event": "New booking",
        "notification": "New reservation",
        "channel": "In-app + push",
        "action": "Review",
        "priority": "P3"
      },
      {
        "key": "manager_booking_modification",
        "event": "Booking modification",
        "notification": "Reservation changed",
        "channel": "In-app + push",
        "action": "Review",
        "priority": "P2"
      },
      {
        "key": "manager_cancellation",
        "event": "Cancellation",
        "notification": "Reservation cancelled",
        "channel": "Push + email",
        "action": "Review",
        "priority": "P2"
      },
      {
        "key": "manager_payment_failure",
        "event": "Payment failure",
        "notification": "Guest payment failed",
        "channel": "Push + email",
        "action": "Resolve",
        "priority": "P1"
      },
      {
        "key": "manager_double_booking_risk",
        "event": "Double-booking risk",
        "notification": "Conflict detected",
        "channel": "Push + SMS + email",
        "action": "Immediate intervention",
        "priority": "P0"
      },
      {
        "key": "manager_channel_disconnected",
        "event": "Channel disconnected",
        "notification": "OTA connection lost",
        "channel": "Push + email",
        "action": "Reconnect",
        "priority": "P1"
      },
      {
        "key": "manager_calendar_sync_failed",
        "event": "Calendar sync failed",
        "notification": "Sync problem",
        "channel": "Push",
        "action": "Investigate",
        "priority": "P1"
      },
      {
        "key": "manager_listing_mapping_error",
        "event": "Listing mapping error",
        "notification": "Property/channel mismatch",
        "channel": "Push",
        "action": "Fix mapping",
        "priority": "P1"
      },
      {
        "key": "manager_new_guest_message",
        "event": "New guest message",
        "notification": "Guest contacted property",
        "channel": "Push",
        "action": "Respond",
        "priority": "P2"
      },
      {
        "key": "manager_unanswered_message",
        "event": "Unanswered message",
        "notification": "SLA approaching",
        "channel": "Push",
        "action": "Respond",
        "priority": "P1"
      },
      {
        "key": "manager_cleaning_task_created",
        "event": "Cleaning task created",
        "notification": "New turnover task",
        "channel": "Push",
        "action": "Assign",
        "priority": "P2"
      },
      {
        "key": "manager_cleaning_task_overdue",
        "event": "Cleaning task overdue",
        "notification": "Task overdue",
        "channel": "Push + escalation",
        "action": "Resolve",
        "priority": "P1"
      },
      {
        "key": "manager_maintenance_issue",
        "event": "Maintenance issue",
        "notification": "Issue reported",
        "channel": "Push",
        "action": "Assign",
        "priority": "P1"
      },
      {
        "key": "manager_check_in_issue",
        "event": "Check-in issue",
        "notification": "Guest reports problem",
        "channel": "Push + SMS",
        "action": "Resolve",
        "priority": "P1"
      },
      {
        "key": "manager_review_received",
        "event": "Review received",
        "notification": "New guest review",
        "channel": "In-app",
        "action": "Review",
        "priority": "P3"
      },
      {
        "key": "manager_low_review",
        "event": "Low review",
        "notification": "Negative review",
        "channel": "Push",
        "action": "Follow up",
        "priority": "P2"
      },
      {
        "key": "manager_payout_generated",
        "event": "Payout generated",
        "notification": "Owner payout",
        "channel": "Email",
        "action": "Review",
        "priority": "P3"
      },
      {
        "key": "manager_payout_failed",
        "event": "Payout failed",
        "notification": "Payout failure",
        "channel": "Push + email",
        "action": "Resolve",
        "priority": "P1"
      },
      {
        "key": "manager_kyc_required",
        "event": "KYC required",
        "notification": "Verification needed",
        "channel": "Email + dashboard",
        "action": "Complete",
        "priority": "P2"
      },
      {
        "key": "manager_property_unpublished",
        "event": "Property unpublished",
        "notification": "Listing unavailable",
        "channel": "Push + email",
        "action": "Investigate",
        "priority": "P1"
      }
    ]
  },
  {
    "key": "bookings",
    "labelKey": "bookings",
    "events": [
      {
        "key": "booking_inquiry_received",
        "event": "Booking inquiry received",
        "priority": "P2",
        "recipients": "Manager"
      },
      {
        "key": "booking_created",
        "event": "Booking created",
        "priority": "P3",
        "recipients": "Manager"
      },
      {
        "key": "booking_confirmed",
        "event": "Booking confirmed",
        "priority": "P3",
        "recipients": "Manager"
      },
      {
        "key": "booking_modified",
        "event": "Booking modified",
        "priority": "P2",
        "recipients": "Manager"
      },
      {
        "key": "booking_cancelled_by_guest",
        "event": "Booking cancelled by guest",
        "priority": "P2",
        "recipients": "Manager"
      },
      {
        "key": "booking_cancelled_by_host",
        "event": "Booking cancelled by host",
        "priority": "P1",
        "recipients": "Manager"
      },
      {
        "key": "booking_cancellation_refund_initiated",
        "event": "Booking cancellation refund initiated",
        "priority": "P2",
        "recipients": "Manager"
      },
      {
        "key": "booking_cancellation_refund_completed",
        "event": "Booking cancellation refund completed",
        "priority": "P3",
        "recipients": "Manager"
      },
      {
        "key": "booking_payment_failed",
        "event": "Booking payment failed",
        "priority": "P1",
        "recipients": "Manager"
      },
      {
        "key": "booking_payment_received",
        "event": "Booking payment received",
        "priority": "P3",
        "recipients": "Manager"
      },
      {
        "key": "booking_payment_partially_received",
        "event": "Payment partially received",
        "priority": "P1",
        "recipients": "Manager"
      },
      {
        "key": "booking_payment_overdue",
        "event": "Payment overdue",
        "priority": "P2",
        "recipients": "Manager"
      },
      {
        "key": "booking_date_approaching",
        "event": "Booking date approaching",
        "priority": "P3",
        "recipients": "Manager"
      },
      {
        "key": "booking_check_in_approaching",
        "event": "Check-in approaching",
        "priority": "P3",
        "recipients": "Manager"
      },
      {
        "key": "booking_check_out_approaching",
        "event": "Check-out approaching",
        "priority": "P3",
        "recipients": "Manager"
      },
      {
        "key": "booking_guest_no_show",
        "event": "Guest no-show",
        "priority": "P2",
        "recipients": "Manager"
      },
      {
        "key": "booking_completed",
        "event": "Booking completed",
        "priority": "P3",
        "recipients": "Manager"
      }
    ]
  },
  {
    "key": "propertyOwner",
    "labelKey": "propertyOwner",
    "events": [
      {
        "key": "owner_new_booking",
        "event": "New booking",
        "notification": "Booking generated",
        "channel": "Email/dashboard",
        "priority": "P3"
      },
      {
        "key": "owner_booking_cancelled",
        "event": "Booking cancelled",
        "notification": "Booking cancelled",
        "channel": "Email",
        "priority": "P2"
      },
      {
        "key": "owner_revenue_received",
        "event": "Revenue received",
        "notification": "Revenue update",
        "channel": "Dashboard",
        "priority": "P3"
      },
      {
        "key": "owner_payout_generated",
        "event": "Owner payout generated",
        "notification": "Payout statement",
        "channel": "Email",
        "priority": "P3"
      },
      {
        "key": "owner_payout_completed",
        "event": "Payout completed",
        "notification": "Payment sent",
        "channel": "Email",
        "priority": "P3"
      },
      {
        "key": "owner_payout_failed",
        "event": "Payout failed",
        "notification": "Payment problem",
        "channel": "Email + push",
        "priority": "P1"
      },
      {
        "key": "owner_property_unavailable",
        "event": "Property unavailable",
        "notification": "Property taken offline",
        "channel": "Email",
        "priority": "P1"
      },
      {
        "key": "owner_major_maintenance",
        "event": "Major maintenance",
        "notification": "Major property issue",
        "channel": "Email",
        "priority": "P2"
      },
      {
        "key": "owner_negative_review",
        "event": "Negative review",
        "notification": "Significant negative review",
        "channel": "Email",
        "priority": "P2"
      },
      {
        "key": "owner_monthly_performance_report",
        "event": "Monthly performance report",
        "notification": "Revenue/occupancy/ADR",
        "channel": "Email",
        "priority": "P4"
      },
      {
        "key": "owner_monthly_statement",
        "event": "Monthly statement",
        "notification": "Financial statement",
        "channel": "Email",
        "priority": "P4"
      },
      {
        "key": "owner_contract_issue",
        "event": "Contract issue",
        "notification": "Agreement requires attention",
        "channel": "Email",
        "priority": "P2"
      }
    ]
  },
  {
    "key": "finance",
    "labelKey": "finance",
    "events": [
      {
        "key": "finance_guest_payment_received",
        "event": "Guest payment received",
        "recipients": "Finance, Owner, Manager",
        "priority": "P3"
      },
      {
        "key": "finance_payment_failed",
        "event": "Payment failed",
        "recipients": "Finance, Manager",
        "priority": "P1"
      },
      {
        "key": "finance_refund_initiated",
        "event": "Refund initiated",
        "recipients": "Finance, Owner, Manager",
        "priority": "P2"
      },
      {
        "key": "finance_refund_completed",
        "event": "Refund completed",
        "recipients": "Finance, Owner, Manager",
        "priority": "P3"
      },
      {
        "key": "finance_owner_payout_generated",
        "event": "Owner payout generated",
        "recipients": "Finance, Owner, Manager",
        "priority": "P3"
      },
      {
        "key": "finance_owner_payout_failed",
        "event": "Owner payout failed",
        "recipients": "Finance, Owner, Manager, Domits Admin",
        "priority": "P1"
      },
      {
        "key": "finance_commission_calculated",
        "event": "Commission calculated",
        "recipients": "Finance, Owner, Manager",
        "priority": "P3"
      },
      {
        "key": "finance_reconciliation_mismatch",
        "event": "Reconciliation mismatch",
        "recipients": "Finance, Manager, Domits Admin",
        "priority": "P0/P1"
      },
      {
        "key": "finance_unmatched_transaction",
        "event": "Unmatched transaction",
        "recipients": "Finance, Manager, Domits Admin",
        "priority": "P1"
      },
      {
        "key": "finance_chargeback",
        "event": "Chargeback",
        "recipients": "Finance, Owner, Manager, Domits Admin",
        "priority": "P1"
      },
      {
        "key": "finance_tax_reporting_event",
        "event": "Tax/reporting event",
        "recipients": "Finance, Owner, Manager",
        "priority": "P2"
      },
      {
        "key": "finance_accounting_export_failed",
        "event": "Accounting export failed",
        "recipients": "Finance, Manager, Domits Admin",
        "priority": "P1"
      }
    ]
  },
  {
    "key": "distribution",
    "labelKey": "distribution",
    "events": [
      {
        "key": "distribution_listing_published",
        "event": "Listing published",
        "recipients": "Manager, Channel/OTA",
        "priority": "P3"
      },
      {
        "key": "distribution_listing_unpublished",
        "event": "Listing unpublished",
        "recipients": "Manager, Domits Ops, Channel/OTA",
        "priority": "P1"
      },
      {
        "key": "distribution_channel_connected",
        "event": "Channel connected",
        "recipients": "Manager, Channel/OTA",
        "priority": "P3"
      },
      {
        "key": "distribution_channel_disconnected",
        "event": "Channel disconnected",
        "recipients": "Manager, Domits Ops, Developer, Channel/OTA",
        "priority": "P0/P1"
      },
      {
        "key": "distribution_api_authentication_failed",
        "event": "API authentication failed",
        "recipients": "Manager, Domits Ops, Developer",
        "priority": "P1"
      },
      {
        "key": "distribution_property_mapping_failed",
        "event": "Property mapping failed",
        "recipients": "Manager, Domits Ops, Developer",
        "priority": "P1"
      },
      {
        "key": "distribution_rate_sync_failed",
        "event": "Rate sync failed",
        "recipients": "Manager, Domits Ops, Developer",
        "priority": "P1"
      },
      {
        "key": "distribution_availability_sync_failed",
        "event": "Availability sync failed",
        "recipients": "Manager, Domits Ops, Developer",
        "priority": "P0"
      },
      {
        "key": "distribution_reservation_sync_failed",
        "event": "Reservation sync failed",
        "recipients": "Manager, Domits Ops, Developer",
        "priority": "P0"
      },
      {
        "key": "distribution_duplicate_reservation_detected",
        "event": "Duplicate reservation detected",
        "recipients": "Manager, Domits Ops, Developer",
        "priority": "P0"
      },
      {
        "key": "distribution_inventory_mismatch",
        "event": "Inventory mismatch",
        "recipients": "Manager, Domits Ops, Developer",
        "priority": "P0"
      },
      {
        "key": "distribution_channel_api_outage",
        "event": "Channel API outage",
        "recipients": "Manager, Domits Ops, Developer, Channel/OTA",
        "priority": "P1"
      }
    ]
  },
  {
    "key": "compliance",
    "labelKey": "compliance",
    "events": [
      {
        "key": "compliance_kyc_rejected",
        "event": "KYC rejected",
        "recipients": "Guest, Owner, Manager, Compliance, Admin"
      },
      {
        "key": "compliance_identity_verification_failed",
        "event": "Identity verification failed",
        "recipients": "Guest, Owner, Manager, Compliance, Admin"
      },
      {
        "key": "compliance_document_expired",
        "event": "Compliance document expired",
        "recipients": "Owner, Manager, Compliance, Admin"
      },
      {
        "key": "compliance_account_restricted",
        "event": "Account restricted",
        "recipients": "Guest, Owner, Manager, Compliance, Admin"
      }
    ]
  },
  {
    "key": "tasks",
    "labelKey": "tasks",
    "events": [
      {
        "key": "task_new_booking",
        "event": "New booking",
        "channel": "Push",
        "recipients": "Housekeeping"
      },
      {
        "key": "task_cleaning_required",
        "event": "Cleaning required",
        "channel": "Push",
        "recipients": "Housekeeping"
      },
      {
        "key": "task_cleaning_assigned",
        "event": "Cleaning assigned",
        "channel": "Push",
        "recipients": "Housekeeping"
      },
      {
        "key": "task_cleaning_overdue",
        "event": "Cleaning overdue",
        "channel": "Push + escalation",
        "recipients": "Housekeeping"
      },
      {
        "key": "task_maintenance_issue",
        "event": "Maintenance issue",
        "channel": "Push",
        "recipients": "Maintenance, Guest Services"
      },
      {
        "key": "task_guest_arrival",
        "event": "Guest arrival",
        "channel": "Push",
        "recipients": "Housekeeping, Guest Services"
      },
      {
        "key": "task_guest_departure",
        "event": "Guest departure",
        "channel": "Push",
        "recipients": "Housekeeping, Guest Services"
      },
      {
        "key": "task_guest_request",
        "event": "Guest request",
        "channel": "Push",
        "recipients": "Maintenance, Guest Services"
      },
      {
        "key": "task_emergency_property_issue",
        "event": "Emergency property issue",
        "channel": "SMS + Push",
        "recipients": "Housekeeping, Maintenance, Guest Services"
      },
      {
        "key": "task_completed",
        "event": "Task completed",
        "channel": "In-app",
        "recipients": "Housekeeping, Maintenance, Guest Services"
      }
    ]
  }
];

export const HOST_NOTIFICATION_EVENT_KEYS = HOST_NOTIFICATION_CATEGORIES.flatMap((category) => category.events.map((event) => event.key));

export const DEFAULT_HOST_NOTIFICATION_PREFERENCES = Object.freeze(
    Object.fromEntries(HOST_NOTIFICATION_EVENT_KEYS.map((eventKey) => [eventKey, true]))
);
