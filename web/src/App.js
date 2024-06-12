import './App.css';
import HostProtectedRoute from './HostProtectedRoute';
import { UserProvider } from './UserContext';
import Header from "./components/base/Header";
import Footer from "./components/base/Footer";
import Landing from "./components/landingpage/Landing";
import Travelinnovation from "./components/ninedots/travelinnovation";
import Home from './components/home/Accommodations';
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
import HostReviews from "./components/hostdashboard/HostReviews";
import ListingDetails from './components/booking/ListingDetails';
import BookingOverview from './components/booking/BookingOverview';
import BookingConfirmation from "./components/booking/PaymentConfirm";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import Disclaimers from "./components/disclaimers/Disclaimers";
import Policy from "./components/disclaimers/Policy";
import Terms from "./components/disclaimers/Terms";
import Login from "./components/base/Login";
import Register from "./components/base/Register";
import ConfirmRegister from "./components/base/ConfirmRegister";
import { AuthProvider } from './components/base/AuthContext';
import GuestDashboard from './components/guestdashboard/GuestDashboard';
import GuestBooking from './components/guestdashboard/GuestBooking';
import GuestPayments from "./components/guestdashboard/GuestPayments";
import GuestReviews from "./components/guestdashboard/GuestReviews";
import GuestSettings from "./components/guestdashboard/GuestSettings";
import Chat from "./components/chat/Chat";
import FlowContext from './FlowContext'
import Hostchat from './components/hostdashboard/Hostchat';
import ScrollToTop from "./components/ScrollToTop/ScrollToTop.tsx";
import HostReservations from "./components/hostdashboard/HostReservations";
import HostDraft from"./components/hostdashboard/HostDraft";
import HostRevenues from "./components/hostdashboard/HostRevenues";
import HostOccupancy from "./components/hostdashboard/HostOccupancy";
import HostPropertyCare from "./components/hostdashboard/HostPropertyCare";
import HostIoTHub from "./components/hostdashboard/HostIoTHub";
import HostPricing from "./components/hostdashboard/HostPricing";
import HostDistribution from "./components/hostdashboard/HostDistribution";
import HostMonitoring from "./components/hostdashboard/HostMonitoring";
import HostScreening from "./components/hostdashboard/HostScreening";
import HostSetup from "./components/hostdashboard/HostSetup";
import HostPromoCodes from "./components/hostdashboard/HostPromoCodes";
import { initializeUserAttributes } from './components/utils/userAttributes';
import PageNotFound from "./components/error/404NotFound";

Modal.setAppElement('#root');

function App() {
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false); 
    useEffect(() => {
        // console.log('Updated searchResults:', searchResults);
        document.title = 'Domits';
    }, [searchResults]);

    useEffect(() => {
        initializeUserAttributes();
    }, []);

    const currentPath = window.location.pathname;

    const renderFooter = () => {
        if (['/admin', '/bookingoverview', '/bookingpayment'].includes(currentPath)) {
            return null;
        }
        return <Footer />;
    };

    const [flowState, setFlowState] = useState({ isHost: false });

    return (
        <FlowContext.Provider value={{ flowState, setFlowState }}>
            <Router>
                <ScrollToTop />
                <AuthProvider>
                <UserProvider>
                    <div className="App">
                    {currentPath !== '/admin' && <Header setSearchResults={setSearchResults} setLoading={setLoading} />}
                        <Routes>
                            <Route path="/" element={<Home searchResults={searchResults} />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/release" element={<Release />} />
                            <Route path="/helpdesk" element={<Helpdesk />} />
                            <Route path="/howitworks" element={<Howitworks />} />
                            <Route path="/why-domits" element={<Whydomits />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/travelinnovation" element={<Travelinnovation />} />
                            <Route path="/landing" element={<Landing />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/confirm-email" element={<ConfirmRegister />} />
                            <Route path="/listingdetails" element={<ListingDetails />} />
                            <Route path="/bookingoverview" element={<BookingOverview />} />
                            <Route path="/bookingconfirmation" element={<BookingConfirmation />} />

                            {/* Chat */}
                            <Route path="/chat" element={<Chat />} />

                            {/* Guest Dashboard */}
                            <Route path="/guestdashboard" element={<GuestDashboard />} />
                            <Route path="/guestdashboard/messages" element={<ListingDetails />} />
                            <Route path="/guestdashboard/payments" element={<GuestPayments />} />
                            <Route path="/guestdashboard/reviews" element={<GuestReviews />} />
                            <Route path="/guestdashboard/bookings" element={<GuestBooking />} />
                            <Route path="/guestdashboard/settings" element={<GuestSettings />} />
                            <Route path="/guestdashboard/chat" element={<Chat />} />
                            {/*<Route path="/profilepictures" element={<UserProfile/>}/>*/}

                            {/* Host Management */}
                            <Route path="/enlist" element={<HostOnboarding />} />
                            <Route path="/hostdashboard" element={
                                    <HostProtectedRoute>
                                        <HostDashboard />
                                    </HostProtectedRoute>
                                } />
                            <Route path="/hostdashboard/listings" element={<HostListings />} />
                            <Route path="/hostdashboard/calendar" element={<HostCalendar />} />
                            <Route path="/hostdashboard/messages" element={<HostMessages />} />
                            <Route path="/hostdashboard/reporting" element={<HostPayments />} />
                            <Route path="/hostdashboard/settings" element={<HostSettings />} />
                            <Route path="/hostdashboard/reviews" element={<HostReviews />} />
                            <Route path="/hostdashboard/chat" element={<Hostchat />} />
                            <Route path="/hostdashboard/reservations" element={<HostReservations />}/>
                            <Route path="/hostdashboard/drafts" element={<HostDraft />}/>
                            <Route path="/hostdashboard/revenues" element={<HostRevenues />} />
                            <Route path="/hostdashboard/occupancy" element={<HostOccupancy />} />
                            <Route path="/hostdashboard/property-care" element={<HostPropertyCare />} />
                            <Route path="/hostdashboard/iot-hub" element={<HostIoTHub />} />
                            <Route path="/hostdashboard/pricing" element={<HostPricing />} />
                            <Route path="/hostdashboard/distribution" element={<HostDistribution />} />
                            <Route path="/hostdashboard/monitoring" element={<HostMonitoring />} />
                            <Route path="/hostdashboard/screening" element={<HostScreening />} />
                            <Route path="/hostdashboard/setup" element={<HostSetup />} />
                            <Route path="/hostdashboard/promo-codes" element={<HostPromoCodes />} />

                            {/* Career, Policies, and Terms */}
                            <Route path="/career" element={<Careers />} />
                            <Route path="/policy" element={<Policy />} />
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/disclaimers" element={<Disclaimers />} />

                            {/* Error*/}
                            <Route path="/*" element={<PageNotFound />} />
                        </Routes>
                        {renderFooter()}
                    </div>
                    </UserProvider>
                </AuthProvider>
            </Router>
        </FlowContext.Provider>
    );
}
export default App;
