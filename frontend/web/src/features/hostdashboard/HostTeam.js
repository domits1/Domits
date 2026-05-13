import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Auth } from "aws-amplify";
import standardAvatar from "../../images/standard.png";
import { normalizeImageUrl } from "../guestdashboard/utils/image";

const HostTeam = () => {
    const [host, setHost] = useState({ name: "", email: "", phone: "", picture: "" });
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("Property Operations Manager");
    const [inviteSent, setInviteSent] = useState(false);

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
                });
            } catch {
                /* not logged in */
            }
        };
        loadHost();
    }, []);

    useEffect(() => {
        if (!showInviteModal) return;
        const handleEscape = (e) => { if (e.key === "Escape") setShowInviteModal(false); };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [showInviteModal]);

    const handleInvite = (e) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setInviteSent(true);
        setTimeout(() => {
            setInviteSent(false);
            setInviteEmail("");
            setInviteRole("Co-Host");
            setShowInviteModal(false);
        }, 2500);
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
                        <span className="team-member-chevron">›</span>
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
                <div className="team-empty-state">
                    <p>No additional team members yet. Invite a co-host to get started.</p>
                </div>
            </section>

            {showInviteModal && (
                <div className="team-modal-overlay" role="presentation">
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
