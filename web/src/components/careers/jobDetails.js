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
    // const job = Jobs.find((job, index) => index.toString() === id);
    const job = Jobs.find(job => job.id === parseInt(id, 10));

    if (!job) {
       return <div>Job not found</div>
    }

    return(
        <div className="job-detail-container">
            <section class="hero">
                <div class="left-container">
                    <h1>{job.title || "Title not available"}</h1>
                    <span class="company-name">At Domits</span>
                    <p>{job.details?.jobDescription || "Job description not available"}</p>
                    <div class="job-tags">
                        <div className="tag">{job.experience || "Experience not specified"}</div>
                        <div className="tag">{job.category || "Category not specified"}</div>
                        <div className="tag">{job.model || "Job model not specified"}</div>
                        <div className="tag">{job.location || "Location not specified"}</div>
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
                        <p>{job.details?.responsibilities || "Responsibilities not available"}</p>
                    </div>
                </div>
            </section>

            <section className="technologies">
                <h2 className="tech-heading">Technologies we work with</h2>
                <p>{job.details?.responsibilities || "Technologies not specified"}</p>
            </section>

            <section className="experience">
                <div className="exp-container-top">
                    <h2 className="exp-heading">Bonus if you have experience with</h2>
                    <ul className="job-detail-list">
                        {/* {job.details.preferredExperience.map((exp, index) => (
                            <li key={index}>- {exp}</li>
                        ))} */}
                        {job.details?.preferredExperience?.length > 0 ? 
                            job.details.preferredExperience.map((exp, index) => (
                                <li key={index}>{exp}</li>
                            )) : <li>No preferred experience specified</li>}
                    </ul>
                </div>
                <div className="exp-container-bottom">
                    <h2 className="exp-heading">What we ask</h2>
                    <ul className="job-detail-list">
                        {/* {job.details.requirements.map((requirement, index) => (
                        <li key={index}>- {requirement}</li>
                        ))} */}
                        {job.details?.requirements?.length > 0 ? 
                            job.details.requirements.map((requirement, index) => (
                                <li key={index}>{requirement}</li>
                            )) : <li>No requirements specified</li>}
                    </ul>
                </div>
            </section>

            <section className="technologies">
                <h2 className="tech-heading">What we offer</h2>
                <p>{job.details?.offerings || "Offerings not specified"}</p>
            </section>

           <section className="apply">
            <h2 className="exp-heading">Extra information</h2>
                <ul className="job-detail-list">
                    {/* {job.details.extraInformation.map((extra, index) => (
                        <li key={index}>- {extra}</li>
                    ))} */}
                    {job.details?.extraInformation?.length > 0 ? 
                        job.details.extraInformation.map((extra, index) => (
                            <li key={index}>{extra}</li>
                        )) : <li>No extra information specified</li>}
                </ul>
                <h2 className="exp-heading">Apply now</h2>
                <p>{job.details?.apply || "Application instructions not available"}</p>
                

                <button className="apply-button" onClick={navigateToContact}>Apply</button>                    
           </section>
           
        </div>
    );
};

export default JobDetails;