import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const CompanyForm = ({ companyName, onChange }) => (
    <div className="personal-data-page">
        <nav className="personal-data-breadcrumb">
            <Link to="/hostdashboard/settings">Settings</Link>
            <span className="personal-data-breadcrumb-sep">/</span>
            <span className="personal-data-breadcrumb-current">Company</span>
        </nav>

        <header className="personal-data-header">
            <h1 className="personal-data-title">Company</h1>
            <p className="personal-data-subtitle">Manage your company information.</p>
        </header>

        <section className="personal-data-section">
            <h2 className="personal-data-section-title">Company Details</h2>
            <div className="personal-data-card">
                <div className="personal-data-card-inner">
                    <div className="personal-data-fields-col">
                        <div className="pd-field">
                            <label className="pd-field-label" htmlFor="company-name">
                                Company name
                            </label>
                            <input
                                id="company-name"
                                type="text"
                                name="companyName"
                                value={companyName}
                                onChange={onChange}
                                className="pd-field-input"
                                placeholder="Enter company name"
                            />
                        </div>
                        <p className="company-card-hint">
                            This information will appear on invoices and reports.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    </div>
);

CompanyForm.propTypes = {
    companyName: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
};

export default CompanyForm;
