import React, { useState } from "react";
import PropTypes from "prop-types";
import Icon from "@mdi/react";
import { mdiClose, mdiFileOutline } from "@mdi/js";

const AttachmentChip = ({ attachment, onRemove, onPreview }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const { url, name, type } = attachment;
  const showsThumbnail = Boolean(type?.startsWith("image/")) && !imageFailed;

  return (
    <li className="attachment-chip" aria-label={name}>
      {showsThumbnail ? (
        <button
          type="button"
          className="attachment-chip__thumbnail"
          aria-label={`Preview ${name}`}
          onClick={onPreview}>
          <img src={url} alt={name} onError={() => setImageFailed(true)} />
        </button>
      ) : (
        <>
          <Icon className="attachment-chip__icon" path={mdiFileOutline} size={1} />
          <span className="attachment-chip__name" title={name}>
            {name}
          </span>
        </>
      )}
      <button
        type="button"
        className="attachment-chip__remove"
        aria-label="Remove attachment"
        onClick={() => onRemove(url)}>
        <Icon path={mdiClose} size={0.75} />
      </button>
    </li>
  );
};

AttachmentChip.propTypes = {
  attachment: PropTypes.shape({
    url: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
};

export default AttachmentChip;
