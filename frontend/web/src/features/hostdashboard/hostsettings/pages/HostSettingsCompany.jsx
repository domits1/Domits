import React, { useState } from "react";
import CompanyForm from "../components/CompanyForm";
import "../../../../styles/sass/pages/dashboard/settingsDashboard.css";
import "../styles/hostSettings.css";

const HostSettingsCompany = () => {
    const [companyName, setCompanyName] = useState("");

    return (
        <CompanyForm
            companyName={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
        />
    );
};

export default HostSettingsCompany;
