import "./styles/sass/app.scss";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/toast-notifications.scss";
import Footer from "./components/base/Footer";
import Header from "./components/base/Header";
import MenuBar from "./components/base/MenuBar";
import { AuthProvider } from "./features/auth/AuthContext";
// ❌ REMOVE these two (leave them commented or delete them completely):
// import GuestProtectedRoute from "./features/auth/guestauth/GuestProtectedRoute";
// import HostProtectedRoute from "./features/auth/hostauth/HostProtectedRoute";
import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import ConfirmEmailView from "./features/auth/confirmEmail/ConfirmEmailView.js";
import { UserProvider } from "./features/auth/UserContext";
import ListingDetails2 from "./features/bookingengine/listingdetails/pages/listingDetails2";
import BookingOverview from "./features/bookingengine/BookingOverview";
import BookingSend from "./features/bookingengine/BookingSend";
import ValidatePayment from "./features/bookingengine/ValidatePayment";
import BookingConfirmationOverview from "./features/bookingengine/BookingConfirmOverview";
import ChatWidget from "./features/chatwidget/ChatWidget";
import EmployeeChat from "./features/guestaiagent/EmployeeChat";
import MainDashboardHost from "./features/hostdashboard/mainDashboardHost.js";
import MainDashboardGuest from "./features/guestdashboard/mainDashboardGuest";
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
import ReleaseUpdates from "./pages/productupdates/ReleaseUpdates.js";
import Terms from "./pages/terms/Terms";
import Travelinnovation from "./pages/travelinnovationlab/travelinnovation";
import Whydomits from "./pages/whydomits/Whydomitstwo.js";
import Performance from "./pages/Performance/performance";
import Security from "./pages/security/security";
import FlowContext from "./services/FlowContext";
import PageNotFound from "./utils/error/404NotFound";
import ScrollToTop from "./utils/ScrollToTop/ScrollToTop.tsx";
import { initializeUserAttributes } from "./utils/userAttributes";
import { BuilderProvider } from "./context/propertyBuilderContext";
import AmenitiesView from "./features/hostonboarding/views/5_AmenitiesView";
import OnboardingLayout from "./features/hostonboarding/OnboardingLayout";
import Navbar from "./components/base/navbar";
import publicKeys from "./utils/const/publicKeys.json";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import ChannelManager from "./pages/channelmanager/Channelmanager.js";
import AdminProperty from "./pages/adminproperty/AdminProperty.js";
import RequireAuth from "./routes/RequireAuth"; // ✅ NEW

const stripePromise = loadStripe(publicKeys.STRIPE_PUBLIC_KEYS.LIVE);
Modal.setAppElement("#root");

function RedirectHostOnboardingCatchAll() {
  const location = useLocation();
  const newPath = location.pathname.replace(/^\/hostonboarding/, "/hostdashboard/hostonboarding");
  return <Navigate to={`${newPath}${location.search}${location.hash}`} replace />;
}

function App() {
  const [searchResults, setSearchResults] = useState([]);
  const [setLoading] = useState(false);

  // Apollo Client
  const client = new ApolloClient({
    uri: "https://73nglmrsoff5xd5i7itszpmd44.appsync-api.eu-north-1.amazonaws.com/graphql",
    cache: new InMemoryCache(),
    headers: {
      "x-api-key": "da2-r65bw6jphfbunkqyyok5kn36cm",
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
    if (
      ["/admin", "/bookingoverview", "/bookingpayment", "/validatepayment"].includes(currentPath) ||
      currentPath.startsWith("/verify")
    ) {
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

  return (
    <ApolloProvider client={client}>
      {/* ApolloProvider */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={true}
        closeButton={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
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
                  <Route path="/confirm-email" element={<ConfirmEmailView />} />
                  <Route path="/listingdetails" element={<ListingDetails2 />} />
                  <Route path="/bookingoverview" element={<BookingOverview />} />
                  <Route path="/bookingsend" element={<BookingSend />} />
                  <Route path="/bookingconfirmationoverview" element={<BookingConfirmationOverview />} />
                  <Route path="/performance" element={<Performance />} />
                  <Route path="/security" element={<Security />} />

                  {/* Chat */}
                  <Route path="/employeechat" element={<EmployeeChat />} />

                  {/* Review */}
                  <Route path="/review" element={<ReviewPage />} />

                  {/* Guest Dashboard (protected for Traveler) */}
                  <Route element={<RequireAuth allowedGroups={["Traveler"]} />}>
                    <Route path="/guestdashboard/*" element={<MainDashboardGuest />} />
                  </Route>

                  {/* Verification */}
                  <Route path="/verify" element={<HostVerificationView />} />
                  <Route path="/verify/phonenumber" element={<PhoneNumberView />} />
                  <Route path="/verify/phonenumber/confirm" element={<PhoneNumberConfirmView />} />
                  {/* if you use RegistrationNumberView, add its route here as well */}
                  {/* <Route path="/verify/registration" element={<RegistrationNumberView />} /> */}

                  {/* Payment Logic */}
                  <Route
                    path="/validatepayment"
                    element={
                      <Elements stripe={stripePromise}>
                        <ValidatePayment />
                      </Elements>
                    }
                  />

                  {/* Host Dashboard (protected for Host) */}
                  <Route element={<RequireAuth allowedGroups={["Host"]} />}>
                    <Route path="/hostdashboard/*" element={<MainDashboardHost />} />
                  </Route>

                  <Route path="/stripe/callback" element={<StripeCallback />} />

                  {/* Career, Policies, and Terms */}
                  <Route path="/career" element={<Careers />} />
                  <Route path="/job/:id" element={<JobDetails />} />
                  <Route path="/policy" element={<Policy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/disclaimers" element={<Disclaimers />} />
                  <Route path="/Sustainability" element={<Sustainability />} />
                  <Route path="/channelmanager" element={<ChannelManager />} />
                  <Route path="/admin/property" element={<AdminProperty />} />

                  {/* Legacy deep links: /hostonboarding/* -> /hostdashboard/hostonboarding/* */}
                  <Route path="/hostonboarding/*" element={<RedirectHostOnboardingCatchAll />} />

                  {/* 404 */}
                  <Route path="/*" element={<PageNotFound />} />
                </Routes>
                {renderFooter()}
                {currentPath !== "/admin" && <MenuBar />}
                {renderChatWidget()}
              </div>
            </UserProvider>
          </AuthProvider>
          <Navbar />
        </Router>
      </FlowContext.Provider>
    </ApolloProvider>
  );
}

export default App;
