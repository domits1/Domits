import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../../../../styles/sass/pages/dashboard/settingsDashboard.css";
import "../styles/hostSettings.css";

const HostSettingsCompliance = () => {
    const [registrationNumber, setRegistrationNumber] = useState("");

    return (
        <div className="personal-data-page">
            <nav className="personal-data-breadcrumb">
                <Link to="/hostdashboard/settings">Settings</Link>
                <span className="personal-data-breadcrumb-sep">/</span>
                <span className="personal-data-breadcrumb-current">Compliance</span>
            </nav>

            <header className="personal-data-header">
                <h1 className="personal-data-title">Compliance</h1>
                <p className="personal-data-subtitle">
                    Verify your property and host identity to meet local registrations.
                </p>
            </header>

            <section className="personal-data-section">
                <h2 className="personal-data-section-title">Compliance Details</h2>
                <div className="personal-data-card">
                    <div className="personal-data-card-inner">
                        <div className="personal-data-fields-col">
                            <div className="pd-field">
                                <label className="pd-field-label" htmlFor="registration-number">
                                    Property registration
                                </label>
                                <input
                                    id="registration-number"
                                    type="text"
                                    name="registrationNumber"
                                    value={registrationNumber}
                                    onChange={(e) => setRegistrationNumber(e.target.value)}
                                    className="pd-field-input"
                                    placeholder="Registration number"
                                />
                            </div>
                            <p className="compliance-card-hint">
                                This number proves your property is registered with local authorities.
                                Additional compliance methods (ID verification, address proof) will be available soon.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HostSettingsCompliance;
