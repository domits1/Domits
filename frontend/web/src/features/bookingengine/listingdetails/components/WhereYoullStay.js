import React from "react";
import PropTypes from "prop-types";
import BedIcon from "@mui/icons-material/Bed";
import BathroomIcon from "@mui/icons-material/Bathtub";
import PeopleIcon from "@mui/icons-material/People";
import StraightenIcon from "@mui/icons-material/Straighten";
import LayersIcon from "@mui/icons-material/Layers";
import WorkIcon from "@mui/icons-material/Work";
import CategoryIcon from "@mui/icons-material/Category";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";

const DETAIL_ICONS = {
  bedroom: <BedIcon fontSize="small" />,
  bedrooms: <BedIcon fontSize="small" />,
  bed: <BedIcon fontSize="small" />,
  beds: <BedIcon fontSize="small" />,
  bathroom: <BathroomIcon fontSize="small" />,
  bathrooms: <BathroomIcon fontSize="small" />,
  bath: <BathroomIcon fontSize="small" />,
  baths: <BathroomIcon fontSize="small" />,
  guests: <PeopleIcon fontSize="small" />,
  guest: <PeopleIcon fontSize="small" />,
  size: <StraightenIcon fontSize="small" />,
  floor: <LayersIcon fontSize="small" />,
  workplace: <WorkIcon fontSize="small" />,
  type: <CategoryIcon fontSize="small" />,
  room: <MeetingRoomIcon fontSize="small" />,
  rooms: <MeetingRoomIcon fontSize="small" />,
};

const getIcon = (detailLabel = "") => {
  const key = detailLabel.toLowerCase().trim();
  return DETAIL_ICONS[key] ?? DETAIL_ICONS[key.replace(/s$/, "")] ?? <CategoryIcon fontSize="small" />;
};

const WhereYoullStay = ({ generalDetails = [] }) => {
  if (!Array.isArray(generalDetails) || generalDetails.length === 0) {
    return null;
  }

  return (
    <div className="where-youll-stay">
      <h3 className="where-youll-stay__title">
        <BedIcon className="where-youll-stay__title-icon" />
        Where you'll stay
      </h3>
      <div className="where-youll-stay__grid">
        {generalDetails.map((item) => (
          <div key={`${item.detail}-${item.value}`} className="where-youll-stay__item">
            <span className="where-youll-stay__icon">{getIcon(item.detail)}</span>
            <span className="where-youll-stay__label">{item.detail}</span>
            <span className="where-youll-stay__value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

WhereYoullStay.propTypes = {
  generalDetails: PropTypes.arrayOf(
    PropTypes.shape({
      detail: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
};

export default WhereYoullStay;
