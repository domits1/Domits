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