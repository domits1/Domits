import "./styles/sass/app.scss";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Footer from "./components/base/Footer";
import Header from "./components/base/Header";
import MenuBar from "./components/base/MenuBar";
import { AuthProvider } from "./features/auth/AuthContext";
import GuestProtectedRoute from "./features/auth/guestauth/GuestProtectedRoute";
import HostProtectedRoute from "./features/auth/hostauth/HostProtectedRoute";
import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import { UserProvider } from "./features/auth/UserContext";
import ListingDetails from "./features/bookingengine/ListingDetails";
import ListingDetails2 from "./features/bookingengine/listingdetails/pages/listingDetails2";
import BookingOverview from "./features/bookingengine/BookingOverview";
import BookingSend from "./features/bookingengine/BookingSend";
import BookingConfirmationOverview from "./features/bookingengine/BookingConfirmOverview";
import ChatWidget from "./features/chatwidget/ChatWidget";
import Chatbot from "./features/guestaiagent/chatbot";
import EmployeeChat from "./features/guestaiagent/EmployeeChat";
import GuestBooking from "./features/guestdashboard/GuestBooking";
import GuestDashboard from "./features/guestdashboard/GuestDashboard";
import GuestPayments from "./features/guestdashboard/GuestPayments";
import GuestReviews from "./features/guestdashboard/GuestReviews";
import GuestSettings from "./features/guestdashboard/GuestSettings";
import Hostchatbot from "./features/hostaiagent/hostchatbot";
import HostCalendar from "./features/hostdashboard/HostCalendar";
import HostDashboard from "./features/hostdashboard/HostDashboard";
import HostFinanceTab from "./features/hostdashboard/HostFinanceTab";
import HostIoTHub from "./features/hostdashboard/HostIoTHub";
import HostListings from "./features/hostdashboard/HostListings";
import HostMessages from "./features/hostdashboard/hostmessages/pages/hostMessages";
import HostPayments from "./features/hostdashboard/HostPayments";
import HostPromoCodes from "./features/hostdashboard/HostPromoCodes";

import HostProperty from "./features/hostdashboard/HostProperty";
import HostReservations from "./features/hostdashboard/HostReservations";
import HostRevenues from "./features/hostdashboard/HostRevenues";

import HostPricing from "./features/hostdashboard/hostpricing/views/HostPricing";
import HostDistribution from "./features/hostdashboard/hostdistribution/pages/HostDistribution";
import HostMonitoring from "./features/hostdashboard/HostMonitoring";
import HostScreening from "./features/hostdashboard/HostScreening";
import HostSettings from "./features/hostdashboard/HostSettings";
import HostSetup from "./features/hostdashboard/HostSetup";
import HostHousekeeping from "./features/hostdashboard/Housekeeping.js";

import StepGuard from "./features/hostonboarding/hooks/StepGuard.js";
import PropertyRateView from "./features/hostonboarding/views/10_PropertyRateView.js";
import PropertyAvailabilityView from "./features/hostonboarding/views/11_PropertyAvailabilityView.js";
import SummaryViewAndSubmit from "./features/hostonboarding/views/12_SummarySubmitView.js";

import AccommodationTypeView from "./features/hostonboarding/views/1_AccommodationTypeView.js";
import BoatTypeView from "./features/hostonboarding/views/1b_BoatTypeView.js";
import CamperTypeView from "./features/hostonboarding/views/1c_CamperTypeView.js";
import HouseTypeView from "./features/hostonboarding/views/2_HouseTypeView.js";
import AddressInputView from "./features/hostonboarding/views/3_AddressInputView.js";
import PropertyGuestAmountView from "./features/hostonboarding/views/4_PropertyCapacityView";
import CapacityView from "./features/hostonboarding/views/4_PropertyCapacityView.js";
import PropertyHouseRulesView from "./features/hostonboarding/views/6_PropertyHouseRulesView.js";
import PhotosView from "./features/hostonboarding/views/7_PropertyPhotosView.js";
import PropertyTitleView from "./features/hostonboarding/views/8_PropertyTitleView.js";
import PropertyDescriptionView from "./features/hostonboarding/views/9_PropertyDescriptionView.js";
import ReviewPage from "./features/review/ReviewPage";
import StripeCallback from "./features/stripe/StripeCallback";

import Sustainability from "./features/sustainability/Sustainability";
import HostVerificationView from "./features/verification/hostverification/HostVerification.js";
import PhoneNumberView from "./features/verification/hostverification/HostVerifyPhoneNumber.js";
import PhoneNumberConfirmView from "./features/verification/hostverification/HostVerifyPhoneNumberConfirm.js";
import RegistrationNumberView from "./features/verification/hostverification/HostVerifyRegistrationNumber.js";
import About from "./pages/about/About";
import Careers from "./pages/careers/Careers";
import JobDetails from "./pages/careers/jobDetails.js";
import Contact from "./pages/contact/Contact";
import Datasafety from "./pages/datasafety/datasafety.js";
import Disclaimers from "./pages/disclaimers/Disclaimers";
import Helpdesk from "./pages/helpdesk/Helpdesk.js";
import Home from "./pages/home/Accommodations";
import Homepage from "./pages/home/homePage.js";
import Howitworks from "./pages/howitworks/Howitworks.js";
import Landing from "./pages/landingpage/Landing";
import Policy from "./pages/policy/Policy";
import ReleaseTwo from "./pages/productupdates/releaseTwo.js";
import ReleaseUpdates from "./pages/productupdates/ReleaseUpdates.js";
import Terms from "./pages/terms/Terms";
import Travelinnovation from "./pages/travelinnovationlab/travelinnovation";
import Whydomits from "./pages/whydomits/Whydomitstwo.js";
import FlowContext from "./services/FlowContext";
import PageNotFound from "./utils/error/404NotFound";
import ScrollToTop from "./utils/ScrollToTop/ScrollToTop.tsx";
import { initializeUserAttributes } from "./utils/userAttributes";
import { BuilderProvider } from "./context/propertyBuilderContext";
import AmenitiesView from "./features/hostonboarding/views/5_AmenitiesView";
import Navbar from './components/base/navbar';

Modal.setAppElement("#root");

function App() {
  const [searchResults, setSearchResults] = useState([]);
  const [setLoading] = useState(false);

  // Apollo Client
  const client = new ApolloClient({
    uri: "https://73nglmrsoff5xd5i7itszpmd44.appsync-api.eu-north-1.amazonaws.com/graphql", //
    cache: new InMemoryCache(), headers: {
      "x-api-key": "da2-r65bw6jphfbunkqyyok5kn36cm", // Replace with your AppSync API key
    },
  });

  useEffect(() => {
    document.title = "Domits";
  }, [searchResults]);

  useEffect(() => {
    initializeUserAttributes();
  }, []);

  const currentPath = window.location.pathname;

  const renderFooter = () => {
    if (["/admin", "/bookingoverview", "/bookingpayment"].includes(currentPath) || currentPath.startsWith("/verify")) {
      return null;
    }
    return <Footer />;
  };

  const renderChatWidget = () => {
    if (currentPath.startsWith("/verify")) {
      return null;
    }
    return <ChatWidget />;
  };

  const [flowState, setFlowState] = useState({ isHost: false });

  return (<ApolloProvider client={client}>
    {" "}
    {/* ApolloProvider */}
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
              {currentPath !== "/admin" && <Header setSearchResults={setSearchResults} setLoading={setLoading} />}
              <Routes>
                <Route path="/home" element={<Home searchResults={searchResults} />} />
                <Route path="/" element={<Homepage />} />
                <Route path="/about" element={<About />} />
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
                <Route path="/listingdetails" element={<ListingDetails2 />} />
                <Route path="/bookingoverview" element={<BookingOverview />} />
                <Route path="/bookingsend" element={<BookingSend />} />
                <Route path="/bookingconfirmationoverview" element={<BookingConfirmationOverview />} />
                <Route path="/hostonboarding/:type/capacity" element={<PropertyGuestAmountView />} />

                {/* Chat */}
                {/*<Route path="/chat" element={<Chat/>}/>*/}
                <Route path="/employeechat" element={<EmployeeChat />} />
                <Route path="/chatbot" element={<Chatbot />} />

                {/* Host Chatbot */}
                <Route path="/hostchatbot" element={<Hostchatbot />} />

                {/* Review */}
                <Route path="/review" element={<ReviewPage />} />

                {/* Guest Dashboard */}
                <Route
                  path="/guestdashboard/*"
                  element={<GuestProtectedRoute>
                    <Routes>
                      <Route path="/" element={<GuestDashboard />} />
                      <Route path="messages" element={<ListingDetails />} />
                      <Route path="payments" element={<GuestPayments />} />
                      <Route path="reviews" element={<GuestReviews />} />
                      <Route path="bookings" element={<GuestBooking />} />
                      <Route path="settings" element={<GuestSettings />} />
                      {/*<Route path="chat" element={<Chat/>}/>*/}
                    </Routes>
                  </GuestProtectedRoute>}
                />

                {/* Host Management */}
                {/* <Route path="/enlist" element={<HostOnboarding />} /> */}

                {/* Verification */}
                <Route path="/verify" element={<HostVerificationView />} />
                <Route path="/verify/phonenumber" element={<PhoneNumberView />} />
                <Route path="/verify/phonenumber/confirm" element={<PhoneNumberConfirmView />} />

                <Route
                  path="/hostdashboard"
                  element={<HostProtectedRoute>
                    <HostDashboard />
                  </HostProtectedRoute>}
                />
                <Route
                  path="/hostdashboard/*"
                  element={<HostProtectedRoute>
                    <Routes>
                      <Route path="property" element={<HostProperty />} />
                      <Route path="listings" element={<HostListings />} />
                      <Route path="calendar" element={<HostCalendar />} />
                      <Route path="messages" element={<HostMessages />} />
                      <Route path="reporting" element={<HostPayments />} />
                      <Route path="settings" element={<HostSettings />} />
                      {/* <Route path="reviews" element={<HostReviews />} /> */}
                      <Route path="chat" element={<HostMessages />} />
                      <Route path="reservations" element={<HostReservations />} />
                      <Route path="revenues" element={<HostRevenues />} /> {/* HostRevenues */}
                      <Route path="housekeeping" element={<HostHousekeeping />} />
                      <Route path="iot-hub" element={<HostIoTHub />} />
                      <Route path="pricing" element={<HostPricing />} />
                      <Route path="distribution" element={<HostDistribution />} />
                      <Route path="monitoring" element={<HostMonitoring />} />
                      <Route path="screening" element={<HostScreening />} />
                      <Route path="setup" element={<HostSetup />} />
                      <Route path="promo-codes" element={<HostPromoCodes />} />
                      <Route path="finance" element={<HostFinanceTab />} />
                    </Routes>
                  </HostProtectedRoute>}
                />
                <Route path="/stripe/callback" element={<StripeCallback />} />

                {/* Career, Policies, and Terms */}
                <Route path="/career" element={<Careers />} />
                <Route path="/job/:id" element={<JobDetails />} />
                <Route path="/policy" element={<Policy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/disclaimers" element={<Disclaimers />} />
                <Route path="/Sustainability" element={<Sustainability />} />

                {/* Error*/}
                <Route path="/*" element={<PageNotFound />} />

                {/* Host Onboarding v3 */}
                <Route
                  path="/hostonboarding/*"
                  element={
                    <BuilderProvider>
                      <Routes>
                        <Route path="" element={<AccommodationTypeView />} />
                        <Route path="accommodation" element={<StepGuard step="type"><HouseTypeView /></StepGuard>} />
                        <Route path="boat" element={<StepGuard step="type"><BoatTypeView /></StepGuard>} />
                        <Route path="camper" element={<StepGuard step="type"><CamperTypeView /></StepGuard>} />
                        <Route path=":type/address" element={<AddressInputView />} />
                        <Route path=":type/capacity" element={<CapacityView />} />
                        <Route path=":type/capacity" element={<PropertyGuestAmountView />} />
                        <Route path=":type/amenities" element={<AmenitiesView />} />
                        <Route path=":type/rules" element={<PropertyHouseRulesView />} />
                        <Route path=":type/photos" element={<PhotosView />} />
                        <Route path=":type/title" element={<PropertyTitleView />} />
                        <Route path=":type/description" element={<PropertyDescriptionView />} />
                        <Route path=":type/pricing" element={<PropertyRateView />} />
                        <Route path=":type/availability" element={<PropertyAvailabilityView />} />
                        <Route path="legal/registrationnumber" element={<RegistrationNumberView />} />
                        <Route path="summary" element={<SummaryViewAndSubmit />} />
                      </Routes>
                    </BuilderProvider>
                  }
                />
                <Route path="/*" element={<Home />} />
              </Routes>
              {renderFooter()}
              {currentPath !== "/admin" && <MenuBar />}
              {renderChatWidget()}
              <Hostchatbot />
            </div>
          </UserProvider>
        </AuthProvider>
        <Navbar/>
      </Router>
    </FlowContext.Provider>
  </ApolloProvider>);
}

export default App;
