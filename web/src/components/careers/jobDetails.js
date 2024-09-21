import React, { useState } from "react";
import Jobs from "./jobs.json";
import { useNavigate, useParams } from 'react-router-dom';
import "./jobDetails.css";
import office from '../../images/office.jpg';
import coWork from '../../images/co-work.jpg';

function JobDetails() {
    const navigate = useNavigate();
    const navigateToContact = () => {
        navigate('/contact');
    };
    const { id } = useParams();
    const job = Jobs.find((job, index) => index.toString() === id);

    if(!job)
        <div>Job not found</div>

    return(
        <div className="job-detail-container">
            <section class="hero">
                <div class="left-container">
                    <h1>{job.title}</h1>
                    <span class="company-name">At Domits</span>
                    <p>{job.details.jobDescription}</p>
                    <div class="job-tags">
                        <div class="tag">{job.experience}</div>
                        <div class="tag">{job.category}</div>
                        <div class="tag">{job.model}</div>
                        <div class="tag">{job.location}</div>
                    </div>
                </div>
                <div class="right-container">
                    <img src={office} alt="Office Image"/>
                </div>
            </section>

            <section className="responsibilities">
                <div className="resp-container">
                    <img src={coWork} alt="" />
                    <div className="resp-right">
                        <h2 className="resp-heading">What you'll be doing</h2>
                        <p>{job.details.responsibilities}</p>
                    </div>
                </div>
            </section>

            <section className="technologies">
                <h2 className="tech-heading">Technologies we work with</h2>
                <p>{job.details.responsibilities}</p>
            </section>

            <section className="experience">
                <div className="exp-container-top">
                    <h2 className="exp-heading">Bonus if you have experience with</h2>
                    <ul>
                        {job.details.preferredExperience.map((exp, index) => (
                            <li key={index}>- {exp}</li>
                        ))}
                    </ul>
                </div>
                <div className="exp-container-bottom">
                    <h2 className="exp-heading">What we ask</h2>
                    <ul>
                        {job.details.requirements.map((requirement, index) => (
                        <li key={index}>- {requirement}</li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="technologies">
                <h2 className="tech-heading">What we offer</h2>
                <p>{job.details.offerings}</p>
            </section>

           <section className="apply">

           </section>
           <h3>Extra information</h3>
            <ul>
                {job.details.extraInformation.map((extra, index) => (
                    <li key={index}>- {extra}</li>
                ))}
            </ul>
            <h3>Apply now</h3>
            <p>{job.details.apply}</p><br></br>
            

            <button className="apply-button" onClick={navigateToContact}>Apply</button>
        </div>
    );
};

export default JobDetails;