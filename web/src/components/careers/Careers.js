import React from "react";
import careerimg from '../../images/careerimg.png';
import './careers.css'

function Career() {
    return (
        <body>
            <div class="container">
                <div class="job-box">
                    <div class="job-title">Software Engineer</div>
                    <div class="job-location">Amsterdam, NL</div>
                    <div class="job-description">
                        We are looking for a talented Software Engineer to join our dynamic team. You will be responsible for developing high-quality software solutions and collaborating with cross-functional teams to define, design, and ship new features.
                    </div>
                </div>
                <div class="job-box">
                    <div class="job-title">Marketing Specialist</div>
                    <div class="job-location">Rotterdam, NL</div>
                    <div class="job-description">
                        We are seeking a creative Marketing Specialist to develop and implement marketing strategies to promote our products and services. You will work closely with the marketing team to execute campaigns and analyze performance metrics.
                    </div>
                </div>
                <div class="job-box">
                    <div class="job-title">Data Analyst</div>
                    <div class="job-location">Utrecht, NL</div>
                    <div class="job-description">
                        We are hiring a Data Analyst to interpret data, analyze results, and provide insights to drive business decisions. The ideal candidate should have strong analytical skills and be proficient in data visualization tools.
                    </div>
                </div>
            </div>
        </body>
    );
}

export default Career;