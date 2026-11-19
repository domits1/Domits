import React from "react";
import PropTypes from "prop-types";
import { formatDateTime } from "./channexHealthFormat";

export default function ChannexHealthTime({ time }) {
  if (!time) return <span>Never</span>;
  return <time dateTime={new Date(time).toISOString()}>{formatDateTime(time)}</time>;
}

ChannexHealthTime.propTypes = {
  time: PropTypes.number,
};
