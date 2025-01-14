import './App.css';
import HostProtectedRoute from './HostProtectedRoute';
import { UserProvider } from './UserContext';
import Header from "./components/base/Header";
import Footer from "./components/base/Footer";
import Landing from "./components/landingpage/Landing";
import Travelinnovation from "./components/ninedots/travelinnovation";
import Home from './components/home/Accommodations';
import Homepage from './components/home/homePage.js';
import About from "./components/about/About";
import Whydomits from "./components/about/Whydomitstwo.js";
import Release from "./components/about/release.js";
import ReleaseTwo from "./components/about/releaseTwo.js";
import Datasafety from "./components/about/datasafety.js";
import Helpdesk from "./components/about/Helpdesk.js";
import Howitworks from "./components/about/Howitworks.js";
import Careers from "./components/careers/Careers";
import JobDetails from "./components/careers/jobDetails.js";
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
import ConfirmRegister from "./components/base/confirmEmail/ConfirmEmailView.js";
import { AuthProvider } from './components/base/AuthContext';
import GuestDashboard from './components/guestdashboard/GuestDashboard';
import GuestBooking from './components/guestdashboard/GuestBooking';
import GuestPayments from "./components/guestdashboard/GuestPayments";
import GuestReviews from "./components/guestdashboard/GuestReviews";
import GuestSettings from "./components/guestdashboard/GuestSettings";
import Chat from "./components/chat/Chat.js";
import Chatbot from "./components/chatbot/chatbot";
import ChatWidget from "./components/chatwidget/ChatWidget";
import EmployeeChat from './components/employee/EmployeeChat';
import FlowContext from './FlowContext';
import Hostchat from './components/hostdashboard/Hostchat';
import ScrollToTop from "./components/ScrollToTop/ScrollToTop.tsx";
import HostReservations from "./components/hostdashboard/HostReservations";
import HostRevenues from "./components/hostdashboard/HostRevenues";
import HostPropertyCare from "./components/hostdashboard/HostPropertyCare";
import HostIoTHub from "./components/hostdashboard/HostIoTHub";
import HostPricing from "./components/hostdashboard/HostPricing";
import HostDistribution from "./components/hostdashboard/HostDistribution";
import HostMonitoring from "./components/hostdashboard/HostMonitoring";
import HostScreening from "./components/hostdashboard/HostScreening";
import HostSetup from "./components/hostdashboard/HostSetup";
import HostPromoCodes from "./components/hostdashboard/HostPromoCodes";
import HostVerificationView from "./components/hostverification/HostVerificationView.js";
import PhoneNumberView from './components/hostverification/PhoneNumberView.js';
import PhoneNumberConfirmView from './components/hostverification/PhoneNumberConfirmView.js';
import { initializeUserAttributes } from './components/utils/userAttributes';
import PageNotFound from "./components/error/404NotFound";
import StripeCallback from "./components/stripe/StripeCallback";
import ReviewPage from "./components/review/ReviewPage";
import MenuBar from "./components/base/MenuBar";
import HostFinanceTab from "./components/hostdashboard/HostFinanceTab";
import PaymentConfirmPage from "./components/booking/PaymentConfirmPage";


import AccommodationTypeView from './components/hostonboarding/views/AccommodationTypeView.js';
import GuestAccessView from './components/hostonboarding/views/GuestAccessView.js';
import BoatTypeView from './components/hostonboarding/views/BoatTypeView.js';
import CamperTypeView from './components/hostonboarding/views/CamperTypeView.js';
import AddressInputView from './components/hostonboarding/views/AddressInputView.js';
import CapacityView from './components/hostonboarding/views/GuestAmountView.js';
import AmenitiesView from './components/hostonboarding/views/AmenitiesView.js';
import HouseRulesView from './components/hostonboarding/views/HouseRulesView.js';
import PhotosView from './components/hostonboarding/views/PhotosView.js';
import AccommodationTitleView from './components/hostonboarding/views/AccommodationTitleView.js';
import DescriptionView from './components/hostonboarding/views/DescriptionView.js';
import PricingView from './components/hostonboarding/views/PricingView.js';
import AvailabilityView from './components/hostonboarding/views/AvailabilityView.js';
import RegistrationNumberView from './components/hostverification/RegistrationNumberView.js';
import SummaryView from './components/hostonboarding/views/SummaryView.js';



import { Auth } from 'aws-amplify';
import GuestProtectedRoute from "./GuestProtectedRoute";
import Hostchatbot from "./components/hostchatbot/hostchatbot";
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import ReleaseUpdates from './components/about/ReleaseUpdates.js'


Modal.setAppElement('#root');

function App() {
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // Apollo Client
    const client = new ApolloClient({
        uri: 'https://73nglmrsoff5xd5i7itszpmd44.appsync-api.eu-north-1.amazonaws.com/graphql',  //
        cache: new InMemoryCache(),
        headers: {
            "x-api-key": "da2-r65bw6jphfbunkqyyok5kn36cm",   // Replace with your AppSync API key
        },
    });

    useEffect(() => {
        document.title = 'Domits';
    }, [searchResults]);

    useEffect(() => {
        initializeUserAttributes();
    }, []);

    const currentPath = window.location.pathname;

    const renderFooter = () => {
        if (['/admin', '/bookingoverview', '/bookingpayment'].includes(currentPath) || currentPath.startsWith('/verify')) {
            return null;
        }
        return <Footer />;
    };

    const renderChatWidget = () => {
        if (currentPath.startsWith('/verify')) {
            return null;
        }
        return <ChatWidget />;
    };

    const [flowState, setFlowState] = useState({ isHost: false });


    return (
        <ApolloProvider client={client}> {/* ApolloProvider */}
            <FlowContext.Provider value={{ flowState, setFlowState }}>
                <Router>
                    <ScrollToTop />
                    <AuthProvider>
                        <UserProvider>
                            <div className="App">
                            {currentPath !== '/admin' && <Header setSearchResults={setSearchResults} setLoading={setLoading} />}
                                <Routes>
                                    <Route path="/home" element={<Home searchResults={searchResults} />} />
                                    <Route path="/" element={<Homepage />} />
                                    <Route path="/about" element={<About />} />
                                    {/* <Route path="/release" element={<Release />} /> */}
                                    <Route path="/releaseTwo" element={<ReleaseTwo />} />
                                    <Route path="/data-safety" element={<Datasafety />} />
                                    <Route path="/helpdesk-guest" element={<Helpdesk category="guest" />} />
                                    <Route path="/helpdesk-host" element={<Helpdesk category="host" />} />
                                    <Route path="/how-it-works" element={<Howitworks />} />
                                    <Route path="/why-domits" element={<Whydomits />} />
                                    <Route path="/contact" element={<Contact />} />
                                    <Route path="/travelinnovation" element={<Travelinnovation />} />
                                    <Route path="/release" element={<ReleaseUpdates />} />
                                    <Route path="/landing" element={<Landing />} />
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/register" element={<Register />} />
                                    <Route path="/confirm-email" element={<ConfirmRegister />} />
                                    <Route path="/listingdetails" element={<ListingDetails />} />
                                    <Route path="/bookingoverview" element={<BookingOverview />} />
                                    <Route path="/bookingconfirmation" element={<BookingConfirmation />} />
                                    <Route path="/bookingconfirmationoverview" element={<PaymentConfirmPage />} />

                                    {/* Chat */}
                                    <Route path="/chat" element={<Chat />} />
                                    <Route path="/employeechat" element={<EmployeeChat />} />
                                    <Route path="/chatbot" element={<Chatbot />} />

                                    {/* Host Chatbot */}
                                    <Route path="/hostchatbot" element={<Hostchatbot />} />

                                    {/* Review */}
                                    <Route path="/review" element={<ReviewPage />} />

                                    {/* Guest Dashboard */}
                                    <Route
                                        path="/guestdashboard/*"
                                        element={
                                            <GuestProtectedRoute>
                                                <Routes>
                                                    <Route path="/" element={<GuestDashboard />} />
                                                    <Route path="messages" element={<ListingDetails />} />
                                                    <Route path="payments" element={<GuestPayments />} />
                                                    <Route path="reviews" element={<GuestReviews />} />
                                                    <Route path="bookings" element={<GuestBooking />} />
                                                    <Route path="settings" element={<GuestSettings />} />
                                                    <Route path="chat" element={<Chat />} />
                                                </Routes>
                                            </GuestProtectedRoute>
                                        }
                                    />

                                    {/* Host Management */}
                                    <Route path="/enlist" element={<HostOnboarding />} />

                            {/* Verification */}
                            <Route path="/verify" element={<HostVerificationView />} />
                            <Route path="/verify/phonenumber" element={<PhoneNumberView />} />
                            <Route path="/verify/phonenumber/confirm" element={<PhoneNumberConfirmView />} />


                                    <Route path="/hostdashboard" element={
                                        <HostProtectedRoute>
                                            <HostDashboard />
                                        </HostProtectedRoute>
                                    } />
                                    <Route
                                        path="/hostdashboard/*"
                                        element={
                                            <HostProtectedRoute>
                                                <Routes>
                                                    <Route path="listings" element={<HostListings />} />
                                                    <Route path="calendar" element={<HostCalendar />} />
                                                    <Route path="messages" element={<HostMessages />} />
                                                    <Route path="reporting" element={<HostPayments />} />
                                                    <Route path="settings" element={<HostSettings />} />
                                                    <Route path="reviews" element={<HostReviews />} />
                                                    <Route path="chat" element={<Hostchat />} />
                                                    <Route path="reservations" element={<HostReservations />} />
                                                    <Route path="revenues" element={<HostRevenues />} /> {/* HostRevenues */}
                                                    <Route path="property-care" element={<HostPropertyCare />} />
                                                    <Route path="iot-hub" element={<HostIoTHub />} />
                                                    <Route path="pricing" element={<HostPricing />} />
                                                    <Route path="distribution" element={<HostDistribution />} />
                                                    <Route path="monitoring" element={<HostMonitoring />} />
                                                    <Route path="screening" element={<HostScreening />} />
                                                    <Route path="setup" element={<HostSetup />} />
                                                    <Route path="promo-codes" element={<HostPromoCodes />} />
                                                    <Route path="finance" element={<HostFinanceTab />} />
                                                </Routes>
                                            </HostProtectedRoute>
                                        }
                                    />
                                    <Route path="/stripe/callback" element={<StripeCallback />} />

                                    {/* Career, Policies, and Terms */}
                                    <Route path="/career" element={<Careers />} />
                                    <Route path ="/job/:id" element={<JobDetails />} />
                                    <Route path="/policy" element={<Policy />} />
                                    <Route path="/terms" element={<Terms />} />
                                    <Route path="/disclaimers" element={<Disclaimers />} />

                                    {/* Error*/}
                                    <Route path="/*" element={<PageNotFound />} />

                                    {/* Host Onboarding v3 */}
                                    <Route path="/hostonboarding" element={<AccommodationTypeView />} />
                                    <Route path="/hostonboarding/accommodation" element={<GuestAccessView />} />
                                    <Route path="/hostonboarding/boat" element={<BoatTypeView />} />
                                    <Route path="/hostonboarding/camper" element={<CamperTypeView />} />
                                    <Route path="/hostonboarding/:type/address" element={<AddressInputView />} />
                                    <Route path="/hostonboarding/:type/capacity" element={<CapacityView />} />
                                    <Route path="/hostonboarding/:type/amenities" element={<AmenitiesView />} />
                                    <Route path='/hostonboarding/:type/rules' element={<HouseRulesView/>} />
                                    <Route path='/hostonboarding/:type/photos' element={<PhotosView/>} />
                                    <Route path='/hostonboarding/:type/title' element={<AccommodationTitleView/>} />
                                    <Route path='/hostonboarding/:type/description' element={<DescriptionView/>} />
                                    <Route path='/hostonboarding/:type/pricing' element={<PricingView/>} />
                                    <Route path='/hostonboarding/:type/availability' element={<AvailabilityView/>} />
                                    <Route path='/hostonboarding/legal/registrationnumber' element={<RegistrationNumberView/>} />
                                    <Route path='/hostonboarding/summary' element={<SummaryView/>} />




                                </Routes>
                                {renderFooter()}
                                {currentPath !== '/admin' && <MenuBar />}
                                {renderChatWidget()}
                                <Hostchatbot />


                            </div>
                        </UserProvider>
                    </AuthProvider>
                </Router>
            </FlowContext.Provider>
        </ApolloProvider>
    );
}
export default App;
