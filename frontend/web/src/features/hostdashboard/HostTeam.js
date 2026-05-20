import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Auth } from "aws-amplify";
import standardAvatar from "../../images/standard.png";
import { normalizeImageUrl } from "../guestdashboard/utils/image";
import { fetchTeamMembers, fetchMemberships, inviteTeamMember, removeTeamMember } from "./services/teamService";

const HostTeam = () => {
    const [host, setHost] = useState({ name: "", email: "", phone: "", picture: "", group: "" });
    const [members, setMembers] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("Property Operations Manager");
    const [inviteSent, setInviteSent] = useState(false);
    const [inviteError, setInviteError] = useState("");
    const [loadError, setLoadError] = useState(false);
    const [confirmRemoveId, setConfirmRemoveId] = useState(null);

    useEffect(() => {
        const loadHost = async () => {
            try {
                const user = await Auth.currentAuthenticatedUser({ bypassCache: true });
                const attrs = user.attributes;
                setHost({
                    name: `${attrs.given_name || ""} ${attrs.family_name || ""}`.trim(),
                    email: attrs.email || "",
                    phone: attrs.phone_number || "",
                    picture: attrs.picture || "",
                    group: attrs["custom:group"] || "",
                });
            } catch {
                /* not logged in */
            }
        };
        loadHost();
    }, []);

    useEffect(() => {
        fetchTeamMembers()
            .then(setMembers)
            .catch(() => setLoadError(true));
        fetchMemberships()
            .then(setMemberships)
            .catch(() => { /* memberships optional */ });
    }, []);

    useEffect(() => {
        if (!showInviteModal) return;
        const handleEscape = (e) => { if (e.key === "Escape") setShowInviteModal(false); };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [showInviteModal]);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setInviteError("");
        try {
            const created = await inviteTeamMember(inviteEmail, inviteRole);
            setMembers(prev => [...prev, created]);
            setInviteSent(true);
            setTimeout(() => {
                setInviteSent(false);
                setInviteEmail("");
                setInviteRole("Property Operations Manager");
                setShowInviteModal(false);
            }, 2500);
        } catch {
            setInviteError("Failed to send invitation. Please try again.");
        }
    };

    const handleRemoveConfirm = (memberId) => {
        setConfirmRemoveId(memberId);
    };

    const handleRemove = async () => {
        if (!confirmRemoveId) return;
        const memberId = confirmRemoveId;
        setConfirmRemoveId(null);
        try {
            await removeTeamMember(memberId);
            setMembers(prev => prev.filter(m => m.id !== memberId));
        } catch {
            /* silently ignore */
        }
    };

    const renderMemberRow = (member) => (
        <div key={member.id} className="team-member-row team-member-row--bordered">
            <img
                src={standardAvatar}
                alt="Member avatar"
                className="team-member-avatar"
            />
            <div className="team-member-info">
                <div className="team-member-name">
                    {member.member_email}
                    <span className="team-role-badge">{member.role}</span>
                </div>
            </div>
            <button
                className="team-remove-btn"
                onClick={() => handleRemoveConfirm(member.id)}
                aria-label={`Remove ${member.member_email}`}
            >
                ✕
            </button>
        </div>
    );

    const renderMemberList = () => {
        if (loadError) {
            return (
                <div className="team-empty-state">
                    <p>Failed to load team members. Please refresh the page.</p>
                </div>
            );
        }

        const activeMembers = members.filter(m => m.status === "active");
        const pendingMembers = members.filter(m => m.status === "pending");

        if (activeMembers.length === 0 && pendingMembers.length === 0) {
            return (
                <div className="team-empty-state">
                    <p>No additional team members yet. Invite a co-host to get started.</p>
                </div>
            );
        }

        return (
            <>
                {activeMembers.length > 0 && (
                    <div className="team-card">
                        <div className="team-card-header">Active members</div>
                        {activeMembers.map(renderMemberRow)}
                    </div>
                )}
                {pendingMembers.length > 0 && (
                    <div className="team-card">
                        <div className="team-card-header">Pending invitations</div>
                        {pendingMembers.map(renderMemberRow)}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="page-body settings-page team-page">
            <nav className="settings-subnav">
                <Link to="/hostdashboard/settings" className="settings-subnav-link">Profile</Link>
                <Link to="/hostdashboard/settings/team" className="settings-subnav-link active">Team</Link>
            </nav>

            <div className="team-breadcrumb">
                <Link to="/hostdashboard/settings">Settings</Link>
                <span>/</span>
                <span>Team</span>
            </div>

            <h2 className="team-heading">Team</h2>
            <p className="team-subtitle">Manage who has access to your properties and reservations.</p>

            {host.group === "Host" && (
                <>
                    <section className="team-section">
                        <h3 className="team-section-title">Primary team members</h3>
                        <div className="team-card">
                            <div className="team-card-header">Primary host</div>
                            <div className="team-member-row">
                                <img
                                    src={host.picture ? normalizeImageUrl(host.picture) : standardAvatar}
                                    alt="Host avatar"
                                    className="team-member-avatar"
                                />
                                <div className="team-member-info">
                                    <div className="team-member-name">
                                        {host.name || "—"}
                                        <span className="team-role-badge">Primary host</span>
                                    </div>
                                </div>
                            </div>
                            {host.email && (
                                <div className="team-member-contact">
                                    <span className="team-contact-icon">✉</span>
                                    <span>{host.email}</span>
                                </div>
                            )}
                            {host.phone && (
                                <div className="team-member-contact">
                                    <span className="team-contact-icon">✆</span>
                                    <span>{host.phone}</span>
                                </div>
                            )}
                            <p className="team-card-note">
                                The primary host manages the account and receives platform notifications.
                            </p>
                        </div>
                    </section>

                    <section className="team-section">
                        <div className="team-section-header">
                            <h3 className="team-section-title">Additional team members</h3>
                            <button
                                className="team-invite-btn"
                                onClick={() => setShowInviteModal(true)}
                            >
                                + Invite members
                            </button>
                        </div>

                        {renderMemberList()}
                    </section>
                </>
            )}

            {memberships.length > 0 && (
                <section className="team-section">
                    <h3 className="team-section-title">Teams you belong to</h3>
                    <div className="team-card">
                        <div className="team-card-header">Co-host memberships</div>
                        {memberships.map(m => (
                            <div key={m.id} className="team-member-row team-member-row--bordered">
                                <img src={standardAvatar} alt="Host avatar" className="team-member-avatar" />
                                <div className="team-member-info">
                                    <div className="team-member-name">
                                        {m.host_id}
                                        <span className="team-role-badge">{m.role}</span>
                                    </div>
                                    {m.accepted_at && (
                                        <div className="team-member-sub">
                                            Joined {new Date(m.accepted_at).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {confirmRemoveId && (
                <div className="team-modal-overlay">
                    <dialog className="team-modal" open aria-modal="true" aria-labelledby="confirm-remove-title">
                        <h3 id="confirm-remove-title">Remove team member</h3>
                        <p>Are you sure you want to remove this member from your team? They will lose access to your properties and tasks.</p>
                        <div className="team-modal-actions">
                            <button className="team-remove-btn" onClick={handleRemove}>
                                Yes, remove
                            </button>
                            <button className="team-cancel-btn" onClick={() => setConfirmRemoveId(null)}>
                                Cancel
                            </button>
                        </div>
                    </dialog>
                </div>
            )}

            {showInviteModal && (
                <div className="team-modal-overlay">
                    <dialog className="team-modal" open aria-modal="true" aria-labelledby="invite-modal-title">
                        <h3 id="invite-modal-title">Invite team member</h3>
                        {inviteSent ? (
                            <p className="team-invite-success">
                                ✓ Invitation sent to {inviteEmail}
                            </p>
                        ) : (
                            <form onSubmit={handleInvite}>
                                <label className="team-modal-label">
                                    <span>Email address</span>
                                    <input
                                        type="email"
                                        className="team-modal-input"
                                        placeholder="colleague@example.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        required
                                    />
                                </label>
                                <label className="team-modal-label">
                                    <span>Role</span>
                                    <select
                                        className="team-modal-input"
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value)}
                                    >
                                        <option value="Property Operations Manager">Property Operations Manager</option>
                                    </select>
                                </label>
                                {inviteError && (
                                    <p className="team-invite-error">{inviteError}</p>
                                )}
                                <div className="team-modal-actions">
                                    <button type="submit" className="team-invite-btn">Send invitation</button>
                                    <button
                                        type="button"
                                        className="team-cancel-btn"
                                        onClick={() => setShowInviteModal(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </dialog>
                </div>
            )}
        </div>
    );
};

export default HostTeam;
