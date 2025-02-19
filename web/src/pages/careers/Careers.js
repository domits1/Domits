import React, { useState } from "react";
import Jobs from "./jobs.json";
import JobDetails from "./jobDetails";
import { useNavigate, useParams } from 'react-router-dom';
import "./styles/careers.css";
import styles from '../../utils/styles/PageSwitcher.module.css'


function Career() {
    const navigate = useNavigate();
    const navigateToContact = () => {
        navigate('/contact');
    };

    // const navigateToJobDetails = (index) => {
    //     navigate(`/job/${index}`);
    // };
    const navigateToJobDetails = (id) => {
        navigate(`/job/${id}`);
    };


    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const itemsPerPage = 8;


    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        setCurrentPage(1);
    };

    const filteredJobs = selectedCategory === "All" ? Jobs : Jobs.filter(job => job.category === selectedCategory);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    const displayedJobs = filteredJobs.slice(startIndex, endIndex);

    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <main>
            <h2 className="crew">Let's find a fitting job</h2>
            <div className="filter-container">
                <button onClick={() => handleCategoryChange("All")} className={selectedCategory === "All" ? "active" : ""}>All</button>
                <button onClick={() => handleCategoryChange("People")} className={selectedCategory === "People" ? "active" : ""}>People</button>
                <button onClick={() => handleCategoryChange("Engineering")} className={selectedCategory === "Engineering" ? "active" : ""}>Engineering</button>
                <button onClick={() => handleCategoryChange("Growth")} className={selectedCategory === "Growth" ? "active" : ""}>Growth</button>
                <button onClick={() => handleCategoryChange("Legal")} className={selectedCategory === "Legal" ? "active" : ""}>Legal</button>
                <button onClick={() => handleCategoryChange("Finance")} className={selectedCategory === "Finance" ? "active" : ""}>Finance</button>
            </div>
            <div className="container job-list">
                {displayedJobs.map((job, index) => (
                    // <div className="job-box" key={index} onClick={() => navigateToJobDetails(startIndex + index)}>
                    <div className="job-box" key={job.id} onClick={() => navigateToJobDetails(job.id)}>
                        <div className="job-info">
                            <div className="job-title">{job.title}</div>
                            <div className="experience-level">{job.experience}</div>
                            <div className="job-location">{job.location}</div>
                        </div>
                        <div className="hover-content">
                            <div className="job-description">
                                <p>{job.details.apply}</p>
                                <br></br>
                                <p>{job.details.jobDescription}</p>
                            </div>
                            <button className="apply-button" onClick={navigateToContact}>Apply</button>
                        </div>
                    </div>
                ))}
            </div>
            {/* Pagination */}
            <div className={styles.pagination}>
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                    &lt; Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => handlePageChange(i + 1)}
                        className={`${(currentPage === i + 1) && styles.active}`}
                    >
                        {i + 1}
                    </button>
                ))}
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                    Next &gt;
                </button>
            </div>
        </main>
    );
}

export default Career;
