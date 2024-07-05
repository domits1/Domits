import React, { useEffect, useState } from 'react';
import styles from "./ReviewPage.module.css";
import { Auth } from "aws-amplify";
import { useLocation, useNavigate } from "react-router-dom";

const ReviewPage = () => {
    const [userId, setUserId] = useState(null);
    const [username, setUsername] = useState('');
    const [page, setPage] = useState(0);
    const [rating, setRating] = useState(null);
    const navigate = useNavigate();
    const { search } = useLocation();
    const searchParams = new URLSearchParams(search);
    const recipientID = searchParams.get('ID');
    const type = searchParams.get('TYPE');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [feedBack, setFeedBack] = useState('');
    const [comment, setComment] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        renderRating();
    }, [rating]);

    useEffect(() => {
        if (rating && title && content) {
            setIsCompleted(true);
        } else {
            setIsCompleted(false);
        }
    }, [rating, title, content]);

    const renderRating = () => {
        if (rating) {
            switch (parseInt(rating)) {
                case 1:
                    setComment('Horrible');
                    break;
                case 2:
                    setComment('Could be better');
                    break;
                case 3:
                    setComment('It was okay');
                    break;
                case 4:
                    setComment('Decent');
                    break;
                case 5:
                    setComment('Amazing');
                    break;
                default:
                    setComment('');
                    break;
            }
        } else {
            setComment('');
        }
    }
    const pageUpdater = (pageNumber) => {
        setPage(pageNumber);
    };

    const handleRatingChange = (value) => {
        setRating(value);
    };

    const renderPageContent = (page) => {
        switch (page) {
            case 0:
                return (
                    <main className={styles.main}>
                        <h1>{type === 'HostToGuest' ? 'How did the guest(s) behave?' : 'How was the experience?'}</h1>
                        <form className={styles.rating}>
                            <label>
                                <input type="radio" name="stars" value="1" checked={rating === '1'} onChange={() => handleRatingChange('1')} />
                                <span className={styles.icon}>★</span>
                            </label>
                            <label>
                                <input type="radio" name="stars" value="2" checked={rating === '2'} onChange={() => handleRatingChange('2')} />
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                            </label>
                            <label>
                                <input type="radio" name="stars" value="3" checked={rating === '3'} onChange={() => handleRatingChange('3')} />
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                            </label>
                            <label>
                                <input type="radio" name="stars" value="4" checked={rating === '4'} onChange={() => handleRatingChange('4')} />
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                            </label>
                            <label>
                                <input type="radio" name="stars" value="5" checked={rating === '5'} onChange={() => handleRatingChange('5')} />
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                                <span className={styles.icon}>★</span>
                            </label>
                        </form>
                        <div>
                            <h3 className={styles.comment}>{comment}</h3>
                        </div>
                        <div className={styles.buttonBox}>
                            <button onClick={() => navigate('/')}>Cancel</button>
                            <button onClick={() => pageUpdater(page + 1)}>Proceed</button>
                        </div>
                    </main>
                );
            case 1:
                return (
                    <main className={styles.main}>
                        <h1>Start writing your review</h1>
                        <section className={styles.title}>
                            <label htmlFor="title">Title*</label>
                            <input
                                name="Title"
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Type here..."
                                required={true}
                                maxLength={32}
                            />
                            <p>{title.length}/32</p>
                        </section>
                        <section className={styles.content}>
                            <label htmlFor="content">Please justify your rating*</label>
                            <textarea
                                className={styles.textarea}
                                name="Content"
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Type here..."
                                required={true}
                                maxLength={500}
                            />
                            <p>{content.length}/500</p>
                        </section>
                        <section className={styles.content}>
                            <label htmlFor="content">Do you have any feedbacks? (not required)</label>
                            <textarea
                                className={styles.textarea}
                                name="Content"
                                onChange={(e) => setFeedBack(e.target.value)}
                                placeholder="Type here..."
                                maxLength={500}
                            />
                            <p>{feedBack.length}/500</p>
                        </section>
                        <div className={styles.buttonBox}>
                            <button onClick={() => pageUpdater(page - 1)}>Go back</button>
                            <button className={!isCompleted ? styles.disabled : ''} onClick={() => pageUpdater(page + 1)}>Confirm and publish</button>
                        </div>
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
