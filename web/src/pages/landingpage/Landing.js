import React, {useState, useEffect, useContext, useRef} from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import styles from './landing.module.css';
import Register from "../../features/auth/Register";
import MainTextpicture from "../../images/host-landing-example.png";
import whyHostpicture from "../../images/host-landing-example2.jpg";
import verifiedLogo from "../../images/icons/verify-icon.png";
import approveLogo from "../../images/icons/approve-accept-icon.png";
import checkMark from "../../images/icons/checkMark.png";
import question from "../../images/icons/question.png";
import bill from "../../images/icons/bill.png";
import banknoteLogo from "../../images/icons/banknote-icon.png";
import supportLogo from "../../images/icons/question-mark-round-icon.png";
import internationalLogo from "../../images/icons/world-globe-line-icon.png";
import rulesLogo from "../../images/icons/result-pass-icon.png";
import PersonalAdvice from "../../images/personal-advice.png";
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


const FaqItem = ({ question, answer, toggleOpen, isOpen }) => {
    const answerRef = useRef(null);
    const [height, setHeight] = useState(0);

    useEffect(() => {
        if (answerRef.current) {
            setHeight(answerRef.current.scrollHeight);
        }
    }, [isOpen]);
    useEffect(() => {
        if (isOpen) {
            console.log(answer);
        }
    }, [isOpen]);

    const navigateToMessages = () => {
        if (currentView === 'host') {
            navigate('/hostdashboard/chat');
        } else {
            navigate('/guestdashboard/chat');
        }
    };

    return (
        <div className={styles.landing__faq} onClick={toggleOpen}>
            <div className={styles.landing__faq__body}>
                <span className={styles.landing__faq__question}>{question}</span>
                <span className={styles.landing__faq__arrow}>{isOpen ? '▲' : '▼'}</span>
            </div>
            <div
                className={styles.landing__faq__answer}
                style={{maxHeight: isOpen ? `${height}px` : '0', overflow: 'hidden' }}
                ref={answerRef}
            >
                {answer}
            </div>
        </div>
    );
};
function Landing() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [group, setGroup] = useState('');
    const navigate = useNavigate();
    const [faqs, setFaqs] = useState([
        {
            question: "Getting started as a host",
            answer: (
                <>
                    Register as a host, connect or create your stripe account, start listing your accommodation.
                </>
            ),
            isOpen: false
        },
        {
            question: "How to list your holiday rental?",
            answer: (
                <>
                    You can list your rental by <span onClick={!isAuthenticated ? () => navigate('/register') : ''}>becoming a Domits host</span> and filling in the required information. We will
                    contact you shortly after you submit your holiday rental so you can start renting and earning!
                </>
            ),
            isOpen: false
        },
        {
            question: "How do I create and manage my host account?",
            answer: (
                <>
                    Creating a Host account is easy. Click the 'Become a Host' button at the top right and follow the instructions.
                    Once your account is set up, switch to the Host Dashboard from the menu. Here,
                    you can add your property by providing details like type, location, and amenities. After submitting, your listing will be verified.
                    Once approved, set your availability, pricing, and upload photos. To go live, create a Stripe account for payments.
                    You can manage everything—availability, pricing, and details—directly from the Host Dashboard.
                </>
            ),
            isOpen: false
        },
        {
            question: "How payouts and taxes work",
            answer: (
                <>
                    To receive payments, you need to create a Stripe Connect account and link it to Domits via the button in your dashboard.
                    All payments are processed through Stripe, where the necessary fees are automatically deducted.
                </>
            ),
            isOpen: false
        },
        {
            question: "How to manage your calendar and bookings",
            answer: (
                <>
                    An upcoming feature will allow you to manage your bookings more efficiently directly through the dashboard. Stay tuned for updates.
                </>
            ),
            isOpen: false
        }
    ]);

    const reviews = [
        {
            id: 1,
            text: "Renting out my home through this website has been a wonderful experience. The user-friendly interface and the reliable platform make it easy for me to list my property. The booking system works flawlessly, and I always receive timely notifications when a reservation is made. Communication with guests is smooth, allowing me to offer a personal and hassle-free service. Thanks to this website, I am confident that my home is in good hands, and the positive feedback from my guests reaffirms this every time!",
            author: "Rick Terp",
            location: "Host from the Netherlands",
            img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096"
        },
        {
            id: 2,
            text: "Renting out my boat through this platform was a fantastic experience. Everything went smoothly and professionally, from the booking to the communication with renters. Perfect for boat owners!",
            author: "Melissa Steenberk",
            location: "Host from the Netherlands",
            img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096"
        },
        {
            id: 3,
            text: "As the owner of a luxury yacht company, this platform offers us the perfect opportunity to rent out our fleet easily and efficiently. From the user-friendly system to the excellent customer support, everything is flawlessly organized. Our clients appreciate the quality and luxury of our yachts, and thanks to the platform, we can provide them with a hassle-free booking experience. The team behind the platform ensures that our yachts receive optimal visibility for potential renters, resulting in frequent and reliable bookings. A valuable asset for our business!",
            author: "James Heck",
            location: "Owner of a luxury yacht company",
            img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096"
        },
        {
            id: 4,
            text: "I recently hosted my website with Domits in the UK, and the experience has been exceptional. The platform is user-friendly, allowing for quick setup and seamless integration. Speed and reliability are top-notch, with minimal downtime, ensuring my site is always accessible. The customer support team is also extremely helpful, addressing any issues promptly and professionally. If you're looking for a solid hosting solution in the UK, this service offers great performance, security, and value for money. Highly recommended for anyone serious about a stable online presence!",
            author: "Jaimee Becker",
            location: "Host from UK",
            img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096"
        },
        {
            id: 5,
            text: "Reliable and Efficient Hosting from Germany I recently switched to a hosting provider based in Germany, and it’s been an excellent decision. The platform is fast and stable, offering great performance with little to no downtime. The setup process was straightforward, and the service provides excellent security features, which is especially important for websites dealing with sensitive data. The German-based servers have shown impressive speed for both local and international visitors, making it a fantastic choice for businesses or personal websites looking for reliability and performance. Highly recommended for those seeking a strong hosting solution from Germany!",
            author: "Maurice von Dorn",
            location: "Host from Germany",
            img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096"
        },
        {
            id: 6,
            text: "As the owner of Amode, I’ve had the opportunity to host several websites on various platforms, and the service we provide has consistently exceeded expectations. Our hosting solutions are designed to offer a seamless, high-performance experience with reliable uptime, top-notch security features, and a user-friendly interface. Whether you're running a small business or a larger operation, our infrastructure is built to scale efficiently and ensure your site is always performing at its best. At Amode, we prioritize customer satisfaction, and our support team is available around the clock to help with any issues that may arise. We take pride in offering hosting that’s as robust as it is reliable, making us a trusted choice for clients worldwide.",
            author: "Laisa Feldt",
            location: "Owner at Amode",
            img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096"
        },

    ];

    const toggleOpen = (index) => {
        const updatedFaqs = faqs.map((faq, i) =>
            i === index ? { ...faq, isOpen: !faq.isOpen } : faq
        );
        setFaqs(updatedFaqs);
    };

    useEffect(() => {
        checkAuthentication();
    }, []);

    const checkAuthentication = async () => {
        try {
            const user = await Auth.currentAuthenticatedUser();
            setIsAuthenticated(true);
            setGroup(user.attributes['custom:group']);
        } catch (error) {
            console.error('Error checking authentication:', error);
            setIsAuthenticated(false);
        }
    };

    const updateUserGroup = async () => {
        try {
            const user = await Auth.currentAuthenticatedUser();
            let result = await Auth.updateUserAttributes(user, {
                'custom:group': 'Host'
            });
            if (result === 'SUCCESS') {
                console.log("User group updated successfully");
                setGroup('Host');
                navigate('/hostdashboard');
            } else {
                console.error("Failed to update user group");
            }
        } catch (error) {
            console.error('Error updating user group:', error);
        }
    };

    const handleSmoothScroll = (e, targetId) => {
        e.preventDefault();
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            console.error(`Target element with id "${targetId}" not found.`);
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.firstSection}>
                <div className={styles.MainText}>
                    <h1>List your <span className={styles.textContainer}>
                    <div className={styles.textAnimated}>
                            <span>House</span>
                            <span>Camper</span>
                            <span>Boat</span>
                        </div>
                    </span>
                    <br/>for free with 0% booking fee
                </h1>
                    <p>Hobby or profession, register your property today and start increasing your earning potential, revenue, occupancy and average daily rate.</p>

                    <button className={styles.nextButtons}>
                    <a href="#Register" onClick={(e) => handleSmoothScroll(e, 'Register')}>Start hosting</a>
                     </button>
                </div>

                <div className={styles.firstPicture}>
                    <img src={MainTextpicture} alt="House"/>
                </div>

            </div>

        <div className={styles.iconsContainer}>
            <div className={styles.iconsContainerText}>
                <div className={styles.iconTextGroup}>
                    <img src={bill} alt="bill"></img>
                    <p>Secure payments</p>
                </div>
                <div className={styles.iconTextGroup}>
                    <img src={verifiedLogo} alt="verified logo"></img>
                    <p>Verified guests/hosts</p>
                </div>
                <div className={styles.iconTextGroup}>
                    <img src={question} alt="question"></img>
                    <p>Quick phone support</p>
                </div>
                <div className={styles.iconTextGroup}>
                    <img src={checkMark} alt="checkMark"></img>
                    <p>Domits Quality Guarantee</p>
                </div>
            </div>
        </div>




            <div className={styles.RegisterBlock}>
                {isAuthenticated && group !== 'Host' ? (
                    <div className={styles.updateGroupButtonDiv}>
                        <button onClick={updateUserGroup} className={styles.nextButtons}>
                            Become a Host
                        </button>
                    </div>
                ) : (
                    <div id="Register">
                    <Register/>
                    </div>
                )}
            </div>

            <div className={styles.easyHosting}>
                <div className={styles.easyHosting_text}>
                    <h1> Hosting with <span className={styles.highlightText}>Domits</span> has never been <span className={styles.highlightText}>easier</span>.</h1>
                    <h3>It only takes 3 steps</h3>
                </div>
                <div className={styles.threeSteps}>
                    <div className={styles.steps}>
                        <h1><span className={styles.highlightText}>1.</span></h1>
                        <h2 className={styles.headerTwoText}>List your property</h2>
                        <p>Start earning by listing your property for free with 0% fee in just minutes</p>
                    </div>
                    <div className={styles.steps}>
                        <h1><span className={styles.highlightText}>2.</span></h1>
                        <h2 className={styles.headerTwoText}>Get paid</h2>
                        <p>Enjoy fast, easy and secure payments.</p>
                    </div>
                    <div className={styles.steps}>
                        <h1><span className={styles.highlightText}>3.</span></h1>
                        <h2 className={styles.headerTwoText}>Receive guest</h2>
                        <p>Welcome your guest with a warm and personal touch</p>
                    </div>
                </div>
            </div>

            <div className={styles.whyHost}>
                <div className={styles.SecPicture}>
                    <img src={whyHostpicture} alt="House"/>
                </div>
                <div className={styles.whyHostText}>
                    <h1>Why should I host on <span className={styles.highlightText}>Domits</span>?</h1>
                    <p>At Domits, we're not just another platform, we're building a future-focused,
                    sustainable community with our Travel Innovation Labs. Our innovative approach
                    ensures that your property adds meaningful value to both travelers and the
                    environment. You'll also enjoy unlimited support and personalized, modern
                    dashboards that make managing your listings easier than ever. But what truly
                    sets Domits apart is our commitment to you. You're more than just a customer or
                    data, we genuinely care about your success, and we're here every step on the way
                    to help you thrive. Hosting with Domits means aligning with deeply embedded
                    values of health, safety, and sustainability, creating a future-proof path for
                    your business.</p>
                    <button onClick={updateUserGroup} className={styles.nextButtons}><a href="#Register" onClick={(e) => handleSmoothScroll(e, 'Register')}>Start hosting</a></button>

                </div>
            </div>

            <div className={styles.simpleSafe}>
                <div className={styles.simpleSafeAll}>
                    <h1>Register your property <span className={styles.highlightText}>simple</span> and <span className={styles.highlightText}>safe</span></h1>
                    <div className={styles.SimpleSafeAllCards}>
                        <div className={styles.cardFirstHalf}>
                            <div className={styles.simpleSafeCards}>
                                <img src={verifiedLogo} alt="verified logo"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>Verified  guests</h3>
                                    <p>We verify guest with email address, phone, a personal message and payments with our partner Stripe.</p>
                                </div>
                            </div>
                            <div className={styles.simpleSafeCards}>
                                <img src={rulesLogo} alt="houserules logo"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>Your own house rules</h3>
                                    <p>Let your potential guests know your house rules. They must agree in order to book.</p>
                                </div>
                            </div>
                            <div className={styles.simpleSafeCards}>
                                <img src={approveLogo} alt="approve logo"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>Choose how you want to receive your bookings</h3>
                                    <p>You can allow your guests to book directly.</p>
                                </div>
                            </div>
                        </div>
                        <div className={styles.cardSecondHalf}>
                            <div className={styles.simpleSafeCards}>
                                <img src={banknoteLogo} alt="banknote"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>receive payments regularly and securely</h3>
                                    <p>You are guaranteed to be paid and can rely on fraud protection with our payments</p>
                                </div>
                            </div>
                            <div className={styles.simpleSafeCards}>
                                <img src={supportLogo} alt="support logo"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>Dedicated support</h3>
                                    <p>Our rental expert team is available to assist you with any questions or issues, ensures a smooth hassle-free experience</p>
                                </div>
                            </div>
                            <div className={styles.simpleSafeCards}>
                                <img src={internationalLogo} alt="internnational logo"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>International renting</h3>
                                    <p>You rent out your holiday home on an international market. This makes the chances of renting of out your holiday home even greater</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.clientReviewMobile}>
            <h1>What others say about <span className={styles.highlightText}>Domits</span></h1>
            <Slider
                dots={true}
                infinite={true}
                speed={500}
                slidesToShow={1}
                slidesToScroll={1}
                autoplay={true}
                autoplaySpeed={30000}
                prevArrow={<button type="button" className="slick-prev">Previous</button>}
                nextArrow={<button type="button" className="slick-next">Next</button>}
            >
                {reviews.map((review) => (
                    <div key={review.id} className={styles.reviewSlide}>
                        <p className={styles.reviewText}>"{review.text}"</p>
                        <div className={styles.clientDetails}>
                            <img src={review.img} alt={review.author} />
                            <div className={styles.clientInfo}>
                                <h2>{review.author}</h2>
                                <p>{review.location}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </Slider>
        </div>


                <div className={styles.clientRevieuw}>
                <h1> What others say about <span className={styles.highlightText}>Domits</span></h1>

                <div className={styles.client_text}>
                    <span className={styles.highlightText}>"</span>
                    <p className={styles.clientText}>
                    Renting out my home through this website has been a wonderful experience.
                    The user-friendly interface and the reliable platform make it easy for me to list my property.
                    The booking system works flawlessly, and I always receive timely notifications when a reservation is made.
                    Communication with guests is smooth, allowing me to offer a personal and hassle-free service.
                    Thanks to this website, I am confident that my home is in good hands,
                    and the positive feedback from my guests reaffirms this every time!
                    </p>
                    <span className={styles.highlightText}>"</span>
                    <div className={styles.client_content}>
                        <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="Rick Terp" />
                        <div className={styles.client_details}>
                            <h2>Rick Terp</h2>
                            <p>Host from the Netherlands</p>
                        </div>
                    </div>
                </div>

                <div className={styles.client_text}>
                    <span className={styles.highlightText}>"</span>
                    <p className={styles.clientText}>
                    Renting out my boat through this platform was a fantastic experience.
                    Everything went smoothly and professionally, from the booking to the communication with renters.
                    Perfect for boat owners!
                    </p>
                    <span className={styles.highlightText}>"</span>
                    <div className={styles.client_content}>
                        <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="Melissa Steenberk" />
                        <div className={styles.client_details}>
                            <h2>Melissa Steenberk</h2>
                            <p>Host from the Netherlands</p>
                        </div>
                    </div>
                </div>

                <div className={styles.client_text}>
                    <span className={styles.highlightText}>"</span>
                    <p className={styles.clientText}>
                    As the owner of a luxury yacht company, this platform offers us the perfect opportunity to rent out our fleet easily and efficiently.
                    From the user-friendly system to the excellent customer support, everything is flawlessly organized.
                    Our clients appreciate the quality and luxury of our yachts, and thanks to the platform, we can provide them with a hassle-free booking experience.
                    The team behind the platform ensures that our yachts receive optimal visibility for potential renters, resulting in frequent and reliable bookings.
                    A valuable asset for our business!
                    </p>
                    <span className={styles.highlightText}>"</span>
                    <div className={styles.client_content}>
                        <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="James Heck" />
                        <div className={styles.client_details}>
                            <h2>James Heck</h2>
                            <p>Owner of a luxury yacht company</p>
                        </div>
                    </div>
                </div>

                <div className={styles.client_text}>
                    <span className={styles.highlightText}>"</span>
                    <p className={styles.clientText}>
                    I recently hosted my website with Domits in the UK, and the experience has been exceptional. The platform is user-friendly,
                    allowing for quick setup and seamless integration. Speed and reliability are top-notch, with minimal downtime, ensuring my site is always accessible.
                    The customer support team is also extremely helpful, addressing any issues promptly and professionally.
                    If you're looking for a solid hosting solution in the UK, this service offers great performance, security,
                    and value for money. Highly recommended for anyone serious about a stable online presence!
                    </p>
                    <span className={styles.highlightText}>"</span>
                    <div className={styles.client_content}>
                        <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="Melissa Steenberk" />
                        <div className={styles.client_details}>
                            <h2>Jaimee Becker</h2>
                            <p>Host from UK</p>
                        </div>
                    </div>
                </div>

                <div className={styles.client_text}>
                    <span className={styles.highlightText}>"</span>
                    <p className={styles.clientText}>
                    Reliable and Efficient Hosting from Germany I recently switched to a hosting provider based in Germany,
                    and it’s been an excellent decision. The platform is fast and stable, offering great performance with little to no downtime.
                    The setup process was straightforward, and the service provides excellent security features,
                    which is especially important for websites dealing with sensitive data.
                    The German-based servers have shown impressive speed for both local and international visitors,
                    making it a fantastic choice for businesses or personal websites looking for reliability and performance.
                    Highly recommended for those seeking a strong hosting solution from Germany!
                    </p>
                    <span className={styles.highlightText}>"</span>
                    <div className={styles.client_content}>
                        <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="Melissa Steenberk" />
                        <div className={styles.client_details}>
                            <h2>Maurice von Dorn</h2>
                            <p>Host from Germany</p>
                        </div>
                    </div>
                </div>

                <div className={styles.client_text}>
                    <span className={styles.highlightText}>"</span>
                    <p className={styles.clientText}>
                    As the owner of Amode, I’ve had the opportunity to host several websites on various platforms, and the service we provide has consistently exceeded expectations.
                    Our hosting solutions are designed to offer a seamless, high-performance experience with reliable uptime, top-notch security features, and a user-friendly interface.
                    Whether you're running a small business or a larger operation, our infrastructure is built to scale efficiently and ensure your site is always performing at its best. At Amode,
                    we prioritize customer satisfaction, and our support team is available around the clock to help with any issues that may arise.
                    We take pride in offering hosting that’s as robust as it is reliable, making us a trusted choice for clients worldwide.
                    </p>
                    <span className={styles.highlightText}>"</span>
                    <div className={styles.client_content}>
                        <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="Melissa Steenberk" />
                        <div className={styles.client_details}>
                            <h2>Laisa Feldt</h2>
                            <p>Owner at Amode</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.checkList}>
                <h1>Is your property suitable for <span className={styles.highlightText}>renting out</span>?</h1>
                <h3 className={styles.subText}>Here is the minimal requirements checklist for renting out properties</h3>
                <div className={styles.checkListItems}>
                    <div className={styles.checkListItem}>
                        <h3 className={styles.checkListItem__header}>General ✓</h3>
                        <span className={styles.checkListItem__text}>
                            The property is a fully equipped living unit that meets local rental regulations and is technically sound for renting.
                        </span>
                    </div>
                    <div className={styles.checkListItem}>
                        <h3 className={styles.checkListItem__header}>Building ✓</h3>
                        <span className={styles.checkListItem__text}>
                            The building's exterior, windows, doors, and common areas are well-maintained, and the heating system provides sufficient warmth and hot water.
                        </span>
                    </div>
                    <div className={styles.checkListItem}>
                        <h3 className={styles.checkListItem__header}>Furnishing ✓</h3>
                        <span className={styles.checkListItem__text}>
                            The furnishing is in good condition, with safe electrical outlets, proper lighting, and available cleaning materials.
                        </span>
                    </div>
                    <div className={styles.checkListItem}>
                        <h3 className={styles.checkListItem__header}>Bedrooms ✓</h3>
                        <span className={styles.checkListItem__text}>
                            The bedroom is equipped with intact beds, clean mattresses, and properly sized bedding.
                        </span>
                    </div>
                    <div className={styles.checkListItem}>
                        <h3 className={styles.checkListItem__header}>Kitchen ✓</h3>
                        <span className={styles.checkListItem__text}>
                            The kitchen is fully equipped with functioning appliances, cooking tools, and clean dishware.
                        </span>
                    </div>
                    <div className={styles.checkListItem}>
                        <h3 className={styles.checkListItem__header}>Pool and Jacuzzi ✓</h3>
                        <span className={styles.checkListItem__text}>
                            The pool and Jacuzzi are professionally installed and maintained regularly.
                        </span>
                    </div>
                    <div className={styles.checkListItem}>
                        <h3 className={styles.checkListItem__header}>Surroundings ✓</h3>
                        <span className={styles.checkListItem__text}>
                            The outdoor areas are well-maintained, with paths and parking kept clear during winter.
                        </span>
                    </div>
                    <div className={styles.checkListItem}>
                        <h3 className={styles.checkListItem__header}>Safety ✓</h3>
                        <span className={styles.checkListItem__text}>
                            The property meets safety standards with functional smoke detectors, secured balconies, safe playgrounds, and clear access paths.
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.faq}>
                <div className={styles.faq__header}>
                    <img src={supportLogo} alt='support'/>
                    <h1>Answers to <span className={styles.highlightText}>your</span> questions</h1>
                </div>
                <div className={styles.faq__list}>
                    {faqs.map((faq, index) => (
                        <FaqItem
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={faq.isOpen}
                            toggleOpen={() => toggleOpen(index)}
                        />
                    ))}
                </div>
            </div>

            <div className={styles.personal__advice}>
                <div className={styles.personal__advice__left}>
                    <h1>Free personal advice from our <span className={styles.highlightText}>rental expert team</span></h1>
                    <h3>Our expert team is ready for support!</h3>
                    <button className={styles.nextButtons}> <a href='/contact'>Talk to a specialist</a></button>
                </div>
                <img src={PersonalAdvice} alt='personalAdvice'/>
            </div>
        </main>
    );
}

export default Landing;
