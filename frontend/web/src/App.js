import "./styles/sass/app.scss";
import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache } from "@apollo/client";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/toast-notifications.scss";
import Footer from "./components/base/Footer";
import Header from "./components/base/Header";
import { AuthProvider } from "./features/auth/AuthContext";
import GuestProtectedRoute from "./features/auth/guestauth/GuestProtectedRoute";
import HostProtectedRoute from "./features/auth/hostauth/HostProtectedRoute";
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
import ReviewPage from "./features/review/ReviewPage";
import StripeCallback from "./features/stripe/StripeCallback";
import Sustainability from "./features/sustainability/Sustainability";
import HostVerificationView from "./features/verification/hostverification/HostVerification.js";
import PhoneNumberView from "./features/verification/hostverification/HostVerifyPhoneNumber.js";
import PhoneNumberConfirmView from "./features/verification/hostverification/HostVerifyPhoneNumberConfirm.js";
import About from "./pages/about/About";
import Team from "./pages/about/Team";
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
import Navbar from "./components/base/navbar";
import publicKeys from "./utils/const/publicKeys.json";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import ChannelManager from "./pages/channelmanager/Channelmanager.js";
import AdminProperty from "./pages/adminproperty/AdminProperty.js";
import WebsitePublicPreviewPage from "./features/hostdashboard/website/WebsitePublicPreviewPage.jsx";
import WebsitePublicSitePage from "./features/hostdashboard/website/WebsitePublicSitePage.jsx";
import AcceptInvite from "./features/hostdashboard/AcceptInvite";

const stripePromise = loadStripe(publicKeys.STRIPE_PUBLIC_KEYS.LIVE);
const DEFAULT_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX = "direct.domits.com";
const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: "https://73nglmrsoff5xd5i7itszpmd44.appsync-api.eu-north-1.amazonaws.com/graphql",
    headers: {
      "x-api-key": "da2-r65bw6jphfbunkqyyok5kn36cm",
    },
  }),
  cache: new InMemoryCache(),
});
Modal.setAppElement("#root");

function RedirectHostOnboardingCatchAll() {
  const location = useLocation();
  const newPath = location.pathname.replace(/^\/hostonboarding/, "/hostdashboard/hostonboarding");
  return <Navigate to={`${newPath}${location.search}${location.hash}`} replace />;
}

const normalizeDirectBookingWebsiteHostName = (value) => {
  const normalizedValue = String(value || "").trim().toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.split(":")[0] || "";
};

const getDirectBookingWebsiteFallbackDomainSuffix = () =>
  normalizeDirectBookingWebsiteHostName(
    process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX ||
      DEFAULT_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX
  );

const isDirectBookingWebsiteHostName = (hostName) => {
  const normalizedHostName = normalizeDirectBookingWebsiteHostName(hostName);
  const fallbackDomainSuffix = getDirectBookingWebsiteFallbackDomainSuffix();

  if (!normalizedHostName || !fallbackDomainSuffix) {
    return false;
  }

  return (
    normalizedHostName === fallbackDomainSuffix ||
    normalizedHostName.endsWith(`.${fallbackDomainSuffix}`)
  );
};

function App() {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentLocation = globalThis.location || { pathname: "", hostname: "" };

  useEffect(() => {
    document.title = "Domits";
  }, [searchResults]);

  useEffect(() => {
    initializeUserAttributes();
  }, []);

  const currentPath = currentLocation.pathname;
  const currentHostName = currentLocation.hostname;
  const isWebsitePreviewPath = currentPath.startsWith("/website-preview");
  const isWebsiteLivePath = currentPath.startsWith("/website-live");
  const isDirectBookingWebsiteHost = isDirectBookingWebsiteHostName(currentHostName);
  const isDirectBookingWebsiteSurface = isWebsitePreviewPath || isWebsiteLivePath || isDirectBookingWebsiteHost;
  const shouldRenderStandardHeader = currentPath !== "/admin" && isDirectBookingWebsiteSurface === false;
  const shouldRenderNavbar = isDirectBookingWebsiteSurface === false;

  useLayoutEffect(() => {
    const documentElement = globalThis.document?.documentElement;
    const body = globalThis.document?.body;
    if (!documentElement || !body) {
      return undefined;
    }

    const previousHtmlMarginTop = documentElement.style.marginTop;
    const previousHtmlPaddingTop = documentElement.style.paddingTop;
    const previousBodyMargin = body.style.margin;
    const previousBodyPaddingTop = body.style.paddingTop;

    documentElement.classList.toggle("directBookingWebsiteSurfaceHtml", isDirectBookingWebsiteSurface);
    body.classList.toggle("directBookingWebsiteSurfaceBody", isDirectBookingWebsiteSurface);

    if (isDirectBookingWebsiteSurface) {
      documentElement.style.marginTop = "0";
      documentElement.style.paddingTop = "0";
      body.style.margin = "0";
      body.style.paddingTop = "0";
    } else {
      documentElement.style.marginTop = previousHtmlMarginTop;
      documentElement.style.paddingTop = previousHtmlPaddingTop;
      body.style.margin = previousBodyMargin;
      body.style.paddingTop = previousBodyPaddingTop;
    }

    return () => {
      documentElement.classList.remove("directBookingWebsiteSurfaceHtml");
      body.classList.remove("directBookingWebsiteSurfaceBody");
      documentElement.style.marginTop = previousHtmlMarginTop;
      documentElement.style.paddingTop = previousHtmlPaddingTop;
      body.style.margin = previousBodyMargin;
      body.style.paddingTop = previousBodyPaddingTop;
    };
  }, [isDirectBookingWebsiteSurface]);

  const renderFooter = () => {
    if (
      ["/admin", "/bookingoverview", "/bookingpayment", "/validatepayment"].includes(currentPath) ||
      currentPath.startsWith("/verify") ||
      isDirectBookingWebsiteSurface
    ) {
      return null;
    }
    return <Footer />;
  };

  const renderChatWidget = () => {
    if (currentPath.startsWith("/verify") || isDirectBookingWebsiteSurface) {
      return null;
    }
    return <ChatWidget />;
  };

  const [flowState, setFlowState] = useState({ isHost: false });
  const flowContextValue = useMemo(() => ({ flowState, setFlowState }), [flowState]);

  return (
    <ApolloProvider client={apolloClient}>
      {" "}
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
      <FlowContext.Provider value={flowContextValue}>
        <Router>
          <ScrollToTop />
          <AuthProvider>
            <UserProvider>
              <div className="App" aria-busy={loading}>
                {shouldRenderStandardHeader ? (
                  <Header setSearchResults={setSearchResults} setLoading={setLoading} />
                ) : null}
                <Routes>
                  <Route path="/home" element={<Home searchResults={searchResults} searchInProgress={loading} />} />
                  <Route path="/" element={isDirectBookingWebsiteHost ? <WebsitePublicSitePage /> : <Homepage />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/team" element={<Team />} />
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
                  <Route path="/website-preview/:draftId" element={<WebsitePublicPreviewPage />} />
                  <Route path="/website-live/:domain" element={<WebsitePublicSitePage />} />
                  <Route path="/website-live" element={<WebsitePublicSitePage />} />

                  {/* Chat */}
                  {/*<Route path="/chat" element={<Chat/>}/>*/}
                  <Route path="/employeechat" element={<EmployeeChat />} />

                  {/* Review */}
                  <Route path="/review" element={<ReviewPage />} />

                  {/* Guest Dashboard */}
                  <Route
                    path="/guestdashboard/messages"
                    element={
                      <GuestProtectedRoute>
                        <MainDashboardGuest />
                      </GuestProtectedRoute>
                    }
                  />
                  <Route
                    path="/guestdashboard/*"
                    element={
                      <GuestProtectedRoute>
                        <MainDashboardGuest />
                      </GuestProtectedRoute>
                    }
                  />
                  <Route
                    path="/guestdashboard/messages"
                    element={
                      <GuestProtectedRoute>
                        <MainDashboardGuest />
                      </GuestProtectedRoute>
                    }
                  />

                  {/* Host Management */}
                  {/* <Route path="/enlist" element={<HostOnboarding />} /> */}

                  {/* Verification */}
                  <Route path="/verify" element={<HostVerificationView />} />
                  <Route path="/verify/phonenumber" element={<PhoneNumberView />} />
                  <Route path="/verify/phonenumber/confirm" element={<PhoneNumberConfirmView />} />

                  {/* Payment Logic */}
                  <Route
                    path="/validatepayment"
                    element={
                      <Elements stripe={stripePromise}>
                        <ValidatePayment />
                      </Elements>
                    }
                  />

                  <Route
                    path="/hostdashboard/*"
                    element={
                      <HostProtectedRoute>
                        <MainDashboardHost />
                      </HostProtectedRoute>
                    }
                  />

                  <Route path="/team/accept" element={<AcceptInvite />} />
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
                  <Route path="/*" element={isDirectBookingWebsiteHost ? <WebsitePublicSitePage /> : <PageNotFound />} />
                </Routes>
                {renderFooter()}
                {renderChatWidget()}
              </div>
            </UserProvider>
          </AuthProvider>
          {shouldRenderNavbar ? <Navbar /> : null}
        </Router>
      </FlowContext.Provider>
    </ApolloProvider>
  );
}

export default App;
