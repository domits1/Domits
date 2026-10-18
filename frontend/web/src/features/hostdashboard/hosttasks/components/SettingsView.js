import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { LuChevronRight, LuCheck } from 'react-icons/lu';
import { fetchSettings, saveSettings } from '../../services/settingsService';
import { fetchTeamMembers, fetchMemberships } from '../../services/teamService';
import TeamInviteModal from './TeamInviteModal';

const DEFAULT_SETTINGS = {
    notifEmailAssigned: true,
    notifEmailOverdue: true,
    notifEmailCompleted: true,
    notifSmsUrgent: false,
    notifInappEnabled: true,
    defaultPriority: 'Medium',
    defaultAssignee: 'Anyone',
    autoAssignCleaning: false,
    requirePhotoProof: false,
};

const INTEGRATIONS = [
    { name: 'Airbnb', logo: '🏠', connected: false },
    { name: 'Booking.com', logo: '🔵', connected: false },
    { name: 'Vrbo', logo: '🏡', connected: false },
];

const SettingsView = ({ currentUser, taskContext, managedHostId }) => {
    const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
    const [settingsDraft, setSettingsDraft] = useState({ ...DEFAULT_SETTINGS });
    const [settingsSaved, setSettingsSaved] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [teamMemberships, setTeamMemberships] = useState([]);
    const [showTeamInviteModal, setShowTeamInviteModal] = useState(false);

    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(settingsDraft);

    useEffect(() => {
        fetchSettings()
            .then(data => {
                setSettings(data);
                setSettingsDraft(data);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchTeamMembers().then(setTeamMembers).catch(() => {});
        fetchMemberships().then(setTeamMemberships).catch(() => {});
    }, []);

    const handleSettingChange = (key, value) => {
        setSettingsDraft(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveSettings = async () => {
        try {
            await saveSettings(settingsDraft);
            setSettings({ ...settingsDraft });
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 3000);
        } catch {
            setSettingsSaved(false);
        }
    };

    const handleCancelSettings = () => {
        setSettingsDraft({ ...settings });
    };

    const TEAM_MEMBERS = useMemo(() => {
        const rows = [];
        if (taskContext === 'managed' && managedHostId) {
            const membership = teamMemberships.find(m => m.host_id === managedHostId);
            const hostName = membership?.host_name || membership?.host_email || managedHostId;
            const hostEmail = membership?.host_email || managedHostId;
            rows.push({ name: hostName, role: 'Host', email: hostEmail, properties: 'All', status: 'Active' });
            if (currentUser.name) {
                rows.push({ name: currentUser.name, role: 'Property Operations Manager', email: currentUser.email, properties: 'All', status: 'Active' });
            }
        } else {
            if (currentUser.name) {
                rows.push({ name: currentUser.name, role: 'Host', email: currentUser.email, properties: 'All', status: 'Active' });
            }
            teamMembers
                .filter(m => m.status === 'active' && m.member_email !== currentUser.email)
                .forEach(m => rows.push({ name: m.member_name || m.member_email, role: m.role, email: m.member_email, properties: 'All', status: 'Active' }));
        }
        return rows;
    }, [currentUser, teamMembers, teamMemberships, taskContext, managedHostId]);

    const renderSettingsToggle = (key, label, disabled = false) => (
        <div key={key} className="settings-toggle-row">
            <span className="settings-toggle-label">{label}</span>
            <button
                className={`settings-toggle ${!disabled && settingsDraft[key] ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && handleSettingChange(key, !settingsDraft[key])}
                aria-label={label}
                aria-disabled={disabled}
            >
                <span className="settings-toggle-knob" />
            </button>
        </div>
    );

    return (
        <div className="settings-container">
            <div className="settings-main-grid">
                <div className="settings-left-col">
                    <div className="settings-card settings-team-card">
                        <div className="settings-card-header">
                            <h3 className="settings-card-title">Team Members</h3>
                            {taskContext !== 'managed' && (
                                <button className="btn-primary-green" onClick={() => setShowTeamInviteModal(true)}>+ Invite Member</button>
                            )}
                        </div>
                        <table className="settings-team-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Email</th>
                                    <th>Properties</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {TEAM_MEMBERS.map(member => (
                                    <tr key={member.email}>
                                        <td><LuChevronRight className="settings-row-arrow" />{member.name}</td>
                                        <td>{member.role}</td>
                                        <td>{member.email}</td>
                                        <td>{member.properties}</td>
                                        <td>
                                            <span className={`settings-status-badge ${member.status === 'Active' ? 'active' : 'suspended'}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="settings-card">
                        <div className="settings-card-header">
                            <h3 className="settings-card-title">Integrations</h3>
                            <span className="settings-coming-soon">Coming soon</span>
                        </div>
                        <div className="settings-integrations-grid">
                            {INTEGRATIONS.map(integration => (
                                <div key={integration.name} className="settings-integration-card">
                                    <div className="settings-integration-top">
                                        <span className="settings-integration-logo">{integration.logo}</span>
                                        <span className="settings-integration-name">{integration.name}</span>
                                    </div>
                                    {integration.connected ? (
                                        <button className="settings-integration-btn disconnect">
                                            ✓ Disconnect
                                        </button>
                                    ) : (
                                        <span className="settings-integration-status disconnected">Not Connected</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="settings-right-col">
                    <div className="settings-card">
                        <div className="settings-card-header">
                            <h3 className="settings-card-title">Notifications</h3>
                            <span className="settings-coming-soon">Coming soon</span>
                        </div>
                        <p className="settings-card-subtitle">Customize your app preferences.</p>
                        <p className="settings-group-label">Email notifications</p>
                        {renderSettingsToggle('notifEmailAssigned', 'Task assigned to me', true)}
                        {renderSettingsToggle('notifEmailOverdue', 'Task overdue', true)}
                        {renderSettingsToggle('notifEmailCompleted', 'Task completed', true)}
                        <p className="settings-group-label">SMS notifications</p>
                        {renderSettingsToggle('notifSmsUrgent', 'Urgent tasks only', true)}
                        <p className="settings-group-label">In-App notifications</p>
                        {renderSettingsToggle('notifInappEnabled', 'Enable notifications', true)}
                    </div>

                    <div className="settings-card">
                        <h3 className="settings-card-title">Default Property Settings</h3>
                        <p className="settings-card-subtitle">Manage property-level preferences.</p>
                        <div className="settings-field" style={{ marginBottom: '14px' }}>
                            <label htmlFor="setting-default-priority">Default task priority</label>
                            <select id="setting-default-priority" value={settingsDraft.defaultPriority} onChange={e => handleSettingChange('defaultPriority', e.target.value)}>
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Urgent</option>
                            </select>
                        </div>
                        <div className="settings-field" style={{ marginBottom: '16px' }}>
                            <label htmlFor="setting-default-assignee">Default assignee</label>
                            <select id="setting-default-assignee" value={settingsDraft.defaultAssignee} onChange={e => handleSettingChange('defaultAssignee', e.target.value)}>
                                <option>Anyone</option>
                                {currentUser.name && <option value={currentUser.name}>{currentUser.name}</option>}
                            </select>
                        </div>
                        {renderSettingsToggle('autoAssignCleaning', 'Auto-assign cleaning after checkout')}
                        {renderSettingsToggle('requirePhotoProof', 'Require photo proof for completed tasks')}
                    </div>
                </div>
            </div>

            <div className="settings-footer">
                {settingsSaved && <span className="settings-saved-msg"><LuCheck /> Settings saved successfully.</span>}
                <button className="settings-cancel-btn" onClick={handleCancelSettings} disabled={!settingsChanged}>Cancel</button>
                <button className="btn-primary-green" onClick={handleSaveSettings} disabled={!settingsChanged}>Save changes</button>
            </div>

            <TeamInviteModal
                isOpen={showTeamInviteModal}
                onClose={() => setShowTeamInviteModal(false)}
                onInvited={(created) => setTeamMembers(prev => [...prev, created])}
            />
        </div>
    );
};

SettingsView.propTypes = {
    currentUser: PropTypes.shape({
        name: PropTypes.string,
        email: PropTypes.string,
    }).isRequired,
    taskContext: PropTypes.string.isRequired,
    managedHostId: PropTypes.string,
};

export default SettingsView;
