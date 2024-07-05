import React, {useEffect, useState} from 'react';
import styles from "./ReviewPage.module.css";
import {Auth} from "aws-amplify";
import {useLocation, useNavigate} from "react-router-dom";
const ReviewPage = () => {
    const [userId, setUserId] = useState(null);
    const [username, setUsername] = useState('');
    const [page, setPage] = useState(0);
    const navigate = useNavigate();
    const { search } = useLocation();
    const searchParams = new URLSearchParams(search);
    const recipientID = searchParams.get('ID');
    const type = searchParams.get('TYPE');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [rating, setRating] = useState(null);

    const renderRating = () => {
        if (rating) {
            switch (rating) {
                case 1:
                    return (<h3>Horrible</h3>);
                case 2:
                    return (<h3>Could be better</h3>);
                case 3:
                    return (<h3>It was okay</h3>);
                case 4:
                    return (<h3>Decent</h3>);
                case 5:
                    return (<h3>Amazing</h3>);
            }
        }
    }

    const renderPageContent = (page) => {
        switch (page) {
            case 0:
                return (
                    <main className={styles.main}>
                        <h1>{type === 'HostToGuest' ? 'How did the guest(s) behave?' : 'How was the experience?'}</h1>
                        <form className={styles.rating}>
                            <label>
                                <input type="radio" name="stars" value="1" onClick={(e) => setRating(e.target.value)}/>
                                <span className={styles.icon}>★</span>
                            </label>
                            <label>
                                <input type="radio" name="stars" value="2" onClick={(e) => setRating(e.target.value)}/>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                            </label>
                            <label>
                                <input type="radio" name="stars" value="3" onClick={(e) => setRating(e.target.value)}/>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                            </label>
                            <label>
                                <input type="radio" name="stars" value="4" onClick={(e) => setRating(e.target.value)}/>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                            </label>
                            <label>
                                <input type="radio" name="stars" value="5" onClick={(e) => setRating(e.target.value)}/>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                            </label>
                        </form>
                        <div>
                            {renderRating()}
                        </div>
                    </main>
                );
            case 1:
                return (
                    <main className={styles.main}>
                        <h1>Start writing your review</h1>
                    </main>
                );
            default:
                return null;
        }
    }
    useEffect(() => {
        Auth.currentUserInfo().then(user => {
            if (user) {
                setUsername(user.attributes['custom:username']);
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
