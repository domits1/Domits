import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp } from "../../pages/landingpage/utils/animations";

const RegionCard = ({ item, link = "/home", useMotion = false }) => {
  const content = (
    <Link
      to={link}
      className="region-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <img src={item.img} alt={item.name} />
      <div className="gallery-overlay">
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <span>200+ properties</span>
      </div>
    </Link>
  );

  return useMotion ? (
    <motion.div variants={fadeUp}>{content}</motion.div>
  ) : (
    content
  );
};

RegionCard.propTypes = {
  item: PropTypes.shape({
    img: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
  }).isRequired,
  link: PropTypes.string,
  useMotion: PropTypes.bool,
};

export default RegionCard;