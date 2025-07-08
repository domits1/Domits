import React, { useState, useEffect, useContext, useRef } from "react";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";
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
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";
import ReactMarkDown from "react-markdown";

const contentByLanguage = {
  en,
  nl,
  de,
  es,
};

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

  // `MapsToMessages` is not used in FaqItem, but was in the original code.
  // Keeping it as is, but it might be dead code if not called elsewhere.
  // const navigateToMessages = () => {
  //   if (currentView === "host") {
  //     navigate("/hostdashboard/chat");
  //   } else {
  //     navigate("/guestdashboard/chat");
  //   }
  // };

  return (
    <div className="landing__faq" onClick={toggleOpen}>
      <div className="landing__faq__body">
        <span className="landing__faq__question">{question}</span>
        <span className="landing__faq__arrow">{isOpen ? "▲" : "▼"}</span>
      </div>
      <div
        className="landing__faq__answer"
        style={{ maxHeight: isOpen ? `${height}px` : "0", overflow: "hidden" }}
        ref={answerRef}>
        {answer}
      </div>
    </div>
  );
};
function Landing() {
  const { language } = useContext(LanguageContext);
  const landingContent = contentByLanguage[language]?.landing;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [group, setGroup] = useState("");
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState([
    {
      question: `${landingContent.answerTo.host.title}`,
      answer: <>{landingContent.answerTo.host.description}</>,
      isOpen: false,
    },
    {
      question: `${landingContent.answerTo.how.title}`,
      answer: (
        <>
          {landingContent.answerTo.host.description}{" "}
          <span onClick={!isAuthenticated ? () => navigate("/register") : ""}>
            {landingContent.answerTo.host.becomeHost}
          </span>{" "}
          {landingContent.answerTo.host.description2}
        </>
      ),
      isOpen: false,
    },
    {
      question: `${landingContent.answerTo.manage.title}`,
      answer: <>{landingContent.answerTo.manage.description}</>,
      isOpen: false,
    },
    {
      question: `${landingContent.answerTo.payout.title}`,
      answer: <>{landingContent.answerTo.payout.description}</>,
      isOpen: false,
    },
    {
      question: `${landingContent.answerTo.calendar.title}`,
      answer: <>{landingContent.answerTo.calendar.description}</>,
      isOpen: false,
    },
  ]);

  const reviews = [
    {
      id: 1,
      text: "Renting out my home through this website has been a wonderful experience. The user-friendly interface and the reliable platform make it easy for me to list my property. The booking system works flawlessly, and I always receive timely notifications when a reservation is made. Communication with guests is smooth, allowing me to offer a personal and hassle-free service. Thanks to this website, I am confident that my home is in good hands, and the positive feedback from my guests reaffirms this every time!",
      author: "Rick Terp",
      location: "Host from the Netherlands",
      img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096",
    },
    {
      id: 2,
      text: "Renting out my boat through this platform was a fantastic experience. Everything went smoothly and professionally, from the booking to the communication with renters. Perfect for boat owners!",
      author: "Melissa Steenberk",
      location: "Host from the Netherlands",
      img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096",
    },
    {
      id: 3,
      text: "As the owner of a luxury yacht company, this platform offers us the perfect opportunity to rent out our fleet easily and efficiently. From the user-friendly system to the excellent customer support, everything is flawlessly organized. Our clients appreciate the quality and luxury of our yachts, and thanks to the platform, we can provide them with a hassle-free booking experience. The team behind the platform ensures that our yachts receive optimal visibility for potential renters, resulting in frequent and reliable bookings. A valuable asset for our business!",
      author: "James Heck",
      location: "Owner of a luxury yacht company",
      img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096",
    },
    {
      id: 4,
      text: "I recently hosted my website with Domits in the UK, and the experience has been exceptional. The platform is user-friendly, allowing for quick setup and seamless integration. Speed and reliability are top-notch, with minimal downtime, ensuring my site is always accessible. The customer support team is also extremely helpful, addressing any issues promptly and professionally. If you're looking for a solid hosting solution in the UK, this service offers great performance, security, and value for money. Highly recommended for anyone serious about a stable online presence!",
      author: "Jaimee Becker",
      location: "Host from UK",
      img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096",
    },
    {
      id: 5,
      text: "Reliable and Efficient Hosting from Germany I recently switched to a hosting provider based in Germany, and it’s been an excellent decision. The platform is fast and stable, offering great performance with little to no downtime. The setup process was straightforward, and the service provides excellent security features, which is especially important for websites dealing with sensitive data. The German-based servers have shown impressive speed for both local and international visitors, making it a fantastic choice for businesses or personal websites looking for reliability and performance. Highly recommended for those seeking a strong hosting solution from Germany!",
      author: "Maurice von Dorn",
      location: "Host from Germany",
      img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096",
    },
    {
      id: 6,
      text: "As the owner of Amode, I’ve had the opportunity to host several websites on various platforms, and the service we provide has consistently exceeded expectations. Our hosting solutions are designed to offer a seamless, high-performance experience with reliable uptime, top-notch security features, and a user-friendly interface. Whether you're running a small business or a larger operation, our infrastructure is built to scale efficiently and ensure your site is always performing at its best. At Amode, we prioritize customer satisfaction, and our support team is available around the clock to help with any issues that may arise. We take pride in offering hosting that’s as robust as it is reliable, making us a trusted choice for clients worldwide.",
      author: "Laisa Feldt",
      location: "Owner at Amode",
      img: "https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096",
    },
  ];

  const toggleOpen = (index) => {
    const updatedFaqs = faqs.map((faq, i) => (i === index ? { ...faq, isOpen: !faq.isOpen } : faq));
    setFaqs(updatedFaqs);
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      setIsAuthenticated(true);
      setGroup(user.attributes["custom:group"]);
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsAuthenticated(false);
    }
  };

  const updateUserGroup = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      let result = await Auth.updateUserAttributes(user, {
        "custom:group": "Host",
      });
      if (result === "SUCCESS") {
        console.log("User group updated successfully");
        setGroup("Host");
        navigate("/hostdashboard");
      } else {
        console.error("Failed to update user group");
      }
    } catch (error) {
      console.error("Error updating user group:", error);
    }
  };

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      console.error(`Target element with id "${targetId}" not found.`);
    }
  };

  return (
    <main className="container">
      <div className="firstSection">
        <div className="MainText">
          <h1 className="List_Names">
            {landingContent.list}{" "}
            <span className="textContainer">
              <div className="textAnimated">
                <span>{landingContent.house}</span>
                <span>{landingContent.camper}</span>
                <span>{landingContent.boat}</span>
              </div>
            </span>
            <br />
            {landingContent.forFree}
          </h1>
          <p>{landingContent.description}</p>

          <button className="nextregister">
            <a href="#Register" onClick={(e) => handleSmoothScroll(e, "Register")}>
              {landingContent.startHosting}
            </a>
          </button>
        </div>

        <div className="firstPicture">
          <img src={MainTextpicture} alt="House" />
        </div>
      </div>

      <div className="iconsContainer">
        <div className="iconsContainerText">
          <div className="iconTextGroup">
            <img src={bill} alt="bill"></img>
            <p>{landingContent.secure}</p>
          </div>
          <div className="iconTextGroup">
            <img src={verifiedLogo} alt="verified logo"></img>
            <p>{landingContent.verified}</p>
          </div>
          <div className="iconTextGroup">
            <img src={question} alt="question"></img>
            <p>{landingContent.quick}</p>
          </div>
          <div className="iconTextGroup">
            <img src={checkMark} alt="checkMark"></img>
            <p>{landingContent.guarantee}</p>
          </div>
        </div>
      </div>

      <div className="hostForm">
        <div className="hostForm_text">
          <h1 className="hostForm_innerText">{"Calculate Your Rental Potential"}</h1>
        </div>
      </div>

      <div className="easyHosting">
        <div className="easyHosting_text">
          <h1>
            {" "}
            {landingContent.hosting.title}
            <span className="highlightText">{landingContent.hosting.domits}</span> {landingContent.hosting.title2}
            <span className="highlightText">{landingContent.hosting.easier}</span>.
          </h1>
          <h3>{landingContent.hosting.subtitle}</h3>
        </div>
        <div className="threeSteps">
          <div className="steps">
            <h1>
              <span className="highlightText">{landingContent.hosting.first.one}</span>
            </h1>
            <h2 className="headerTwoText">{landingContent.hosting.first.title}</h2>
            <p>{landingContent.hosting.first.description}</p>
          </div>
          <div className="steps">
            <h1>
              <span className="highlightText">{landingContent.hosting.second.two}</span>
            </h1>
            <h2 className="headerTwoText">{landingContent.hosting.second.title}</h2>
            <p>{landingContent.hosting.second.description}</p>
          </div>
          <div className="steps">
            <h1>
              <span className="highlightText">{landingContent.hosting.third.three}</span>
            </h1>
            <h2 className="headerTwoText">{landingContent.hosting.third.title}</h2>
            <p>{landingContent.hosting.third.description}</p>
          </div>
        </div>
      </div>

      <div className="whyHost">
        <div className="SecPicture">
          <img src={whyHostpicture} alt="House" />
        </div>
        <div className="whyHostText">
          <h1>
            {landingContent.why.title} <span className="highlightText">{landingContent.why.domits}</span>?
          </h1>
          <p>{landingContent.why.description}</p>
          <button onClick={updateUserGroup} className="nexthost">
            <a href="#Register" onClick={(e) => handleSmoothScroll(e, "Register")}>
              {landingContent.why.btnHosting}
            </a>
          </button>
        </div>
      </div>

      <div className="simpleSafe">
        <div className="simpleSafeAll">
          <h1>
            {landingContent.register.title} <span className="highlightText">{landingContent.register.simple}</span>
            {landingContent.register.and} <span className="highlightText">{landingContent.register.safe}</span>
          </h1>
          <div className="SimpleSafeAllCards">
            <div className="cardFirstHalf">
              <div className="simpleSafeCards">
                <img src={verifiedLogo} alt="verified logo"></img>
                <div className="safeMiniText">
                  <h3>{landingContent.register.verified.title}</h3>
                  <p>{landingContent.register.verified.description}</p>
                </div>
              </div>
              <div className="simpleSafeCards">
                <img src={rulesLogo} alt="houserules logo"></img>
                <div className="safeMiniText">
                  <h3>{landingContent.register.rules.title}</h3>
                  <p>{landingContent.register.rules.description}</p>
                </div>
              </div>
              <div className="simpleSafeCards">
                <img src={approveLogo} alt="approve logo"></img>
                <div className="safeMiniText">
                  <h3>{landingContent.register.how.title}</h3>
                  <p>{landingContent.register.how.description}</p>
                </div>
              </div>
            </div>
            <div className="cardSecondHalf">
              <div className="simpleSafeCards">
                <img src={banknoteLogo} alt="banknote"></img>
                <div className="safeMiniText">
                  <h3>{landingContent.register.payments.title}</h3>
                  <p>{landingContent.register.payments.description}</p>
                </div>
              </div>
              <div className="simpleSafeCards">
                <img src={supportLogo} alt="support logo"></img>
                <div className="safeMiniText">
                  <h3>{landingContent.register.support.title}</h3>
                  <p>{landingContent.register.support.description}</p>
                </div>
              </div>
              <div className="simpleSafeCards">
                <img src={internationalLogo} alt="internnational logo"></img>
                <div className="safeMiniText">
                  <h3>{landingContent.register.renting.title}</h3>
                  <p>{landingContent.register.renting.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="clientReviewMobile">
        <h1>
          {landingContent.othersSay.title} <span className="highlightText">{landingContent.othersSay.domits}</span>
        </h1>
        <Slider
          dots={true}
          infinite={true}
          speed={500}
          slidesToShow={1}
          slidesToScroll={1}
          autoplay={true}
          autoplaySpeed={30000}
          prevArrow={
            <button type="button" className="slick-prev">
              Previous
            </button>
          }
          nextArrow={
            <button type="button" className="slick-next">
              Next
            </button>
          }>
          {reviews.map((review) => (
            <div key={review.id} className="reviewSlide">
              <p className="reviewText">"{review.text}"</p>
              <div className="clientDetails">
                <img src={review.img} alt={review.author} />
                <div className="clientInfo">
                  <h2>{review.author}</h2>
                  <p>{review.location}</p>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      <div className="clientRevieuw">
        <h1>
          {" "}
          {landingContent.othersSay.title} <span className="highlightText">{landingContent.othersSay.domits}</span>
        </h1>

        <div className="client_text">
          <span className="highlightText">"</span>
          <p className="clientText">
            Renting out my home through this website has been a wonderful experience. The user-friendly interface and
            the reliable platform make it easy for me to list my property. The booking system works flawlessly, and I
            always receive timely notifications when a reservation is made. Communication with guests is smooth,
            allowing me to offer a personal and hassle-free service. Thanks to this website, I am confident that my home
            is in good hands, and the positive feedback from my guests reaffirms this every time!
          </p>
          <span className="highlightText">"</span>
          <div className="client_content">
            <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="Rick Terp" />
            <div className="client_details">
              <h2>Rick Terp</h2>
              <p>Host from the Netherlands</p>
            </div>
          </div>
        </div>

        <div className="client_text">
          <span className="highlightText">"</span>
          <p className="clientText">
            Renting out my boat through this platform was a fantastic experience. Everything went smoothly and
            professionally, from the booking to the communication with renters. Perfect for boat owners!
          </p>
          <span className="highlightText">"</span>
          <div className="client_content">
            <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="Melissa Steenberk" />
            <div className="client_details">
              <h2>Melissa Steenberk</h2>
              <p>Host from the Netherlands</p>
            </div>
          </div>
        </div>

        <div className="client_text">
          <span className="highlightText">"</span>
          <p className="clientText">
            As the owner of a luxury yacht company, this platform offers us the perfect opportunity to rent out our
            fleet easily and efficiently. From the user-friendly system to the excellent customer support, everything is
            flawlessly organized. Our clients appreciate the quality and luxury of our yachts, and thanks to the
            platform, we can provide them with a hassle-free booking experience. The team behind the platform ensures
            that our yachts receive optimal visibility for potential renters, resulting in frequent and reliable
            bookings. A valuable asset for our business!
          </p>
          <span className="highlightText">"</span>
          <div className="client_content">
            <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="James Heck" />
            <div className="client_details">
              <h2>James Heck</h2>
              <p>Owner of a luxury yacht company</p>
            </div>
          </div>
        </div>

        <div className="client_text">
          <span className="highlightText">"</span>
          <p className="clientText">
            I recently hosted my website with Domits in the UK, and the experience has been exceptional. The platform is
            user-friendly, allowing for quick setup and seamless integration. Speed and reliability are top-notch, with
            minimal downtime, ensuring my site is always accessible. The customer support team is also extremely
            helpful, addressing any issues promptly and professionally. If you're looking for a solid hosting solution
            in the UK, this service offers great performance, security, and value for money. Highly recommended for
            anyone serious about a stable online presence!
          </p>
          <span className="highlightText">"</span>
          <div className="client_content">
            <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="Melissa Steenberk" />
            <div className="client_details">
              <h2>Jaimee Becker</h2>
              <p>Host from UK</p>
            </div>
          </div>
        </div>

        <div className="client_text">
          <span className="highlightText">"</span>
          <p className="clientText">
            Reliable and Efficient Hosting from Germany I recently switched to a hosting provider based in Germany, and
            it’s been an excellent decision. The platform is fast and stable, offering great performance with little to
            no downtime. The setup process was straightforward, and the service provides excellent security features,
            which is especially important for websites dealing with sensitive data. The German-based servers have shown
            impressive speed for both local and international visitors, making it a fantastic choice for businesses or
            personal websites looking for reliability and performance. Highly recommended for those seeking a strong
            hosting solution from Germany!
          </p>
          <span className="highlightText">"</span>
          <div className="client_content">
            <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="Melissa Steenberk" />
            <div className="client_details">
              <h2>Maurice von Dorn</h2>
              <p>Host from Germany</p>
            </div>
          </div>
        </div>

        <div className="client_text">
          <span className="highlightText">"</span>
          <p className="clientText">
            As the owner of Amode, I’ve had the opportunity to host several websites on various platforms, and the
            service we provide has consistently exceeded expectations. Our hosting solutions are designed to offer a
            seamless, high-performance experience with reliable uptime, top-notch security features, and a user-friendly
            interface. Whether you're running a small business or a larger operation, our infrastructure is built to
            scale efficiently and ensure your site is always performing at its best. At Amode, we prioritize customer
            satisfaction, and our support team is available around the clock to help with any issues that may arise. We
            take pride in offering hosting that’s as robust as it is reliable, making us a trusted choice for clients
            worldwide.
          </p>
          <span className="highlightText">"</span>
          <div className="client_content">
            <img src="https://pbs.twimg.com/media/FNA5U8jXwAURgR-?format=jpg&name=4096x4096" alt="Melissa Steenberk" />
            <div className="client_details">
              <h2>Laisa Feldt</h2>
              <p>Owner at Amode</p>
            </div>
          </div>
        </div>
      </div>

      <div className="checkList">
        <h1>
          {landingContent.rentingOut.title} <span className="highlightText">{landingContent.rentingOut.rent}</span>?
        </h1>
        <h3 className="subText">{landingContent.rentingOut.description}</h3>
        <div className="checkListItems">
          <div className="checkListItem">
            <h3 className="checkListItem__header">{landingContent.rentingOut.general.title}</h3>
            <span className="checkListItem__text">{landingContent.rentingOut.general.description}</span>
          </div>
          <div className="checkListItem">
            <h3 className="checkListItem__header">{landingContent.rentingOut.building.title}</h3>
            <span className="checkListItem__text">{landingContent.rentingOut.building.description}</span>
          </div>
          <div className="checkListItem">
            <h3 className="checkListItem__header">{landingContent.rentingOut.furnishing.title}</h3>
            <span className="checkListItem__text">{landingContent.rentingOut.furnishing.description}</span>
          </div>
          <div className="checkListItem">
            <h3 className="checkListItem__header">{landingContent.rentingOut.bedroom.title}</h3>
            <span className="checkListItem__text">{landingContent.rentingOut.bedroom.description}</span>
          </div>
          <div className="checkListItem">
            <h3 className="checkListItem__header">{landingContent.rentingOut.kitchen.title}</h3>
            <span className="checkListItem__text">{landingContent.rentingOut.kitchen.description}</span>
          </div>
          <div className="checkListItem">
            <h3 className="checkListItem__header">{landingContent.rentingOut.pool.title}</h3>
            <span className="checkListItem__text">{landingContent.rentingOut.pool.description}</span>
          </div>
          <div className="checkListItem">
            <h3 className="checkListItem__header">{landingContent.rentingOut.surroundings.title}</h3>
            <span className="checkListItem__text">{landingContent.rentingOut.surroundings.description}</span>
          </div>
          <div className="checkListItem">
            <h3 className="checkListItem__header">{landingContent.rentingOut.safety.title}</h3>
            <span className="checkListItem__text">{landingContent.rentingOut.safety.description}</span>
          </div>
        </div>
      </div>

      <div className="faq">
        <div className="faq__header">
          <img src={supportLogo} alt="support" />
          <h1>
            {landingContent.answerTo.title}
            <span className="highlightText">{landingContent.answerTo.your}</span> {landingContent.answerTo.question}
          </h1>
        </div>
        <div className="faq__list">
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

      <div className="personal__advice">
        <div className="personal__advice__left">
          <h1>
            {landingContent.advice.title} <span className="highlightText">{landingContent.advice.team}</span>
          </h1>
          <h3>{landingContent.advice.subtitle}</h3>
          <button className="nextadvice">
            {" "}
            <a href="/contact">{landingContent.advice.talk}</a>
          </button>
        </div>
        <img src={PersonalAdvice} alt="personalAdvice" />
      </div>
    </main>
  );
}

export default Landing;
