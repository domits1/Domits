import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const NewContactModal = ({ isOpen, onClose, onCreate, userId, dashboardType }) => {
    const [givenName, setGivenName] = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            setProfileImage(dataUrl);
            setPreviewUrl(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleCreate = () => {
        const trimmed = givenName.trim();
        if (!trimmed) return;
        const roomCode = uuidv4();
        const newContact = {
            id: `local-${roomCode}`,
            userId: `local-${userId}`,
            recipientId: `pair:${roomCode}`,
            givenName: trimmed,
            profileImage: profileImage || null,
            latestMessage: null,
            unreadCount: 0,
            bookingStatus: null,
            accoImage: null,
            isLocal: true,
            dashboardType
        };

        onCreate?.(newContact);
        setGivenName('');
        setProfileImage(null);
        setPreviewUrl(null);
        onClose?.();
    };

    return (
        <div className="new-contact-modal-overlay">
            <div className="new-contact-modal">
                <h4>Create new contact</h4>
                <div className="new-contact-form">
                    <label className="new-contact-label">Full name</label>
                    <input
                        type="text"
                        className="new-contact-input"
                        value={givenName}
                        onChange={(e) => setGivenName(e.target.value)}
                        placeholder="Enter contact name"
                    />
                    <label className="new-contact-label">Profile picture</label>
                    <input type="file" accept="image/*" onChange={handleImageChange} />
                    {previewUrl && (
                        <img src={previewUrl} alt="Preview" className="new-contact-preview" />
                    )}
                </div>
                <div className="new-contact-actions">
                    <button className="new-contact-cancel" onClick={onClose}>Cancel</button>
                    <button className="new-contact-create" onClick={handleCreate} disabled={!givenName.trim()}>Create</button>
                </div>
            </div>
        </div>
    );
};

export default NewContactModal;


