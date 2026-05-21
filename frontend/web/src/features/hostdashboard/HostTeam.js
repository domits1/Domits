import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Auth } from "aws-amplify";
import standardAvatar from "../../images/standard.png";
import { normalizeImageUrl } from "../guestdashboard/utils/image";
import { fetchTeamMembers, fetchMemberships, inviteTeamMember, removeTeamMember } from "./services/teamService";
import { LanguageContext } from "../../context/LanguageContext";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const HostTeam = () => {
    const { language } = useContext(LanguageContext);
    const t = contentByLanguage[language]?.settings?.team ?? contentByLanguage.en.settings.team;

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
                alt={t.memberAvatarAlt}
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
                    <p>{t.loadError}</p>
                </div>
            );
        }

        const activeMembers = members.filter(m => m.status === "active" && m.member_email !== host.email);
        const pendingMembers = members.filter(m => m.status === "pending" && m.member_email !== host.email);

        if (activeMembers.length === 0 && pendingMembers.length === 0) {
            return (
                <div className="team-empty-state">
                    <p>{t.emptyState}</p>
                </div>
            );
        }

        return (
            <>
                {activeMembers.length > 0 && (
                    <div className="team-card">
                        <div className="team-card-header">{t.activeMembers}</div>
                        {activeMembers.map(renderMemberRow)}
                    </div>
                )}
                {pendingMembers.length > 0 && (
                    <div className="team-card">
                        <div className="team-card-header">{t.pendingInvitations}</div>
                        {pendingMembers.map(renderMemberRow)}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="page-body settings-page team-page">
            <nav className="personal-data-breadcrumb">
                <Link to="/hostdashboard/settings">{contentByLanguage[language]?.settings?.hub?.breadcrumb ?? "Settings"}</Link>
                <span className="personal-data-breadcrumb-sep">/</span>
                <span className="personal-data-breadcrumb-current">{t.breadcrumb}</span>
            </nav>

            <h2 className="team-heading">{t.heading}</h2>
            <p className="team-subtitle">{t.subtitle}</p>

            {host.group === "Host" && (
                <>
                    <section className="team-section">
                        <h3 className="team-section-title">{t.primarySection}</h3>
                        <div className="team-card">
                            <div className="team-card-header">{t.primaryCardHeader}</div>
                            <div className="team-member-row">
                                <img
                                    src={host.picture ? normalizeImageUrl(host.picture) : standardAvatar}
                                    alt={t.hostAvatarAlt}
                                    className="team-member-avatar"
                                />
                                <div className="team-member-info">
                                    <div className="team-member-name">
                                        {host.name || "—"}
                                        <span className="team-role-badge">{t.primaryHostBadge}</span>
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
                            <p className="team-card-note">{t.cardNote}</p>
                        </div>
                    </section>

                    <section className="team-section">
                        <div className="team-section-header">
                            <h3 className="team-section-title">{t.additionalSection}</h3>
                            <button
                                className="team-invite-btn"
                                onClick={() => setShowInviteModal(true)}
                            >
                                {t.inviteBtn}
                            </button>
                        </div>

                        {renderMemberList()}
                    </section>
                </>
            )}

            {memberships.length > 0 && (
                <section className="team-section">
                    <h3 className="team-section-title">{t.membershipsSection}</h3>
                    <div className="team-card">
                        <div className="team-card-header">{t.membershipsCardHeader}</div>
                        {memberships.map(m => (
                            <div key={m.id} className="team-member-row team-member-row--bordered">
                                <img src={standardAvatar} alt={t.hostAvatarAlt} className="team-member-avatar" />
                                <div className="team-member-info">
                                    <div className="team-member-name">
                                        {m.host_name || m.host_email || m.host_id}
                                        <span className="team-role-badge">{m.role}</span>
                                    </div>
                                    {(m.host_name && m.host_email) && (
                                        <div className="team-member-sub">{m.host_email}</div>
                                    )}
                                    {m.accepted_at && (
                                        <div className="team-member-sub">
                                            {t.joined} {new Date(m.accepted_at).toLocaleDateString()}
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
                        <h3 id="confirm-remove-title">{t.removeModal.title}</h3>
                        <p>{t.removeModal.body}</p>
                        <div className="team-modal-actions">
                            <button className="team-remove-btn" onClick={handleRemove}>
                                {t.removeModal.confirm}
                            </button>
                            <button className="team-cancel-btn" onClick={() => setConfirmRemoveId(null)}>
                                {t.removeModal.cancel}
                            </button>
                        </div>
                    </dialog>
                </div>
            )}

            {showInviteModal && (
                <div className="team-modal-overlay">
                    <dialog className="team-modal" open aria-modal="true" aria-labelledby="invite-modal-title">
                        <h3 id="invite-modal-title">{t.inviteModal.title}</h3>
                        {inviteSent ? (
                            <p className="team-invite-success">
                                {t.inviteModal.success} {inviteEmail}
                            </p>
                        ) : (
                            <form onSubmit={handleInvite}>
                                <label className="team-modal-label">
                                    <span>{t.inviteModal.emailLabel}</span>
                                    <input
                                        type="email"
                                        className="team-modal-input"
                                        placeholder={t.inviteModal.emailPlaceholder}
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        required
                                    />
                                </label>
                                <label className="team-modal-label">
                                    <span>{t.inviteModal.roleLabel}</span>
                                    <select
                                        className="team-modal-input"
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value)}
                                    >
                                        <option value="Property Operations Manager">{t.inviteModal.roleOption}</option>
                                    </select>
                                </label>
                                {inviteError && (
                                    <p className="team-invite-error">{t.inviteModal.error}</p>
                                )}
                                <div className="team-modal-actions">
                                    <button type="submit" className="team-invite-btn">{t.inviteModal.sendBtn}</button>
                                    <button
                                        type="button"
                                        className="team-cancel-btn"
                                        onClick={() => setShowInviteModal(false)}
                                    >
                                        {t.inviteModal.cancel}
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
