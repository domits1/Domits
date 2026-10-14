import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { inviteTeamMember } from '../../services/teamService';

const TeamInviteModal = ({ isOpen, onClose, onInvited }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const created = await inviteTeamMember(email, 'Property Operations Manager');
            onInvited(created);
            setSent(true);
            setTimeout(() => {
                setSent(false);
                setEmail('');
                onClose();
            }, 2500);
        } catch {
            setError('Failed to send invitation. Please try again.');
        }
    };

    return (
        <div className="team-modal-overlay">
            <dialog className="team-modal" open aria-modal="true" aria-labelledby="hk-invite-title">
                <h3 id="hk-invite-title">Invite team member</h3>
                {sent ? (
                    <p className="team-invite-success">✓ Invitation sent to {email}</p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <label className="team-modal-label">
                            <span>Email address</span>
                            <input
                                type="email"
                                className="team-modal-input"
                                placeholder="colleague@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </label>
                        {error && <p className="team-invite-error">{error}</p>}
                        <div className="team-modal-actions">
                            <button type="submit" className="team-invite-btn">Send invitation</button>
                            <button type="button" className="team-cancel-btn" onClick={onClose}>Cancel</button>
                        </div>
                    </form>
                )}
            </dialog>
        </div>
    );
};

TeamInviteModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onInvited: PropTypes.func.isRequired,
};

export default TeamInviteModal;
