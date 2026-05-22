import { useState, useEffect, useContext } from "react";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaUserCheck, FaHeadset, FaAward, FaTag, FaHome, FaDollarSign } from "react-icons/fa";
import { SearchBar } from "../../components/base/SearchBar";
import SkeletonLoader from "../../components/base/SkeletonLoader";
import AccommodationCard from "./AccommodationCard";
import {
  buildGuarantees,
  buildHostSection,
  hostImage,
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
import RegionCard from "./RegionCard";
import PropTypes from "prop-types";
import FlowContext from "../../services/FlowContext";
import { getHostLoginPath, startHostingFlow } from "../../utils/hostFlow";

const contentByLanguage = { en, nl, de, es };

const RegionBlock = ({
  title,
  subtitle,
  items,
  bg = "green",
  slice,
  linkBuilder,
  footerText,
  navigate,
}) => {
  return (
    <motion.div
      className={`region-block ${bg}`}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <motion.div className="region-header" variants={fadeUp}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </motion.div>

      <div className="regions-grid">
        {(slice ? items.slice(0, slice) : items).map((item) => (
          <RegionCard
            key={item.name}
            item={item}
            link={linkBuilder ? linkBuilder(item) : "/home"}
          />
        ))}
      </div>

      <button className="region-footer" onClick={() => navigate("/home")}>
        {footerText}
      </button>
    </motion.div>
  );
};

RegionBlock.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
  PropTypes.shape({
    name: PropTypes.string.isRequired,
    img: PropTypes.string,
    description: PropTypes.string,
  })
).isRequired,
  bg: PropTypes.string,
  slice: PropTypes.number,
  linkBuilder: PropTypes.func,
  footerText: PropTypes.string.isRequired,
  navigate: PropTypes.func.isRequired,
};

const Homepage = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [allAccommodations, setAllAccommodations] = useState([]);
  const [lastEvaluatedKeyCreatedAt, setLastEvaluatedKeyCreatedAt] = useState(null);
  const [lastEvaluatedKeyId, setLastEvaluatedKeyId] = useState(null);
  const { language } = useContext(LanguageContext);
  const langContent = contentByLanguage[language];
  const homePageContent = langContent?.homepage;

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

  const guarantees = buildGuarantees(homePageContent.features);
  const hostSection = buildHostSection(langContent.hostSection);
  const rb = langContent.regionBlocks;

  const navigate = useNavigate();
  
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();

      setIsAuthenticated(true);
      setGroup(user.attributes["custom:group"] || "");
    } catch {
      setIsAuthenticated(false);
      setGroup("");
    }
  };

  const handleHostButtonClick = () =>
    startHostingFlow({
      isAuthenticated,
      group,
      navigate,
      setFlowState,
      unauthenticatedPath: getHostLoginPath(),
    });

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
      case "money": return <FaDollarSign />;
      case "shield": return <FaShieldAlt />;
      case "home": return <FaHome />;
      default: return null;
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
              <div className="icon-circle"><FaShieldAlt /></div>
              <h4>{homePageContent.features.securePayments}</h4>
              <p>{homePageContent.features.securePaymentsDesc}</p>
            </motion.div>

            <motion.div className="domits-iconTextGroup" variants={fadeUp}>
              <div className="icon-circle"><FaUserCheck /></div>
              <h4>{homePageContent.features.verifiedGuest}</h4>
              <p>{homePageContent.features.verifiedDesc}</p>
            </motion.div>

            <motion.div className="domits-iconTextGroup" variants={fadeUp}>
              <div className="icon-circle"><FaHeadset /></div>
              <h4>{homePageContent.features.quickPhone}</h4>
              <p>{homePageContent.features.quickSupportDesc}</p>
            </motion.div>

            <motion.div className="domits-iconTextGroup" variants={fadeUp}>
              <div className="icon-circle"><FaAward /></div>
              <h4>{homePageContent.features.qualityGuarantee}</h4>
              <p>{homePageContent.features.qualityDesc}</p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div className="domits-popularAccommodation" initial="hidden" animate="visible">
          <motion.h3 variants={fadeUp} className="domits-subHead">
            {homePageContent.sections.trendingNow}
          </motion.h3>

          <div className="domits-accommodationGroup">
            {propertyLoading ? (
              new Array(6).fill(null).map(() => <SkeletonLoader key={crypto.randomUUID()} />)
            ) : (
              allAccommodations.slice(0, 3).map((property) => (
                <motion.div 
                  key={property.id} 
                  variants={fadeUp}
                >
                  <AccommodationCard 
                    accommodation={property}
                    variant="homepage"
                    onClick={(e, id) => {
                      if (
                        e.target.closest(".swiper-button-next") ||
                        e.target.closest(".swiper-button-prev") 
                      ) {
                        e.stopPropagation();
                        return;
                      }

                      navigate(`/listingdetails?ID=${encodeURIComponent(id)}`);
                    }} 
                  />
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <div className="regions-wrapper">
          <RegionBlock
            title={rb.europe.title}
            subtitle={rb.europe.subtitle}
            items={countries}
            slice={3}
            bg="green"
            footerText={rb.europe.footer}
            navigate={navigate}
          />

          <RegionBlock
            title={rb.asia.title}
            subtitle={rb.asia.subtitle}
            items={asiaCountries}
            bg="light"
            footerText={rb.asia.footer}
            navigate={navigate}
          />

          <RegionBlock
            title={rb.caribbean.title}
            subtitle={rb.caribbean.subtitle}
            items={caribbeanCountries}
            bg="green"
            footerText={rb.caribbean.footer}
            navigate={navigate}
          />

          <RegionBlock
            title={rb.ski.title}
            subtitle={rb.ski.subtitle}
            items={skiCountries}
            slice={3}
            bg="light"
            footerText={rb.ski.footer}
            navigate={navigate}
          />
        </div>

        <RegionBlock
          title={rb.seasons.title}
          subtitle={rb.seasons.subtitle}
          items={seasons}
          slice={3}
          bg="green"
          footerText={rb.seasons.footer}
          navigate={navigate}
        />

        <RegionBlock
          title={rb.interests.title}
          subtitle={rb.interests.subtitle}
          items={interests}
          slice={3}
          bg="light"
          footerText={rb.interests.footer}
          navigate={navigate}
        />

        <RegionBlock
          title={rb.groups.title}
          subtitle={rb.groups.subtitle}
          items={groups}
          slice={3}
          bg="green"
          footerText={rb.groups.footer}
          navigate={navigate}
        />

        <motion.div className="guarantee-section" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp}>{langContent.guarantees.sectionTitle}</motion.h2>
          <motion.p variants={fadeUp}>{langContent.guarantees.sectionSubtitle}</motion.p>

          <div className="guarantee-grid">
            {guarantees.map((item) => (
              <motion.div className="guarantee-card" key={item.icon} variants={fadeUp}>
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
                  <motion.div className="feature" key={f.icon} variants={fadeUp}>
                    <div className="icon">{getHostIcon(f.icon)}</div>
                    <div>
                      <h4>{f.title}</h4>
                      <span>{f.text}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button className="host-btn" onClick={handleHostButtonClick}>
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
