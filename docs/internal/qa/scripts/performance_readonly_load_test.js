import http from "k6/http";
import { check, sleep } from "k6";

/*
 * Domits issue #24: controlled production read-only load test.
 *
 * Approval has been given for this small production-safe run.
 * This script intentionally calls only read-only GET endpoints and excludes
 * booking creation, payments, account creation, login, property mutations,
 * uploads, and all POST/PATCH/DELETE traffic.
 */

const KNOWN_ACTIVE_PROPERTY_ID = "eb212599-e1f7-40a4-a4e9-07e32f367a47";

const endpoints = [
  {
    name: "property_booking_engine_all",
    url: "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all",
  },
  {
    name: "property_listing_details",
    url: `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${KNOWN_ACTIVE_PROPERTY_ID}`,
  },
  {
    name: "booking_blocked_dates",
    url: `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=blockedDates&property_Id=${KNOWN_ACTIVE_PROPERTY_ID}`,
  },
];

export const options = {
  stages: [
    { duration: "1m", target: 1 },
    { duration: "2m", target: 2 },
    { duration: "2m", target: 5 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
  tags: {
    issue: "24",
    test_type: "controlled_readonly_load",
    environment: "production",
  },
};

export default function () {
  for (const endpoint of endpoints) {
    const response = http.get(endpoint.url, {
      tags: {
        endpoint: endpoint.name,
      },
    });

    check(response, {
      [`${endpoint.name} returned HTTP 200`]: (res) => res.status === 200,
    });

    // Keep traffic intentionally gentle between read-only requests.
    sleep(1);
  }

  // Pause between full endpoint cycles to avoid aggressive production traffic.
  sleep(2);
}
