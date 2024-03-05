import React from "react";

import HostDashboard from "./HostDashboard";
import HostMessages from "./HostSettings";
import HostPayments from "./HostSettings";
import HostListings from "./HostSettings";
import HostCalendar from "./HostCalendar";
import HostSettings from "./HostSettings";

const Dashboard = () => <HostDashboard />;
const Messages = () => <HostDashboard />;
const Payments = () => <HostDashboard />;
const Listing = () => <HostDashboard />;
const Calendar = () => <HostDashboard />;
const Settings = () => <HostDashboard />;

export { Dashboard, Messages, Payments, Listing, Calendar, Settings };