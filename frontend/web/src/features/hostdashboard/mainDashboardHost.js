import { Routes, Route, Navigate } from "react-router-dom";

import Pages from "./Pages2";
import HostDashboard from "./HostDashboard";
import HostCalendar from "./hostcalen/HostCalendar";
import HostReservations from "./HostReservations";
import Messages from "../../components/messages/Messages";
import HostReports from "./HostPayments";
import HostPropertyCare from "./Housekeeping";
import HostFinanceTab from "./hostfinance/components/HostFinanceTab";
import HostListings from "./HostListings";
import WebsiteBuilderPage from "./website/WebsiteBuilderPage";
import WebsiteEditorPage from "./website/WebsiteEditorPage";
import WebsiteKpiDashboardPage from "./website/kpis/WebsiteKpiDashboardPage";
import HostTeam from "./HostTeam";
import HostSettingsHub from "./hostsettings/pages/HostSettingsHub";
import HostSettingsPersonalData from "./hostsettings/pages/HostSettingsPersonalData";
import HostSettingsCompany from "./hostsettings/pages/HostSettingsCompany";
import HostSettingsRatePlans from "./hostsettings/pages/HostSettingsRatePlans";
import HostSettingsCompliance from "./hostsettings/pages/HostSettingsCompliance";
import HostProperty from "./HostProperty";
import HostIntegrations from "./HostIntegrations";
import WhatsAppConnectCallback from "./WhatsAppConnectCallback";
import ChannexCertificationAdminPage from "./channexadmin/ChannexCertificationAdminPage";
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

          <Route path="calendar-pricing" element={<HostCalendar />} />
          <Route path="calendar" element={<Navigate to="../calendar-pricing" replace />} />

          <Route path="reservations" element={<HostReservations />} />
          <Route path="messages" element={<Messages dashboardType="host" />} />
          <Route path="integrations-marketplace" element={<HostIntegrations />} />
          <Route path="integrations-marketplace/whatsapp/callback" element={<WhatsAppConnectCallback />} />
          <Route path="admin/channex-certification" element={<ChannexCertificationAdminPage />} />
          <Route path="revenues" element={<HostReports />} />

          <Route path="tasks" element={<HostPropertyCare />} />
          <Route path="housekeeping" element={<Navigate to="../tasks" replace />} />

          <Route path="finance" element={<HostFinanceTab />} />
          <Route path="listings" element={<HostListings />} />
          <Route path="website" element={<WebsiteBuilderPage />} />
          <Route path="website/kpis" element={<WebsiteKpiDashboardPage />} />
          <Route path="website/:propertyId" element={<WebsiteEditorPage />} />
          <Route path="website-kpis" element={<Navigate to="../website/kpis" replace />} />
          <Route path="property" element={<HostProperty />} />
          <Route path="settings" element={<HostSettingsHub />} />
          <Route path="settings/personal-data" element={<HostSettingsPersonalData />} />
          <Route path="settings/team" element={<HostTeam />} />
          <Route path="settings/company" element={<HostSettingsCompany />} />
          <Route path="settings/rate-plans" element={<HostSettingsRatePlans />} />
          <Route path="settings/compliance" element={<HostSettingsCompliance />} />

          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default MainDashboardHost;
