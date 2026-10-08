import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { LuX } from 'react-icons/lu';
import { getAttachmentViewUrl } from '../../services/taskService';

const AttachmentThumb = ({ attachment, onRemove }) => {
    const [url, setUrl] = useState(null);

    useEffect(() => {
        if (attachment instanceof File) {
            const objectUrl = URL.createObjectURL(attachment);
            setUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            getAttachmentViewUrl(attachment).then(setUrl).catch(() => {});
        }
    }, [attachment]);

    if (!url) return <div className="attachment-thumb attachment-loading" />;

    const name = attachment instanceof File ? attachment.name : attachment.split('/').pop();
    const isPdf = name.endsWith('.pdf');

    return (
        <div className="attachment-thumb-wrapper">
            <a href={url} target="_blank" rel="noreferrer" className="attachment-thumb">
                {isPdf ? <div className="attachment-pdf-icon">PDF</div> : <img src={url} alt={name} />}
            </a>
            {onRemove && (
                <button
                    type="button"
                    className="attachment-remove-btn"
                    aria-label={`Remove ${name}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
                >
                    <LuX />
                </button>
            )}
        </div>
    );
};

AttachmentThumb.propTypes = {
    attachment: PropTypes.oneOfType([PropTypes.instanceOf(File), PropTypes.string]).isRequired,
    onRemove: PropTypes.func,
};

export default AttachmentThumb;
