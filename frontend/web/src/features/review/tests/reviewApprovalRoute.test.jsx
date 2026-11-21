import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MainDashboardHost from "../../hostdashboard/mainDashboardHost";

jest.mock("../../hostdashboard/Pages2", () => () => null);

jest.mock("../views/ReviewApprovalPage", () => () => "Review approval page");

// Keep this route test independent of unrelated dashboard screen dependencies.
jest.mock("../../hostdashboard/HostDashboard", () => () => null);
jest.mock("../../hostdashboard/hostcalen/HostCalendar", () => () => null);
jest.mock("../../hostdashboard/HostReservations", () => () => null);
jest.mock("../../hostdashboard/hostmessages/HostMessagingPage", () => () => null);
jest.mock("../../hostdashboard/HostPayments", () => () => null);
jest.mock("../views/HostReviews", () => () => null);
jest.mock("../../hostdashboard/hosttasks/pages/HostTasks", () => () => null);
jest.mock("../../hostdashboard/hostowners/pages/HostOwners", () => () => null);
jest.mock("../../hostdashboard/hostowners/pages/HostOwnerDetail", () => () => null);
jest.mock("../../hostdashboard/hostfinance/components/HostFinanceTab", () => () => null);
jest.mock("../../hostdashboard/HostListings", () => () => null);
jest.mock("../../hostdashboard/website/WebsiteBuilderPage", () => () => null);
jest.mock("../../hostdashboard/website/WebsiteEditorPage", () => () => null);
jest.mock("../../hostdashboard/website/kpis/WebsiteKpiDashboardPage", () => () => null);
jest.mock("../../hostdashboard/hostinsights/missedrevenue/MissedRevenueDashboardPage", () => () => null);
jest.mock("../../hostdashboard/HostTeam", () => () => null);
jest.mock("../../hostdashboard/hostsettings/pages/HostSettingsHub", () => () => null);
jest.mock("../../hostdashboard/hostsettings/pages/HostSettingsPersonalData", () => () => null);
jest.mock("../../hostdashboard/hostsettings/pages/HostCommunicationPreferences", () => () => null);
jest.mock("../../hostdashboard/hostsettings/pages/HostSettingsCompany", () => () => null);
jest.mock("../../hostdashboard/hostsettings/pages/HostSettingsRatePlans", () => () => null);
jest.mock("../../hostdashboard/hostsettings/pages/HostSettingsCompliance", () => () => null);
jest.mock("../../hostdashboard/hostsettings/pages/HostSettingsPrivacySecurity", () => () => null);
jest.mock("../../hostdashboard/hosthomeautomation/views/HomeAutomationRoute", () => () => null);
jest.mock("../../hostdashboard/onboardinghub/pages/HostOnboardingHub", () => () => null);
jest.mock("../../hostdashboard/onboardinghub/pages/HostOnboardingEnterprise", () => () => null);
jest.mock("../../hostdashboard/onboardinghub/pages/HostOnboardingGoLive", () => () => null);
jest.mock("../../hostdashboard/HostProperty", () => () => null);
jest.mock("../../hostdashboard/HostIntegrations", () => () => null);
jest.mock("../../hostdashboard/WhatsAppConnectCallback", () => () => null);
jest.mock("../../hostdashboard/hostpricelabs/views/HostPriceLabs", () => () => null);
jest.mock("../../hostdashboard/hostchanneldistribution/views/HostChannelDistribution", () => () => null);
jest.mock("../../hostdashboard/channexadmin/ChannexCertificationAdminPage", () => () => null);
jest.mock("../../hostdashboard/propertyreview/PropertyReviewPage", () => () => null);
jest.mock("../../hostdashboard/propertyreview/detail/PropertyReviewDetailPage", () => () => null);
jest.mock("../../hostonboarding/OnboardingLayout", () => () => null);
jest.mock("../../hostonboarding/hooks/StepGuard", () => () => null);
jest.mock("../../hostonboarding/views/1_AccommodationTypeView", () => () => null);
jest.mock("../../hostonboarding/views/2_HouseTypeView", () => () => null);
jest.mock("../../hostonboarding/views/1b_BoatTypeView", () => () => null);
jest.mock("../../hostonboarding/views/1c_CamperTypeView", () => () => null);
jest.mock("../../hostonboarding/views/3_AddressInputView", () => () => null);
jest.mock("../../hostonboarding/views/4_PropertyCapacityView", () => () => null);
jest.mock("../../hostonboarding/views/5_AmenitiesView", () => () => null);
jest.mock("../../hostonboarding/views/6_PropertyHouseRulesView", () => () => null);
jest.mock("../../hostonboarding/views/7_PropertyPhotosView", () => () => null);
jest.mock("../../hostonboarding/views/8_PropertyTitleView", () => () => null);
jest.mock("../../hostonboarding/views/9_PropertyDescriptionView", () => () => null);
jest.mock("../../hostonboarding/views/10_PropertyRateView", () => () => null);
jest.mock("../../hostonboarding/views/11_PropertyAvailabilityView", () => () => null);
jest.mock("../../hostonboarding/views/12_SummarySubmitView", () => () => null);
jest.mock("../../verification/hostverification/HostVerifyRegistrationNumber", () => () => null);
jest.mock("../../hostdashboard/HostReservationDetails", () => () => null);
jest.mock("../../hostdashboard/hostsettings/pages/HostSettingsEnterpriseRatePlan", () => () => null);
jest.mock("../../hostdashboard/hostsettings/pages/HostSettingsDirectBookingRatePlan", () => () => null);
jest.mock("../../hostdashboard/hostsettings/pages/HostSettingsDirectBookingWebsiteRatePlan", () => () => null);

describe("Review approval route", () => {
  test("serves the review approval page at admin/review-approval", () => {
    render(
      <MemoryRouter initialEntries={["/hostdashboard/admin/review-approval"]}>
        <Routes>
          <Route path="/hostdashboard/*" element={<MainDashboardHost />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Review approval page")).toBeTruthy();
    const navigation = screen.getByRole("navigation", { name: "Admin panel" });
    expect(within(navigation).getByRole("link", { name: "Reviews" }).getAttribute("aria-current")).toBe("page");
  });
});
