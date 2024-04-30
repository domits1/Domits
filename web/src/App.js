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
import ListingDetails from './components/listingdetails/ListingDetails';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import GuestDashboard from './components/guestdashboard/GuestDashboard';
import Disclaimers from "./components/disclaimers/Disclaimers";
import Policy from "./components/disclaimers/Policy";
import Terms from "./components/disclaimers/Terms";
import Login from "./components/base/Login";
import Register from "./components/base/Register";
import ConfirmRegister from "./components/base/ConfirmRegister";
import { AuthProvider } from './components/base/AuthContext';
import PaymentsGuestDashboard from "./components/guestdashboard/PaymentsGuestDashboard";
import Chat from "./components/chat/Chat";
import SettingsGuestDashboard from "./components/guestdashboard/SettingsGuestDashboard";
import FlowContext from './FlowContext'
import ReviewsGuestDashboard from "./components/guestdashboard/ReviewsGuestDashboard";

Modal.setAppElement('#root');

function App() {
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false); 
    useEffect(() => {
        // console.log('Updated searchResults:', searchResults);
        document.title = 'Domits';
    }, [searchResults]);

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

                            {/* Chat */}
                            <Route path="/chat" element={<Chat />} />

                            {/* Guest Dashboard */}
                            <Route path="/guestdashboard" element={<GuestDashboard />} />
                            <Route path="/guestdashboard/messages" element={<ListingDetails />} />
                            <Route path="/guestdashboard/payments" element={<PaymentsGuestDashboard />} />
                            <Route path="/guestdashboard/reviews" element={<ReviewsGuestDashboard />} />
                            <Route path="/guestdashboard/settings" element={<SettingsGuestDashboard />} />
                            <Route path="/guestdashboard/Chat" element={<Chat />} />

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
                            <Route path="/hostdashboard/payments" element={<HostPayments />} />
                            <Route path="/hostdashboard/settings" element={<HostSettings />} />
                            <Route path="/hostdashboard/reviews" element={<HostReviews />} />
                            <Route path="/hostdashboard/Chat" element={<Chat />} />

                            {/* Career, Policies, and Terms */}
                            <Route path="/career" element={<Careers />} />
                            <Route path="/policy" element={<Policy />} />
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/disclaimers" element={<Disclaimers />} />
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

