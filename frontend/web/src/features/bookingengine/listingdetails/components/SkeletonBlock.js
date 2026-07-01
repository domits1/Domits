import PropTypes from "prop-types";

const SkeletonBlock = ({
  width = "100%",
  height = 16,
  borderRadius = 6,
  style = {},
  className = "",
}) => (
  <span
    aria-hidden="true"
    className={className}
    style={{
      display: "block",
      width,
      height,
      borderRadius,
      background: "linear-gradient(90deg, #eef1f4 0%, #f7f8fa 48%, #eef1f4 100%)",
      ...style,
    }}
  />
);

SkeletonBlock.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  borderRadius: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  style: PropTypes.object,
  className: PropTypes.string,
};

export default SkeletonBlock;
