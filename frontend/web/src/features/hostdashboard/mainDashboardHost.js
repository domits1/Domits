import { Routes, Route, Navigate } from "react-router-dom";

import Pages from "./Pages2";
import HostDashboard from "./HostDashboard";
import HostCalendar from "./hostcalen/HostCalendar";
import HostReservations from "./HostReservations";
import Messages from "../../components/messages/Messages";
import HostReports from "./HostPayments";
import HostPropertyCare from "./Housekeeping";
import HostFinanceTab from "./HostFinanceTab";
import HostPricing from "./hostpricing/views/HostPricing";
import HostListings from "./HostListings";
import HostSettings from "./HostSettings";

import { BuilderProvider } from "../../context/propertyBuilderContext";
import OnboardingLayout from "../hostonboarding/OnboardingLayout";
import StepGuard from "../hostonboarding/hooks/StepGuard";
import AccommodationTypeView from "../hostonboarding/views/1_AccommodationTypeView";
import HouseTypeView from "../hostonboarding/views/2_HouseTypeView";
import BoatTypeView from "../hostonboarding/views/1b_BoatTypeView";
import CamperTypeView from "../hostonboarding/views/1c_CamperTypeView";
import AddressInputView from "../hostonboarding/views/3_AddressInputView";
import CapacityView from "../hostonboarding/views/4_PropertyCapacityView";
import AmenitiesView from "../hostonboarding/views/5_AmenitiesView";
import PropertyHouseRulesView from "../hostonboarding/views/6_PropertyHouseRulesView";
import PhotosView from "../hostonboarding/views/7_PropertyPhotosView";
import PropertyTitleView from "../hostonboarding/views/8_PropertyTitleView";
import PropertyDescriptionView from "../hostonboarding/views/9_PropertyDescriptionView";
import PropertyRateView from "../hostonboarding/views/10_PropertyRateView";
import PropertyAvailabilityView from "../hostonboarding/views/11_PropertyAvailabilityView";
import SummaryViewAndSubmit from "../hostonboarding/views/12_SummarySubmitView";
import RegistrationNumberView from "../../features/verification/hostverification/HostVerifyRegistrationNumber";

function MainDashboardHost() {
  return (
    <div className="main-dashboard-guest">
      <div className="main-dashboard-sidebar">
        <Pages />
      </div>

      <div className="main-dashboard-content">
        <Routes>
          <Route index element={<HostDashboard />} />

          <Route
            path="hostonboarding/*"
            element={
              <BuilderProvider>
                <OnboardingLayout />
              </BuilderProvider>
            }>
            <Route index element={<AccommodationTypeView />} />

            <Route
              path="accommodation"
              element={
                <StepGuard step="type">
                  <HouseTypeView />
                </StepGuard>
              }
            />
            <Route
              path="boat"
              element={
                <StepGuard step="type">
                  <BoatTypeView />
                </StepGuard>
              }
            />
            <Route
              path="camper"
              element={
                <StepGuard step="type">
                  <CamperTypeView />
                </StepGuard>
              }
            />

            <Route path=":type/address" element={<AddressInputView />} />
            <Route path=":type/capacity" element={<CapacityView />} />
            <Route path=":type/amenities" element={<AmenitiesView />} />
            <Route path=":type/rules" element={<PropertyHouseRulesView />} />
            <Route path=":type/photos" element={<PhotosView />} />
            <Route path=":type/title" element={<PropertyTitleView />} />
            <Route path=":type/description" element={<PropertyDescriptionView />} />
            <Route path=":type/pricing" element={<PropertyRateView />} />
            <Route path=":type/availability" element={<PropertyAvailabilityView />} />

            <Route path="legal/registrationnumber" element={<RegistrationNumberView />} />
            <Route path="summary" element={<SummaryViewAndSubmit />} />

            <Route path="*" element={<Navigate to="." replace />} />
          </Route>

          <Route path="calendar" element={<HostCalendar />} />
          <Route path="reservations" element={<HostReservations />} />
          <Route path="messages" element={<Messages dashboardType="host" />} />
          <Route path="revenues" element={<HostReports />} />
          <Route path="housekeeping" element={<HostPropertyCare />} />
          <Route path="finance" element={<HostFinanceTab />} />
          <Route path="pricing" element={<HostPricing />} />
          <Route path="listings" element={<HostListings />} />
          <Route path="settings" element={<HostSettings />} />

          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default MainDashboardHost;