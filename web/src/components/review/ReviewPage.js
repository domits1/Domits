import React, {useEffect, useState} from 'react';
import styles from "./ReviewPage.module.css";
import {Auth} from "aws-amplify";
import {useNavigate} from "react-router-dom";
const ReviewPage = () => {
    let [userId, setUserId] = useState(null);
    const [page, setPage] = useState(0);
    const navigate = useNavigate();
    const renderPageContent = (page) => {
        switch (page) {
            case 0:
                return (
                    <main className={styles.main}>
                        <h1>Start writing your review</h1>
                    </main>
                );
            default: return null;
        }
    }
    useEffect(() => {
        Auth.currentUserInfo().then(user => {
            if (user) {
                setUserId(user.attributes.sub);
            } else {
                navigate('/login');
            }
        }).catch(error => {
            console.error("Error setting user id:", error);
            navigate('/login');
        });
    }, [navigate]);

    return (
        renderPageContent(page)
    );
}

export default ReviewPage;
