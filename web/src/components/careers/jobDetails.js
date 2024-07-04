import React, { useState } from "react";
import Jobs from "./jobs.json";
import { useNavigate, useParams } from 'react-router-dom';
import "./jobDetails.css";

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
            <h2><strong>{job.title}</strong></h2><br></br>
            <p>{job.details.jobDescription}</p><br></br>
            <h3>Experience</h3> 
            <p>{job.experience}</p><br></br> 
            <h3>Category</h3>
            <p>{job.category}</p><br></br> 
            <h3>Location</h3>
            <p>{job.location}</p><br></br> 
            <h3>What are you going to do</h3>
            <p>{job.details.responsibilities}</p><br></br>

            <h3>Technologies</h3>
              <ul>
                {job.details.technologies.map((tech, index) => (
                    <li key={index}>- {tech}</li>
                ))}
              </ul>

            <h3>Pre if you have experience with</h3>
            <ul>
                {job.details.preferredExperience.map((exp, index) => (
                    <li key={index}>- {exp}</li>
                ))}
            </ul><br></br>

            <h3>What we offer</h3>
            <ul>
              {job.details.offerings.map((offering, index) => (
                <li key={index}>- {offering}</li>
              ))}
            </ul>

            <h3>What we ask</h3>
            <ul>
                {job.details.requirements.map((requirement, index) => (
                    <li key={index}>- {requirement}</li>
                ))}
            </ul>
            
            <h3>Apply</h3>
            <p>{job.details.apply}</p><br></br>
            <h3>Extra information</h3>
            <ul>
                {job.details.extraInformation.map((extra, index) => (
                    <li key={index}>- {extra}</li>
                ))}
            </ul>

            <button className="apply-button" onClick={navigateToContact}>Apply</button>
        </div>
    );
};

export default JobDetails;