import { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaShieldAlt, FaUserCheck, FaHeadset, FaAward, FaTag, FaHome, FaDollarSign  } from "react-icons/fa";
import { SearchBar } from "../../components/base/SearchBar";
import SkeletonLoader from "../../components/base/SkeletonLoader";
import AccommodationCard from "./AccommodationCard";
import {
  guarantees,
  hostImage,
  hostSection,
  categories as groups,
  buildHomepageLists,
  S3_URL
} from "./store/constants";
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../../pages/landingpage/utils/animations.js";
import { FetchAllPropertyTypes } from "./services/fetchProperties";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const Homepage = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [allAccommodations, setAllAccommodations] = useState([]);
  const [lastEvaluatedKeyCreatedAt, setLastEvaluatedKeyCreatedAt] = useState(null);
  const [lastEvaluatedKeyId, setLastEvaluatedKeyId] = useState(null);
  const { language } = useContext(LanguageContext);
  const homePageContent = contentByLanguage[language]?.homepage;

  const {
    countries,
    smallCountries,
    asiaCountries,
    smallAsiaCountries,
    caribbeanCountries,
    smallCaribbeanCountries,
    skiCountries,
    seasons,
    interests,
  } = buildHomepageLists(homePageContent);

  const navigate = useNavigate();

  const getIcon = (type) => {
    switch (type) {
      case "price": return <FaTag />;
      case "booking": return <FaShieldAlt />;
      case "stay": return <FaHome />;
      default: return null;
    }
  };

  const getHostIcon = (type) => {
  switch (type) {
    case "money":
      return <FaDollarSign />;
    case "shield":
      return <FaShieldAlt />;
    case "home":
      return <FaHome />;
    default:
      return null;
  }
};

  useEffect(() => {
    async function loadData() {
      setPropertyLoading(true);
      try {
        const data = await FetchAllPropertyTypes(lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId);
        if (data.lastEvaluatedKey) {
          setLastEvaluatedKeyCreatedAt(data.lastEvaluatedKey.createdAt);
          setLastEvaluatedKeyId(data.lastEvaluatedKey.id);
        }
        setAllAccommodations(data.properties.slice(0, 6));
      } catch (error) {
        console.error(error);
      } finally {
        setPropertyLoading(false);
      }
    }
    loadData();
  }, []);

  return (
  <div className="homePage-container">
    <div className="domits-homepage">

      <div className="domits-searchContainer" style={{ "--villa-background": `url(${S3_URL}/Images/villaHomepage.webp)` }}>
        <div className="domits-searchTextCon">
          <h1 className="domits-searchText">{homePageContent.hero.title}</h1>
          <p className="domits-searchSubtitle">{homePageContent.hero.subtitle}</p>
        </div>
        <div className="domits-searchbarCon">
          <SearchBar
            setSearchResults={setSearchResults}
            setLoading={setLoading}
            placeholderText="Search for holiday homes, boats, or campers..."
          />
        </div>
      </div>

      <motion.div
        className="domits-iconsContainer"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="domits-iconsContainerText">

          <motion.div className="domits-iconTextGroup" variants={fadeUp}>
            <div className="icon-circle">
              <FaShieldAlt />
            </div>
            <h4>Secure Payments</h4>
            <p>Your transactions are protected</p>
          </motion.div>

          <motion.div className="domits-iconTextGroup" variants={fadeUp}>
            <div className="icon-circle">
              <FaUserCheck />
            </div>
            <h4>Verified Hosts</h4>
            <p>Every property is verified</p>
          </motion.div>

          <motion.div className="domits-iconTextGroup" variants={fadeUp}>
            <div className="icon-circle">
              <FaHeadset />
            </div>
            <h4>Quick Support</h4>
            <p>24/7 customer service</p>
          </motion.div>

          <motion.div className="domits-iconTextGroup" variants={fadeUp}>
            <div className="icon-circle">
              <FaAward />
            </div>
            <h4>Quality Guarantee</h4>
            <p>Premium stays only</p>
          </motion.div>

        </div>
      </motion.div>

      <motion.div
        className="domits-popularAccommodation"
        initial="hidden"
        animate="visible"
      >
      
      <motion.h3 variants={fadeUp} className="domits-subHead">
        Trending Now
      </motion.h3>

 <div className="domits-accommodationGroup">
  {propertyLoading ? (
    new Array(6).fill(null).map((_, i) => <SkeletonLoader key={`skeleton-${i}`} />)
  ) : (
    allAccommodations.slice(0, 3).map((property) => (
      <Link
        key={property.property.id}
        to={`/listingdetails?ID=${encodeURIComponent(property.property.id)}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
  <motion.div variants={fadeUp}>
    <AccommodationCard accommodation={property} />
  </motion.div>
</Link>
    ))
  )}
</div>
</motion.div>

<div className="regions-wrapper">

  <motion.div className="region-block green" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
    <motion.div className="region-header" variants={fadeUp}>
      <h2>Europe</h2>
      <p>Discover luxury stays across European destinations</p>
    </motion.div>

    <div className="regions-grid">
      {countries.slice(0, 3).map((item) => (
     <Link
        className="region-card"
        key={item.name}
        to={`/search?destination=${encodeURIComponent(item.name)}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
      <img src={item.img} alt={item.name} />

  <div className="gallery-overlay">
    <h3>{item.name}</h3>
    <p>{item.description}</p>
    <span>200+ properties</span>
  </div>
</Link>
      ))}
    </div>

    <button
      className="region-footer"
      onClick={() => navigate("/home")}
    >
      Explore all countries in europe →
    </button>
  </motion.div>

  <motion.div className="region-block light" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
    <motion.div className="region-header" variants={fadeUp}>
      <h2>Asia</h2>
      <p>Explore exotic Asian retreats and modern metropolises</p>
    </motion.div>

    <div className="regions-grid">
      {asiaCountries.map((item) => (
        <motion.div className="region-card" key={item.name} variants={fadeUp}>
  <Link
    to="/home"
    style={{ textDecoration: "none", color: "inherit" }}
  >
    <img src={item.img} alt={item.name} />

    <div className="gallery-overlay">
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      <span>200+ properties</span>
    </div>
  </Link>
</motion.div>
      ))}
    </div>

    <button
      className="region-footer"
      onClick={() => navigate("/home")}
    >
      Explore all countries in Asia →
    </button>
  </motion.div>

  <motion.div className="region-block green" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
    <motion.div className="region-header" variants={fadeUp}>
      <h2>Islands in the Caribbean</h2>
      <p>Paradise awaits in these tropical havens</p>
    </motion.div>

    <div className="regions-grid">
      {caribbeanCountries.map((item) => (
         <motion.div className="region-card" key={item.name} variants={fadeUp}>
  <Link
    to="/home"
    style={{ textDecoration: "none", color: "inherit" }}
  >
    <img src={item.img} alt={item.name} />

    <div className="gallery-overlay">
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      <span>200+ properties</span>
    </div>
  </Link>
</motion.div>
      ))}
    </div>

    <button
      className="region-footer"
      onClick={() => navigate("/home")}
    >
      Explore all countries in the caribbean →
    </button>
  </motion.div>

  <motion.div className="region-block light" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
    <motion.div className="region-header" variants={fadeUp}>
      <h2>Popular Ski Destinations</h2>
      <p>World-class slopes and cozy mountain chalets</p>
    </motion.div>

    <div className="regions-grid">
      {skiCountries.slice(0, 3).map((item) => (
        <motion.div className="region-card" key={item.name} variants={fadeUp}>
  <Link
    to="/home"
    style={{ textDecoration: "none", color: "inherit" }}
  >
    <img src={item.img} alt={item.name} />

    <div className="gallery-overlay">
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      <span>200+ properties</span>
    </div>
  </Link>
</motion.div>
      ))}
    </div>

    <button
  className="region-footer"
  onClick={() => navigate("/home")}
>
      Explore all popular ski destinations →
    </button>
  </motion.div>
</div>

<motion.div className="region-block green" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  <motion.div className="region-header" variants={fadeUp}>
    <h2>Favorites by Season</h2>
    <p>Perfect properties for every time of year</p>
  </motion.div>

  <div className="regions-grid">
    {seasons.slice(0, 3).map((item) => (
      <Link
  className="region-card"
  key={item.name}
  to={`/search?destination=${encodeURIComponent(item.name)}`}
  style={{ textDecoration: "none", color: "inherit" }}
>
        <img src={item.img} alt={item.name} />
        <div className="gallery-overlay">
          <h3>{item.name}</h3>
          <p>{item.description || "Perfect stays"}</p>
          <span>200+ properties</span>
        </div>
      </Link>
    ))}
  </div>

  <button
  className="region-footer"
  onClick={() => navigate("/home")}
>
    Explore all favorites by season →
  </button>
</motion.div>

<motion.div className="region-block light" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  <motion.div className="region-header" variants={fadeUp}>
    <h2>Great Picks by Interest</h2>
    <p>Find stays that match your passions</p>
  </motion.div>

  <div className="regions-grid">
    {interests.slice(0, 3).map((item) => (
      <motion.div className="region-card" key={item.name} variants={fadeUp}>
  <Link
    to="/home"
    style={{ textDecoration: "none", color: "inherit" }}
  >
    <img src={item.img} alt={item.name} />

    <div className="gallery-overlay">
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      <span>200+ properties</span>
    </div>
  </Link>
</motion.div>
    ))}
  </div>

  <button
  className="region-footer"
  onClick={() => navigate("/home")}
>
    Explore all great picks by interest →
  </button>
</motion.div>

<motion.div className="region-block green" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  <motion.div className="region-header" variants={fadeUp}>
    <h2>Accommodations by Group</h2>
    <p>The perfect stay for your travel party</p>
  </motion.div>

  <div className="regions-grid">
    {groups.slice(0, 3).map((item) => (
      <Link
  className="region-card"
  key={item.name}
  to={`/search?destination=${encodeURIComponent(item.name)}`}
  style={{ textDecoration: "none", color: "inherit" }}
>
        <img src={item.img} alt={item.name} />
        <div className="gallery-overlay">
          <h3>{item.name}</h3>
          <p>{item.description}</p>
          <span>200+ properties</span>
        </div>
      </Link>
    ))}
  </div>

  <button
  className="region-footer"
  onClick={() => navigate("/home")}
>
    Explore all accommodations by group →
  </button>
</motion.div>

<motion.div className="guarantee-section" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  <motion.h2 variants={fadeUp}>Our Guarantees, Your Peace of Mind</motion.h2>
  <motion.p variants={fadeUp}>We stand behind every stay with our commitments to you.</motion.p>

  <div className="guarantee-grid">
    {guarantees.map((item) => (
      <motion.div className="guarantee-card" key={item.title} variants={fadeUp}>
        <div className="icon">{getIcon(item.icon)}</div>
        <h3>{item.title}</h3>
        <p>{item.text}</p>
      </motion.div>
    ))}
  </div>
</motion.div>

<motion.div className="host-section" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  <div className="host-container">

    <motion.div className="host-left" variants={fadeUp}>
      <h2>{hostSection.title}</h2>
      <p>{hostSection.description}</p>

      <div className="host-features">
        {hostSection.features.map((f) => (
          <motion.div className="feature" key={f.title} variants={fadeUp}>
            <div className="icon">{getHostIcon(f.icon)}</div>
            <div>
              <h4>{f.title}</h4>
              <span>{f.text}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <button className="host-btn">
        {hostSection.button}
      </button>
    </motion.div>

    <motion.div className="host-right" variants={fadeUp}>
      <img src={hostImage.src} alt={hostImage.alt} />

      <div className="host-stats">
        {hostSection.stats.map((s) => (
          <div key={s.label}>
            <h3>{s.value}</h3>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </motion.div>

  </div>
</motion.div>

    </div>
  </div>
);
};

export default Homepage;