import './App.css';
import Header from "./components/base/Header";
import Footer from "./components/base/Footer";
import Landing from "./components/landingpage/Landing";
import Travelinnovation from "./components/ninedots/travelinnovation";
import Assortment from './components/assortment/Assortment';
import Home from "./components/home/Home";
import Booking from "./components/booking/Booking";
import About from "./components/about/About";
import Whydomits from "./components/about/Whydomits";
import Release from "./components/about/release.js";
import Helpdesk from "./components/about/Helpdesk.js";
import Howitworks from "./components/about/Howitworks.js";
import Careers from "./components/careers/Careers";
import Contact from "./components/contact/Contact";
import HostOnboarding from "./components/landingpage/OnboardingHost";
import HostDashboard from "./components/hostdashboard/HostDashboard";
import HostMessages from "./components/hostdashboard/HostMessages";
import HostPayments from "./components/hostdashboard/HostPayments";
import HostListings from "./components/hostdashboard/HostListings";
import HostCalendar from "./components/hostdashboard/HostCalendar";
import HostSettings from "./components/hostdashboard/HostSettings";
import ListingDetails from './components/listingdetails/ListingDetails';
import HomeDashboard from "./components/admindashboard/HomeDashboard";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import BookingOverview from "./components/bookingprocess/BookingOverview";
import BookingPayment from "./components/bookingprocess/BookingPayment";
import BookingConfirmed from "./components/bookingprocess/BookingConfirmed";
import BookingDeclined from "./components/bookingprocess/BookingDeclined";
import GuestDashboard from './components/guestdashboard/GuestDashboard';
import { ProtectedRoute } from "./components/protectedroute/ProtectedRoute.tsx";
import Disclaimers from "./components/disclaimers/Disclaimers";
import Policy from "./components/disclaimers/Policy";
import Terms from "./components/disclaimers/Terms";
import Login from "./components/base/Login";
import Register from "./components/base/Register";
import ConfirmRegister from "./components/base/ConfirmRegister";
import Error from "./components/errorpage/errorpage";
import Stripe from 'stripe';
import { AuthProvider } from './components/base/AuthContext';
import PaymentsGuestDashboard from "./components/guestdashboard/PaymentsGuestDashboard"; // Import the AuthProvider
import Chat from "./components/chat/Chat";
import Chatprototype from "./components/chat/Chatprototype.js";
import SettingsGuestDashboard from "./components/guestdashboard/SettingsGuestDashboard";
import FlowContext from './FlowContext'
import ReviewsGuestDashboard from "./components/guestdashboard/ReviewsGuestDashboard";

// Set the app element for react-modal
Modal.setAppElement('#root'); // Assuming your root element has the id 'root'

function App() {
    useEffect(() => {
        return () => {
            document.title = 'Domits';
        };
    }, []);

    // Conditionally render the Header based on the current route
    const renderHeader = () => {
        const currentPath = window.location.pathname;
        if (currentPath === '/admin') {
            return null;
        }
        return <Header />;
    };

    const renderFooter = () => {
        const currentPath = window.location.pathname;
        if (currentPath === '/admin' || currentPath === '/bookingoverview' || currentPath === '/bookingpayment') {
            return null; // Don't render Footer for certain routes
        }
        return <Footer />; // Render Footer for other routes
    };

    const [flowState, setFlowState] = useState({ isHost: false });

    return (
        <FlowContext.Provider value={{ flowState, setFlowState }}>
            <Router>
                <AuthProvider> {/* Wrap your entire application with the AuthProvider */}
                    <div className="App">
                        {renderHeader()}
                        <Routes>
                            {/* General Routes */}
                            <Route path="/" element={<Assortment />} />
                            <Route path="/home" element={<Home />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/release" element={<Release />} />
                            <Route path="/helpdesk" element={<Helpdesk />} />
                            <Route path="/howitworks" element={<Howitworks />} />
                            <Route path="/why-domits" element={<Whydomits />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/travelinnovation" element={<Travelinnovation />} />
                            <Route path="/landing" element={<Landing />} />

                            {/* Authentication & User Account Management */}
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/confirm-email" element={<ConfirmRegister />} />
                            <Route path="/error" element={<Error />} />
                            {/*<Route path="/release" element={<Release/>}/>*/}

                            {/* Booking */}
                            <Route path="/booking" element={<Booking />} />
                            <Route path="/listingdetails" element={<ListingDetails />} />
                            <Route path="/bookingoverview" element={<BookingOverview />} />
                            <Route path="/bookingpayment" element={<BookingPayment />} />
                            <Route path="/bookingconfirmed" element={<BookingConfirmed />} />
                            <Route path="/bookingdeclined" element={<BookingDeclined />} />

                            {/* Chat */}
                            <Route path="/chatprototype" element={<Chatprototype />} />

                            {/* Guest Dashboard */}
                            <Route path="/guestdashboard" element={<GuestDashboard />} />
                            <Route path="/guestdashboard/messages" element={<ListingDetails />} />
                            <Route path="/guestdashboard/payments" element={<PaymentsGuestDashboard />} />
                            <Route path="/guestdashboard/reviews" element={<ReviewsGuestDashboard />} />
                            <Route path="/guestdashboard/settings" element={<SettingsGuestDashboard />} />

                            {/* Host Management */}
                            <Route path="/enlist" element={<HostOnboarding />} />
                            <Route path="/hostdashboard" element={<HostDashboard />} />
                            <Route path="/hostdashboard/listings" element={<HostListings />} />
                            <Route path="/hostdashboard/calendar" element={<HostCalendar />} />
                            <Route path="/hostdashboard/messages" element={<HostMessages />} />
                            <Route path="/hostdashboard/payments" element={<HostPayments />} />
                            <Route path="/hostdashboard/settings" element={<HostSettings />} />

                            {/* Career, Policies, and Terms */}
                            <Route path="/career" element={<Careers />} />
                            <Route path="/policy" element={<Policy />} />
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/disclaimers" element={<Disclaimers />} />

                            {/* Admin Routes */}
                            <Route path="/admin" element={<ProtectedRoute allowedRoles={["Admin"]} page={<HomeDashboard />} redirectTo='/' />} />
                        </Routes>
                        {renderFooter()}
                    </div>
                </AuthProvider>
            </Router>
        </FlowContext.Provider>

    );
}

export default App;

