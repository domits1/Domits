import React from "react";
import CompanyForm from "../components/CompanyForm";
import useCompanyProfile from "../../../../hooks/useCompanyProfile";
import useCompanyLogoUpload from "../../../../hooks/useCompanyLogoUpload";
import "../../../../styles/sass/pages/dashboard/settingsDashboard.css";
import "../styles/hostSettings.css";

const HostSettingsCompany = () => {
    const { profile, updateField, isSaving, saveSuccess, error, save } = useCompanyProfile();
    const {
        logoError,
        isUploadingLogo,
        logoInputRef,
        onLogoButtonClick,
        onLogoInputChange,
        onLogoRemove,
    } = useCompanyLogoUpload((logoUrl) => updateField("logoUrl", logoUrl));

    const onFieldChange = (e) => updateField(e.target.name, e.target.value);

    return (
        <CompanyForm
            profile={profile}
            onFieldChange={onFieldChange}
            onSave={save}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
            error={error}
            logoError={logoError}
            isUploadingLogo={isUploadingLogo}
            logoInputRef={logoInputRef}
            onLogoButtonClick={onLogoButtonClick}
            onLogoInputChange={onLogoInputChange}
            onLogoRemove={onLogoRemove}
        />
    );
};

export default HostSettingsCompany;
