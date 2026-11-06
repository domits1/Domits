import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { LuX } from 'react-icons/lu';
import { getAttachmentViewUrl } from '../../services/taskService';

const AttachmentThumb = ({ attachment, taskId, asHostId, onRemove }) => {
    const [url, setUrl] = useState(null);
    const [hasFailed, setHasFailed] = useState(false);

    useEffect(() => {
        if (attachment instanceof File) {
            const objectUrl = URL.createObjectURL(attachment);
            setUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
        let isCurrent = true;
        setHasFailed(false);
        getAttachmentViewUrl(attachment, taskId, asHostId)
            .then((viewUrl) => { if (isCurrent) setUrl(viewUrl); })
            .catch(() => { if (isCurrent) setHasFailed(true); });
        return () => { isCurrent = false; };
    }, [attachment, taskId, asHostId]);

    if (!url && !hasFailed) return <div className="attachment-thumb attachment-loading" />;

    const name = attachment instanceof File ? attachment.name : attachment.split('/').pop();
    const isPdf = name.endsWith('.pdf');

    let preview;
    if (hasFailed) {
        preview = <div className="attachment-thumb attachment-unavailable" title={`${name} could not be loaded`}>Unavailable</div>;
    } else {
        preview = (
            <a href={url} target="_blank" rel="noreferrer" className="attachment-thumb">
                {isPdf ? <div className="attachment-pdf-icon">PDF</div> : <img src={url} alt={name} />}
            </a>
        );
    }

    return (
        <div className="attachment-thumb-wrapper">
            {preview}
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
    taskId: PropTypes.string,
    asHostId: PropTypes.string,
    onRemove: PropTypes.func,
};

export default AttachmentThumb;
