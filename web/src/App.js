import './App.css';
import HostProtectedRoute from './features/auth/hostauth/HostProtectedRoute';
import { UserProvider } from './features/auth/UserContext';
import Header from "./components/base/Header";
import Footer from "./components/base/Footer";
import Landing from "./pages/landingpage/Landing";
import Travelinnovation from "./pages/travelinnovationlab/travelinnovation";
import Home from "./pages/home/Accommodations";
import Homepage from "./pages/home/homePage.js";
import About from "./pages/about/About";
import Whydomits from "./pages/whydomits/Whydomitstwo.js";
import Release from "./pages/productupdates/release.js";
import ReleaseTwo from "./pages/productupdates/releaseTwo.js";
import Datasafety from "./pages/datasafety/datasafety.js";
import Helpdesk from "./pages/helpdesk/Helpdesk.js";
import Howitworks from "./pages/howitworks/Howitworks.js";
import Careers from "./pages/careers/Careers";
import JobDetails from "./pages/careers/jobDetails.js";
import Contact from "./pages/contact/Contact";
import HostOnboarding from "./pages/landingpage/OnboardingHost";
import HostDashboard from "./features/hostdashboard/HostDashboard";

import HostProperty from "./features/hostdashboard/HostProperty";
// import HostMessages from "./features/hostdashboard/HostMessages";
import HostMessages from "./features/hostdashboard/hostmessages/pages/hostMessages";
import HostPayments from "./features/hostdashboard/HostPayments";
import HostListings from "./features/hostdashboard/HostListings";
import HostCalendar from "./features/hostdashboard/HostCalendar";
import HostSettings from "./features/hostdashboard/HostSettings";
import HostReviews from "./features/hostdashboard/HostReviews";
import ListingDetails from './features/bookingengine/ListingDetails';
import BookingOverview from './features/bookingengine/BookingOverview';
import BookingConfirmation from "./features/bookingengine/PaymentConfirm";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import Disclaimers from "./pages/disclaimers/Disclaimers";
import Policy from "./pages/policy/Policy";
import Terms from "./pages/terms/Terms";
import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import ConfirmRegister from "./features/auth/confirmEmail/ConfirmEmailView.js";
import { AuthProvider } from './features/auth/AuthContext';
import GuestDashboard from './features/guestdashboard/GuestDashboard';
import GuestBooking from './features/guestdashboard/GuestBooking';
import GuestPayments from "./features/guestdashboard/GuestPayments";
import GuestReviews from "./features/guestdashboard/GuestReviews";
import GuestSettings from "./features/guestdashboard/GuestSettings";
import GuestWishlistPage from "./features/guestdashboard/pages/GuestWishlistPage";

import Chat from "./features/guestdashboard/chat/Chat.js";
import Chatbot from "./features/guestaiagent/chatbot";
import ChatWidget from "./features/chatwidget/ChatWidget";
import EmployeeChat from './features/guestaiagent/EmployeeChat';
import FlowContext from './services/FlowContext';
import Hostchat from '../src/features/hostaiagent/hostchatbot';
import ScrollToTop from "./utils/ScrollToTop/ScrollToTop.tsx";
import HostReservations from "./features/hostdashboard/HostReservations";
import HostRevenues from "./features/hostdashboard/HostRevenues";
import HostHousekeeping from "./features/hostdashboard/Housekeeping.js";
import HostIoTHub from "./features/hostdashboard/HostIoTHub";
import HostPricing from "./features/hostdashboard/HostPricing";
import HostDistribution from "./features/hostdashboard/hostdistribution/pages/HostDistribution";
import HostMonitoring from "./features/hostdashboard/HostMonitoring";
import HostScreening from "./features/hostdashboard/HostScreening";
import HostSetup from "./features/hostdashboard/HostSetup";
import HostPromoCodes from "./features/hostdashboard/HostPromoCodes";
import HostVerificationView from "./features/verification/hostverification/HostVerification.js";
import PhoneNumberView from './features/verification/hostverification/HostVerifyPhoneNumber.js';
import PhoneNumberConfirmView from './features/verification/hostverification/HostVerifyPhoneNumberConfirm.js';
import { initializeUserAttributes } from './utils/userAttributes';
import PageNotFound from "./utils/error/404NotFound";
import StripeCallback from "./features/stripe/StripeCallback";
import ReviewPage from "./features/review/ReviewPage";
import MenuBar from "./components/base/MenuBar";
import HostFinanceTab from "./features/hostdashboard/HostFinanceTab";
import PaymentConfirmPage from "./features/bookingengine/PaymentConfirmPage";


import AccommodationTypeView from './features/hostonboarding/views/PropertyTypeView.js';
import GuestAccessView from './features/hostonboarding/views/HouseTypeView.js';
import BoatTypeView from './features/hostonboarding/views/BoatTypeView.js';
import CamperTypeView from './features/hostonboarding/views/CamperTypeView.js';
import AddressInputView from './features/hostonboarding/views/PropertyLocationView.js';
import CapacityView from './features/hostonboarding/views/PropertyGuestAmountView.js';
import AmenitiesView from './features/hostonboarding/views/PropertyAmenitiesView.js';
import HouseRulesView from './features/hostonboarding/views/PropertyHouseRulesView.js';
import PhotosView from './features/hostonboarding/views/PropertyPhotosView.js';
import AccommodationTitleView from './features/hostonboarding/views/PropertyNameView.js';
import DescriptionView from './features/hostonboarding/views/PropertyDescriptionView.js';
import PricingView from './features/hostonboarding/views/PropertyRateView.js';
import AvailabilityView from './features/hostonboarding/views/PropertyCalendarAvailabilityView.js';
import RegistrationNumberView from './features/verification/hostverification/HostVerifyRegistrationNumber.js'; 
import SummaryView from './features/hostonboarding/views/PropertyCheckOutAndCompletionView.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import StepGuard from './features/hostonboarding/hooks/StepGuard.js';


import { Auth } from 'aws-amplify';
import GuestProtectedRoute from "./features/auth/guestauth/GuestProtectedRoute";
import Hostchatbot from "./features/hostaiagent/hostchatbot";
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import ReleaseUpdates from './pages/productupdates/ReleaseUpdates.js'
import Callback from "./Callback"; 

Modal.setAppElement("#root");

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
        <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
            />
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
                                    <Route path="/paymentconfirmpage" element={<PaymentConfirmPage />} />

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
                          <Route path="wishlist" element={<GuestWishlistPage />} />
                          <Route path="chat" element={<Chat />} />
                        </Routes>
                      </GuestProtectedRoute>
                    }
                  />

                  {/* Host Management */}
                  {/* <Route path="/enlist" element={<HostOnboarding />} /> */}

                  {/* Verification */}
                  <Route path="/verify" element={<HostVerificationView />} />
                  <Route
                    path="/verify/phonenumber"
                    element={<PhoneNumberView />}
                  />
                  <Route
                    path="/verify/phonenumber/confirm"
                    element={<PhoneNumberConfirmView />}
                  />

                  <Route
                    path="/hostdashboard"
                    element={
                      <HostProtectedRoute>
                        <HostDashboard />
                      </HostProtectedRoute>
                    }
                  />
                  <Route
                    path="/hostdashboard/*"
                    element={
                      <HostProtectedRoute>
                        <Routes>
                        <Route path="property" element={<HostProperty />} />
                          <Route path="listings" element={<HostListings />} />
                          <Route path="calendar" element={<HostCalendar />} />
                          <Route path="messages" element={<HostMessages />} />
                          <Route path="reporting" element={<HostPayments />} />
                          <Route path="settings" element={<HostSettings />} />
                          <Route path="reviews" element={<HostReviews />} />
                          <Route path="chat" element={<HostMessages />} />
                          <Route
                            path="reservations"
                            element={<HostReservations />}
                          />
                          <Route path="revenues" element={<HostRevenues />} />{" "}
                          {/* HostRevenues */}
                          <Route
                            path="housekeeping"
                            element={<HostHousekeeping />}
                          />
                          <Route path="iot-hub" element={<HostIoTHub />} />
                          <Route path="pricing" element={<HostPricing />} />
                          <Route
                            path="distribution"
                            element={<HostDistribution />}
                          />
                          <Route
                            path="monitoring"
                            element={<HostMonitoring />}
                          />
                          <Route path="screening" element={<HostScreening />} />
                          <Route path="setup" element={<HostSetup />} />
                          <Route
                            path="promo-codes"
                            element={<HostPromoCodes />}
                          />
                          <Route path="finance" element={<HostFinanceTab />} />
                        </Routes>
                      </HostProtectedRoute>
                    }
                  />
                  <Route path="/stripe/callback" element={<StripeCallback />} />

                  {/* Career, Policies, and Terms */}
                  <Route path="/career" element={<Careers />} />
                  <Route path="/job/:id" element={<JobDetails />} />
                  <Route path="/policy" element={<Policy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/disclaimers" element={<Disclaimers />} />

                  {/* Error*/}
                  <Route path="/*" element={<PageNotFound />} />

                  {/* Host Onboarding v3 */}
                  <Route
                    path="/hostonboarding"
                    element={<AccommodationTypeView />}
                  />
                  <Route
                    path="/hostonboarding/accommodation"
                    element={
                      <StepGuard step="type">
                        <GuestAccessView />
                      </StepGuard>
                    }
                  />
                  <Route
                    path="/hostonboarding/boat"
                    element={
                      <StepGuard step="type">
                        <BoatTypeView />
                      </StepGuard>
                    }
                  />
                  <Route
                    path="/hostonboarding/camper"
                    element={
                      <StepGuard step="type">
                        <CamperTypeView />
                      </StepGuard>
                    }
                  />
                  <Route
                    path="/hostonboarding/:type/address"
                    element={<AddressInputView />}
                  />
                  <Route
                    path="/hostonboarding/:type/capacity"
                    element={<CapacityView />}
                  />
                  <Route
                    path="/hostonboarding/:type/amenities"
                    element={<AmenitiesView />}
                  />
                  <Route
                    path="/hostonboarding/:type/rules"
                    element={<HouseRulesView />}
                  />
                  <Route
                    path="/hostonboarding/:type/photos"
                    element={<PhotosView />}
                  />
                  <Route
                    path="/hostonboarding/:type/title"
                    element={<AccommodationTitleView />}
                  />
                  <Route
                    path="/hostonboarding/:type/description"
                    element={<DescriptionView />}
                  />
                  <Route
                    path="/hostonboarding/:type/pricing"
                    element={<PricingView />}
                  />
                  <Route
                    path="/hostonboarding/:type/availability"
                    element={<AvailabilityView />}
                  />
                  <Route
                    path="/hostonboarding/legal/registrationnumber"
                    element={<RegistrationNumberView />}
                  />
                  <Route
                    path="/hostonboarding/summary"
                    element={<SummaryView />}
                  />
                </Routes>

                <Routes>
                   {/* Andere routes */}
                      <Route path="/callback" element={<Callback />} />
                </Routes>

                {renderFooter()}
                {currentPath !== "/admin" && <MenuBar />}
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
