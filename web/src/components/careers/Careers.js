import React from "react";
import "./careers.css";

function Career() {
    return (
        <main>
            <h2 className="crew">Let's find a fitting job</h2>
            <div className="container job-list">
                <div className="filterbar">
                    <h2 style={{margin: 0}}>Filters</h2>
                    <div className="filter-section">
                        <h3>Experience Level</h3>
                        <label>
                            <input type="checkbox" value="Intern" />
                            Intern
                        </label>
                        <label>
                            <input type="checkbox" value="Junior Developer" />
                            Junior Developer
                        </label>
                        <label>
                            <input type="checkbox" value="Team Leader" />
                            Team Leader
                        </label>
                        {/* Add more checkboxes for different experience levels */}
                    </div>
                    <div className="filter-section">
                        <h3>Country</h3>
                        <label>
                            <input type="checkbox" value="NL" />
                            Netherlands
                        </label>
                        <label>
                            <input type="checkbox" value="US" />
                            United States
                        </label>
                        {/* Add more checkboxes for different countries */}
                    </div>
                </div>
                <div>
                    <div className="job-box">
                        <div className="job-info">
                            <div className="job-title">Software Engineer</div>
                            <div className="experience-level">Junior Developer</div>
                            <div className="job-location">Amsterdam, NL</div>
                        </div>
                        <div className="hover-content">
                            <div className="job-description">
                                We are looking for a talented Software Engineer to join our
                                dynamic team. You will be responsible for developing
                                high-quality software solutions and collaborating with
                                cross-functional teams to define, design, and ship new features.
                            </div>
                            <button className="apply-button">Apply</button>
                        </div>
                    </div>
                    <div className="job-box">
                        <div className="job-info">
                            <div className="job-title">Software Engineer</div>
                            <div className="experience-level">Junior Developer</div>
                            <div className="job-location">Amsterdam, NL</div>
                        </div>
                        <div className="hover-content">
                            <div className="job-description">
                                We are looking for a talented Software Engineer to join our
                                dynamic team. You will be responsible for developing
                                high-quality software solutions and collaborating with
                                cross-functional teams to define, design, and ship new features.
                            </div>
                            <button className="apply-button">Apply</button>
                        </div>
                    </div>
                    <div className="job-box">
                        <div className="job-info">
                            <div className="job-title">Software Engineer</div>
                            <div className="experience-level">Junior Developer</div>
                            <div className="job-location">Amsterdam, NL</div>
                        </div>
                        <div className="hover-content">
                            <div className="job-description">
                                We are looking for a talented Software Engineer to join our
                                dynamic team. You will be responsible for developing
                                high-quality software solutions and collaborating with
                                cross-functional teams to define, design, and ship new features.
                            </div>
                            <button className="apply-button">Apply</button>
                        </div>
                    </div>
                    <div className="job-box">
                        <div className="job-info">
                            <div className="job-title">Software Engineer</div>
                            <div className="experience-level">Junior Developer</div>
                            <div className="job-location">Amsterdam, NL</div>
                        </div>
                        <div className="hover-content">
                            <div className="job-description">
                                We are looking for a talented Software Engineer to join our
                                dynamic team. You will be responsible for developing
                                high-quality software solutions and collaborating with
                                cross-functional teams to define, design, and ship new features.
                            </div>
                            <button className="apply-button">Apply</button>
                        </div>
                    </div>
                    <div className="job-box">
                        <div className="job-info">
                            <div className="job-title">Software Engineer</div>
                            <div className="experience-level">Junior Developer</div>
                            <div className="job-location">Amsterdam, NL</div>
                        </div>
                        <div className="hover-content">
                            <div className="job-description">
                                We are looking for a talented Software Engineer to join our
                                dynamic team. You will be responsible for developing
                                high-quality software solutions and collaborating with
                                cross-functional teams to define, design, and ship new features.
                            </div>
                            <button className="apply-button">Apply</button>
                        </div>
                    </div>
                    <div className="job-box">
                        <div className="job-info">
                            <div className="job-title">Software Engineer</div>
                            <div className="experience-level">Junior Developer</div>
                            <div className="job-location">Amsterdam, NL</div>
                        </div>
                        <div className="hover-content">
                            <div className="job-description">
                                We are looking for a talented Software Engineer to join our
                                dynamic team. You will be responsible for developing
                                high-quality software solutions and collaborating with
                                cross-functional teams to define, design, and ship new features.
                            </div>
                            <button className="apply-button">Apply</button>
                        </div>
                    </div>
                    <div className="job-box">
                        <div className="job-info">
                            <div className="job-title">Software Engineer</div>
                            <div className="experience-level">Junior Developer</div>
                            <div className="job-location">Amsterdam, NL</div>
                        </div>
                        <div className="hover-content">
                            <div className="job-description">
                                We are looking for a talented Software Engineer to join our
                                dynamic team. You will be responsible for developing
                                high-quality software solutions and collaborating with
                                cross-functional teams to define, design, and ship new features.
                            </div>
                            <button className="apply-button">Apply</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default Career;
