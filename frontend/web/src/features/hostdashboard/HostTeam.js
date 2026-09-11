import React, { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Auth } from "aws-amplify";
import standardAvatar from "../../images/standard.png";
import { normalizeImageUrl } from "../guestdashboard/utils/image";
import { fetchTeamMembers, fetchMemberships, inviteTeamMember, removeTeamMember } from "./services/teamService";
import { LanguageContext } from "../../context/LanguageContext";
import { ROLES } from "../auth/roles.js";
import { getRolePermissionsSummary } from "./constants/rolePermissionsSummary.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

// Cosmetic-only color coding for the Role column. An unrecognized role
// (shouldn't happen given backend validation, but the UI must not assume)
// simply falls back to the base .team-role-badge gray styling.
const ROLE_BADGE_CLASS_NAMES = {
    [ROLES.GENERAL_MANAGER]: "team-role-badge--general-manager",
    [ROLES.RESERVATION_MANAGER]: "team-role-badge--reservation-manager",
    [ROLES.GUEST_EXPERIENCE_MANAGER]: "team-role-badge--guest-experience-manager",
    [ROLES.FINANCIAL_MANAGER]: "team-role-badge--financial-manager",
    [ROLES.DISTRIBUTION_MANAGER]: "team-role-badge--distribution-manager",
    [ROLES.REVENUE_MANAGER]: "team-role-badge--revenue-manager",
    [ROLES.SALES_MANAGER]: "team-role-badge--sales-manager",
    [ROLES.PROPERTY_OPERATIONS_MANAGER]: "team-role-badge--property-operations-manager",
};

const roleBadgeClassName = (role) => {
    const modifier = ROLE_BADGE_CLASS_NAMES[role];
    return modifier ? `team-role-badge ${modifier}` : "team-role-badge";
};

const PermissionsSummary = ({ role, t }) => {
    const items = getRolePermissionsSummary(role);
    if (items.length === 0) {
        return <span className="team-permissions-empty">{t.permissionsEmpty}</span>;
    }

    const overflowCount = items.length - 2;
    return (
        <div className="team-permissions-list">
            {items.map((item, index) => (
                <span
                    key={item}
                    className={`team-permission-chip${index >= 2 ? " team-permission-chip--overflow" : ""}`}
                >
                    {item}
                </span>
            ))}
            {overflowCount > 0 && (
                <span className="team-permission-more">
                    {t.permissionsMore.replace("{count}", overflowCount)}
                </span>
            )}
        </div>
    );
};

const TeamMemberRow = ({ member, t, onRemove }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const actionsRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return undefined;
        const handleClickOutside = (e) => {
            if (actionsRef.current && !actionsRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    const isActive = member.status === "active";

    return (
        <div className="team-table-row" role="row">
            <div className="team-row-cell team-row-cohost" role="cell">
                <img src={standardAvatar} alt={t.memberAvatarAlt} className="team-member-avatar team-member-avatar--sm" />
                <div className="team-member-info">
                    <div className="team-member-name">{member.member_email}</div>
                </div>
            </div>
            <div className="team-row-cell team-row-role" role="cell" data-label={t.columnRole}>
                <span className={roleBadgeClassName(member.role)}>{member.role}</span>
            </div>
            <div className="team-row-cell team-row-permissions" role="cell" data-label={t.columnPermissions}>
                <PermissionsSummary role={member.role} t={t} />
            </div>
            <div className="team-row-cell team-row-status" role="cell" data-label={t.columnStatus}>
                <span className={`team-status-badge team-status-badge--${member.status}`}>
                    <span className="team-status-dot" aria-hidden="true" />
                    {isActive ? t.statusActive : t.statusPending}
                </span>
            </div>
            <div className="team-row-cell team-row-actions" role="cell" ref={actionsRef}>
                <button
                    type="button"
                    className="team-row-menu-btn"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-haspopup="true"
                    aria-expanded={menuOpen}
                    aria-label={t.actionsMenuLabel}
                >
                    ⋮
                </button>
                {menuOpen && (
                    <div className="team-row-menu" role="menu">
                        <button
                            type="button"
                            role="menuitem"
                            className="team-row-menu-item team-row-menu-item--danger"
                            onClick={() => {
                                setMenuOpen(false);
                                onRemove(member.id);
                            }}
                        >
                            {t.removeAction}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const HostTeam = () => {
    const { language } = useContext(LanguageContext);
    const t = contentByLanguage[language]?.settings?.team ?? contentByLanguage.en.settings.team;
    const { removeModal, inviteModal } = t;

    const [host, setHost] = useState({ name: "", email: "", phone: "", picture: "", group: "" });
    const [members, setMembers] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("Property Operations Manager");
    const [inviteSent, setInviteSent] = useState(false);
    const [inviteError, setInviteError] = useState("");
    const [loadError, setLoadError] = useState(false);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);
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
            .then((data) => setMembers(data))
            .catch(() => setLoadError(true))
            .finally(() => setIsLoadingMembers(false));
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

    const renderMemberList = () => {
        if (loadError) {
            return (
                <div className="team-empty-state">
                    <p>{t.loadError}</p>
                </div>
            );
        }

        if (isLoadingMembers) {
            return (
                <div className="team-empty-state" role="status" aria-live="polite">
                    <p>{t.loadingMembers}</p>
                </div>
            );
        }

        const visibleMembers = members
            .filter(m => m.member_email !== host.email && (m.status === "active" || m.status === "pending"))
            .sort((a, b) => (a.status === b.status ? 0 : a.status === "active" ? -1 : 1));

        if (visibleMembers.length === 0) {
            return (
                <div className="team-empty-state">
                    <p>{t.emptyState}</p>
                </div>
            );
        }

        return (
            <div className="team-card">
                <div className="team-table" role="table">
                    <div className="team-table-header" role="row">
                        <span className="team-row-cell" role="columnheader">{t.columnCohost}</span>
                        <span className="team-row-cell" role="columnheader">{t.columnRole}</span>
                        <span className="team-row-cell" role="columnheader">{t.columnPermissions}</span>
                        <span className="team-row-cell" role="columnheader">{t.columnStatus}</span>
                        <span className="team-row-cell" role="columnheader">{t.columnActions}</span>
                    </div>
                    {visibleMembers.map(member => (
                        <TeamMemberRow key={member.id} member={member} t={t} onRemove={handleRemoveConfirm} />
                    ))}
                </div>
            </div>
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
                        <h3 id="confirm-remove-title">{removeModal.title}</h3>
                        <p>{removeModal.body}</p>
                        <div className="team-modal-actions">
                            <button className="team-remove-btn" onClick={handleRemove}>
                                {removeModal.confirm}
                            </button>
                            <button className="team-cancel-btn" onClick={() => setConfirmRemoveId(null)}>
                                {removeModal.cancel}
                            </button>
                        </div>
                    </dialog>
                </div>
            )}

            {showInviteModal && (
                <div className="team-modal-overlay">
                    <dialog className="team-modal" open aria-modal="true" aria-labelledby="invite-modal-title">
                        <h3 id="invite-modal-title">{inviteModal.title}</h3>
                        {inviteSent ? (
                            <p className="team-invite-success">
                                {inviteModal.success} {inviteEmail}
                            </p>
                        ) : (
                            <form onSubmit={handleInvite}>
                                <label className="team-modal-label">
                                    <span>{inviteModal.emailLabel}</span>
                                    <input
                                        type="email"
                                        className="team-modal-input"
                                        placeholder={inviteModal.emailPlaceholder}
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        required
                                    />
                                </label>
                                <label className="team-modal-label">
                                    <span>{inviteModal.roleLabel}</span>
                                    <select
                                        className="team-modal-input"
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value)}
                                    >
                                        <option value="Property Operations Manager">{inviteModal.roleOption}</option>
                                    </select>
                                </label>
                                {inviteError && (
                                    <p className="team-invite-error">{inviteModal.error}</p>
                                )}
                                <div className="team-modal-actions">
                                    <button type="submit" className="team-invite-btn">{inviteModal.sendBtn}</button>
                                    <button
                                        type="button"
                                        className="team-cancel-btn"
                                        onClick={() => setShowInviteModal(false)}
                                    >
                                        {inviteModal.cancel}
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
