import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";

import { SettingsLayout } from "../../../components/settings/SettingsComponents";
import {
  createMessagingSchedulerRule,
  createMessagingAutoReplyRule,
  createMessagingTemplate,
  duplicateMessagingTemplate,
  fetchMessagingPreferences,
  listMessagingAutoReplyRules,
  listMessagingSchedulerRules,
  listMessagingTemplates,
  renderMessagingTemplate,
  saveMessagingPreferences,
  updateMessagingSchedulerRule,
  updateMessagingAutoReplyRule,
  updateMessagingTemplate,
} from "./services/preferencesService";
import "./MessagingPreferencesCenter.scss";

const defaultPreferences = {
  guestMessageEmailEnabled: true,
  autoReplyEmailEnabled: false,
  dailyReminderEnabled: false,
  dailyReminderTime: "09:00",
  dailyReminderTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam",
  defaultResponseTimeTargetMinutes: "",
  businessHoursEnabled: false,
  businessHoursStart: "09:00",
  businessHoursEnd: "17:00",
  outOfOfficeEnabled: false,
  defaultMessageLanguage: "en",
};

const defaultTemplateForm = {
  id: null,
  name: "",
  category: "",
  language: "en",
  content: "",
  isArchived: false,
};

const defaultRuleForm = {
  id: null,
  name: "",
  channel: "DOMITS",
  keywordPattern: "",
  replyMode: "text",
  replyTemplateId: "",
  replyText: "",
  isEnabled: true,
};

const defaultSchedulerForm = {
  id: null,
  name: "",
  channel: "DOMITS",
  templateId: "",
  triggerType: "BEFORE_CHECKIN",
  offsetUnit: "DAYS",
  offsetValue: "1",
  isEnabled: true,
  skipIfGuestResponded: true,
};

const languageOptions = ["en", "nl", "de", "es"];
const channelOptions = ["DOMITS", "WHATSAPP", "OTA", "EMAIL", "SMS"];
const templateCategories = ["general", "welcome", "house-rules", "checkout", "support"];
const schedulerTriggerOptions = [
  { value: "BEFORE_CHECKIN", label: "X days/hours before check-in" },
  { value: "DURING_STAY", label: "During stay" },
  { value: "BEFORE_CHECKOUT", label: "X days/hours before check-out" },
  { value: "AFTER_CHECKOUT", label: "After check-out" },
];

function MessagingPreferencesCenter() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [preferences, setPreferences] = useState(defaultPreferences);
  const [templates, setTemplates] = useState([]);
  const [templateForm, setTemplateForm] = useState(defaultTemplateForm);
  const [rules, setRules] = useState([]);
  const [ruleForm, setRuleForm] = useState(defaultRuleForm);
  const [schedulerRules, setSchedulerRules] = useState([]);
  const [schedulerForm, setSchedulerForm] = useState(defaultSchedulerForm);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        if (cancelled) return;
        setUserId(user.attributes.sub);
      } catch (authError) {
        if (!cancelled) {
          setError("We could not detect your host account. Please refresh and try again.");
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadAll = async () => {
      setLoading(true);
      setError("");

      try {
        const [preferencesData, templateRows, ruleRows, schedulerRuleRows] = await Promise.all([
          fetchMessagingPreferences(userId),
          listMessagingTemplates(userId, true),
          listMessagingAutoReplyRules(userId),
          listMessagingSchedulerRules(userId),
        ]);

        if (cancelled) return;

        setPreferences({
          guestMessageEmailEnabled: preferencesData.guestMessageEmailEnabled ?? true,
          autoReplyEmailEnabled: preferencesData.autoReplyEmailEnabled ?? false,
          dailyReminderEnabled: preferencesData.dailyReminderEnabled ?? false,
          dailyReminderTime: (preferencesData.dailyReminderTime || "09:00:00").slice(0, 5),
          dailyReminderTimezone:
            preferencesData.dailyReminderTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam",
          defaultResponseTimeTargetMinutes: preferencesData.defaultResponseTimeTargetMinutes ?? "",
          businessHoursEnabled: preferencesData.businessHoursEnabled ?? false,
          businessHoursStart: (preferencesData.businessHoursStart || "09:00:00").slice(0, 5),
          businessHoursEnd: (preferencesData.businessHoursEnd || "17:00:00").slice(0, 5),
          outOfOfficeEnabled: preferencesData.outOfOfficeEnabled ?? false,
          defaultMessageLanguage: preferencesData.defaultMessageLanguage || "en",
        });
        setTemplates(Array.isArray(templateRows) ? templateRows : []);
        setRules(Array.isArray(ruleRows) ? ruleRows : []);
        setSchedulerRules(Array.isArray(schedulerRuleRows) ? schedulerRuleRows : []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Failed to load messaging preferences.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const activeTemplates = useMemo(() => templates.filter((template) => !template.isArchived), [templates]);
  const archivedTemplates = useMemo(() => templates.filter((template) => template.isArchived), [templates]);

  const showSavedMessage = (message) => {
    setSaveMessage(message);
    window.clearTimeout(showSavedMessage.timeoutId);
    showSavedMessage.timeoutId = window.setTimeout(() => setSaveMessage(""), 2400);
  };

  const handlePreferenceChange = (field, value) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePreferences = async () => {
    if (!userId) return;

    try {
      const saved = await saveMessagingPreferences({
        userId,
        ...preferences,
        dailyReminderTime: preferences.dailyReminderEnabled ? preferences.dailyReminderTime : null,
        dailyReminderTimezone: preferences.dailyReminderEnabled ? preferences.dailyReminderTimezone : null,
        defaultResponseTimeTargetMinutes:
          preferences.defaultResponseTimeTargetMinutes === ""
            ? null
            : Number(preferences.defaultResponseTimeTargetMinutes),
      });

      setPreferences((prev) => ({
        ...prev,
        guestMessageEmailEnabled: saved.guestMessageEmailEnabled,
        autoReplyEmailEnabled: saved.autoReplyEmailEnabled,
        dailyReminderEnabled: saved.dailyReminderEnabled ?? prev.dailyReminderEnabled,
        dailyReminderTime: (saved.dailyReminderTime || prev.dailyReminderTime || "09:00:00").slice(0, 5),
        dailyReminderTimezone: saved.dailyReminderTimezone || prev.dailyReminderTimezone,
      }));
      showSavedMessage("Preferences saved");
    } catch (saveError) {
      setError(saveError.message || "Failed to save preferences.");
    }
  };

  const resetTemplateForm = () =>
    setTemplateForm({
      ...defaultTemplateForm,
      language: preferences.defaultMessageLanguage || "en",
    });

  const handleEditTemplate = (template) => {
    setTemplateForm({
      id: template.id,
      name: template.name || "",
      category: template.category || "",
      language: template.language || "en",
      content: template.content || "",
      isArchived: !!template.isArchived,
    });
  };

  const handleSaveTemplate = async () => {
    if (!userId) return;

    try {
      let saved;
      if (templateForm.id) {
        saved = await updateMessagingTemplate(templateForm.id, {
          name: templateForm.name,
          category: templateForm.category,
          language: templateForm.language,
          content: templateForm.content,
          isArchived: templateForm.isArchived,
        });
        setTemplates((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
        showSavedMessage("Template updated");
      } else {
        saved = await createMessagingTemplate({
          userId,
          name: templateForm.name,
          category: templateForm.category,
          language: templateForm.language,
          content: templateForm.content,
        });
        setTemplates((prev) => [saved, ...prev]);
        showSavedMessage("Template created");
      }

      resetTemplateForm();
    } catch (saveError) {
      setError(saveError.message || "Failed to save template.");
    }
  };

  const handleArchiveTemplate = async (template) => {
    try {
      const saved = await updateMessagingTemplate(template.id, { isArchived: true });
      setTemplates((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      if (templateForm.id === template.id) resetTemplateForm();
      showSavedMessage("Template archived");
    } catch (archiveError) {
      setError(archiveError.message || "Failed to archive template.");
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      const duplicated = await duplicateMessagingTemplate(template.id);
      setTemplates((prev) => [duplicated, ...prev]);
      showSavedMessage("Template duplicated");
    } catch (duplicateError) {
      setError(duplicateError.message || "Failed to duplicate template.");
    }
  };

  const resetRuleForm = () => setRuleForm(defaultRuleForm);
  const resetSchedulerForm = () => setSchedulerForm(defaultSchedulerForm);

  const handleEditRule = (rule) => {
    setRuleForm({
      id: rule.id,
      name: rule.name || "",
      channel: rule.channel || "DOMITS",
      keywordPattern: rule.keywordPattern || "",
      replyMode: rule.replyTemplateId ? "template" : "text",
      replyTemplateId: rule.replyTemplateId || "",
      replyText: rule.replyText || "",
      isEnabled: !!rule.isEnabled,
    });
  };

  const handleSaveRule = async () => {
    if (!userId) return;

    const payload = {
      userId,
      name: ruleForm.name,
      channel: ruleForm.channel,
      keywordPattern: ruleForm.keywordPattern,
      isEnabled: ruleForm.isEnabled,
      replyTemplateId: ruleForm.replyMode === "template" ? ruleForm.replyTemplateId || null : null,
      replyText: ruleForm.replyMode === "text" ? ruleForm.replyText || null : null,
    };

    try {
      let saved;
      if (ruleForm.id) {
        saved = await updateMessagingAutoReplyRule(ruleForm.id, payload);
        setRules((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
        showSavedMessage("Automatic reply rule updated");
      } else {
        saved = await createMessagingAutoReplyRule(payload);
        setRules((prev) => [saved, ...prev]);
        showSavedMessage("Automatic reply rule created");
      }

      resetRuleForm();
    } catch (saveError) {
      setError(saveError.message || "Failed to save automatic reply rule.");
    }
  };

  const handleToggleRule = async (rule) => {
    try {
      const saved = await updateMessagingAutoReplyRule(rule.id, { isEnabled: !rule.isEnabled });
      setRules((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      showSavedMessage("Automatic reply rule updated");
    } catch (toggleError) {
      setError(toggleError.message || "Failed to update rule state.");
    }
  };

  const handleEditSchedulerRule = (rule) => {
    setSchedulerForm({
      id: rule.id,
      name: rule.name || "",
      channel: rule.channel || "DOMITS",
      templateId: rule.templateId || "",
      triggerType: rule.triggerType || "BEFORE_CHECKIN",
      offsetUnit: rule.offsetUnit || "DAYS",
      offsetValue: rule.offsetValue == null ? "1" : String(rule.offsetValue),
      isEnabled: !!rule.isEnabled,
      skipIfGuestResponded: rule.skipIfGuestResponded ?? true,
    });
  };

  const handleSaveSchedulerRule = async () => {
    if (!userId) return;

    const payload = {
      userId,
      name: schedulerForm.name,
      channel: "DOMITS",
      templateId: schedulerForm.templateId,
      triggerType: schedulerForm.triggerType,
      offsetUnit: schedulerForm.offsetUnit,
      offsetValue: schedulerForm.offsetValue === "" ? null : Number(schedulerForm.offsetValue),
      isEnabled: schedulerForm.isEnabled,
      skipIfGuestResponded: schedulerForm.skipIfGuestResponded,
    };

    try {
      let saved;
      if (schedulerForm.id) {
        saved = await updateMessagingSchedulerRule(schedulerForm.id, payload);
        setSchedulerRules((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
        showSavedMessage("Scheduled template rule updated");
      } else {
        saved = await createMessagingSchedulerRule(payload);
        setSchedulerRules((prev) => [saved, ...prev]);
        showSavedMessage("Scheduled template rule created");
      }

      resetSchedulerForm();
    } catch (saveError) {
      setError(saveError.message || "Failed to save scheduled template rule.");
    }
  };

  const handleToggleSchedulerRule = async (rule) => {
    try {
      const saved = await updateMessagingSchedulerRule(rule.id, { isEnabled: !rule.isEnabled });
      setSchedulerRules((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      showSavedMessage("Scheduled template rule updated");
    } catch (toggleError) {
      setError(toggleError.message || "Failed to update scheduled template rule.");
    }
  };

  const handleInsertTemplatePreview = async (templateId) => {
    if (!templateId || !userId) return;

    try {
      const rendered = await renderMessagingTemplate(templateId, {
        hostId: userId,
      });
      const previewText = rendered?.renderedContent || "";
      if (previewText) {
        showSavedMessage("Template render preview loaded");
      }
    } catch (previewError) {
      setError(previewError.message || "Failed to preview template variables.");
    }
  };

  return (
    <SettingsLayout>
      <div className="messaging-preferences-center">
        <div className="messaging-preferences-header">
          <div>
            <p className="messaging-preferences-kicker">Unified Inbox</p>
            <h3>Messaging Preferences Center</h3>
            <p>Manage host-scoped messaging settings, templates, and automatic reply rules.</p>
          </div>
          <button type="button" className="messaging-preferences-back" onClick={() => navigate("/hostdashboard/messages")}>
            Back to Messages
          </button>
        </div>

        {error ? <div className="messaging-preferences-alert is-error">{error}</div> : null}
        {saveMessage ? <div className="messaging-preferences-alert is-success">{saveMessage}</div> : null}

        {loading ? (
          <div className="messaging-preferences-loading">Loading messaging preferences...</div>
        ) : (
          <>
            <section className="messaging-preferences-section">
              <div className="messaging-preferences-section-head">
                <div>
                  <h4>Notifications</h4>
                  <p>Host-level email notification toggles for the inbox.</p>
                </div>
              </div>
              <div className="messaging-preferences-grid is-two-column">
                <label className="preference-toggle-card">
                  <span>Email me when a guest sends a message</span>
                  <input
                    type="checkbox"
                    checked={preferences.guestMessageEmailEnabled}
                    onChange={(event) => handlePreferenceChange("guestMessageEmailEnabled", event.target.checked)}
                  />
                </label>
                <label className="preference-toggle-card">
                  <span>Email me when an automatic reply is sent</span>
                  <input
                    type="checkbox"
                    checked={preferences.autoReplyEmailEnabled}
                    onChange={(event) => handlePreferenceChange("autoReplyEmailEnabled", event.target.checked)}
                  />
                </label>
                <label className="preference-toggle-card">
                  <span>Daily reminder email enabled</span>
                  <input
                    type="checkbox"
                    checked={preferences.dailyReminderEnabled}
                    onChange={(event) => handlePreferenceChange("dailyReminderEnabled", event.target.checked)}
                  />
                </label>
                <label>
                  <span>Daily reminder time</span>
                  <input
                    type="time"
                    value={preferences.dailyReminderTime}
                    onChange={(event) => handlePreferenceChange("dailyReminderTime", event.target.value)}
                    disabled={!preferences.dailyReminderEnabled}
                  />
                </label>
                <label>
                  <span>Daily reminder timezone</span>
                  <input
                    type="text"
                    value={preferences.dailyReminderTimezone}
                    onChange={(event) => handlePreferenceChange("dailyReminderTimezone", event.target.value)}
                    placeholder="Europe/Amsterdam"
                    disabled={!preferences.dailyReminderEnabled}
                  />
                </label>
              </div>
            </section>

            <section className="messaging-preferences-section">
              <div className="messaging-preferences-section-head">
                <div>
                  <h4>General Settings</h4>
                  <p>Basic host-scoped defaults for messaging operations.</p>
                </div>
                <button type="button" className="messaging-preferences-primary" onClick={handleSavePreferences}>
                  Save General Settings
                </button>
              </div>
              <div className="messaging-preferences-grid is-two-column">
                <label>
                  <span>Default response time target (minutes)</span>
                  <input
                    type="number"
                    min="0"
                    value={preferences.defaultResponseTimeTargetMinutes}
                    onChange={(event) =>
                      handlePreferenceChange("defaultResponseTimeTargetMinutes", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Default message language</span>
                  <select
                    value={preferences.defaultMessageLanguage}
                    onChange={(event) => handlePreferenceChange("defaultMessageLanguage", event.target.value)}
                  >
                    {languageOptions.map((language) => (
                      <option key={language} value={language}>
                        {language.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="preference-toggle-card">
                  <span>Business hours enabled</span>
                  <input
                    type="checkbox"
                    checked={preferences.businessHoursEnabled}
                    onChange={(event) => handlePreferenceChange("businessHoursEnabled", event.target.checked)}
                  />
                </label>
                <label className="preference-toggle-card">
                  <span>Out of office enabled</span>
                  <input
                    type="checkbox"
                    checked={preferences.outOfOfficeEnabled}
                    onChange={(event) => handlePreferenceChange("outOfOfficeEnabled", event.target.checked)}
                  />
                </label>
                <label>
                  <span>Business hours start</span>
                  <input
                    type="time"
                    value={preferences.businessHoursStart}
                    onChange={(event) => handlePreferenceChange("businessHoursStart", event.target.value)}
                  />
                </label>
                <label>
                  <span>Business hours end</span>
                  <input
                    type="time"
                    value={preferences.businessHoursEnd}
                    onChange={(event) => handlePreferenceChange("businessHoursEnd", event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="messaging-preferences-section">
              <div className="messaging-preferences-section-head">
                <div>
                  <h4>Templates</h4>
                  <p>Create, update, archive, duplicate, and list host-scoped templates.</p>
                </div>
                <button type="button" className="messaging-preferences-secondary" onClick={resetTemplateForm}>
                  New Template
                </button>
              </div>
              <div className="messaging-preferences-split">
                <div className="messaging-preferences-editor">
                  <label>
                    <span>Name</span>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Category</span>
                    <select
                      value={templateForm.category}
                      onChange={(event) => setTemplateForm((prev) => ({ ...prev, category: event.target.value }))}
                    >
                      <option value="">Select category</option>
                      {templateCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Language</span>
                    <select
                      value={templateForm.language}
                      onChange={(event) => setTemplateForm((prev) => ({ ...prev, language: event.target.value }))}
                    >
                      {languageOptions.map((language) => (
                        <option key={language} value={language}>
                          {language.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Content</span>
                    <textarea
                      rows="8"
                      value={templateForm.content}
                      onChange={(event) => setTemplateForm((prev) => ({ ...prev, content: event.target.value }))}
                    />
                  </label>
                  <p className="messaging-preferences-empty">
                    Available variables: {"{{guestName}}"}, {"{{propertyName}}"}, {"{{checkInDate}}"}, {"{{checkOutDate}}"},
                    {" {{fullAddress}}"}, {" {{checkInFrom}}"}, {" {{checkInTill}}"}, {" {{checkOutFrom}}"},
                    {" {{checkOutTill}}"}
                  </p>
                  <div className="messaging-preferences-actions">
                    <button type="button" className="messaging-preferences-primary" onClick={handleSaveTemplate}>
                      {templateForm.id ? "Update Template" : "Create Template"}
                    </button>
                    {templateForm.id ? (
                      <button type="button" className="messaging-preferences-secondary" onClick={resetTemplateForm}>
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="messaging-preferences-list">
                  <h5>Active Templates</h5>
                  {activeTemplates.map((template) => (
                    <article key={template.id} className="messaging-preferences-card">
                      <div>
                        <strong>{template.name}</strong>
                        <p>{template.category || "uncategorized"} · {String(template.language || "en").toUpperCase()}</p>
                      </div>
                      <div className="messaging-preferences-card-actions">
                        <button type="button" onClick={() => handleInsertTemplatePreview(template.id)}>Preview</button>
                        <button type="button" onClick={() => handleEditTemplate(template)}>Edit</button>
                        <button type="button" onClick={() => handleDuplicateTemplate(template)}>Duplicate</button>
                        <button type="button" onClick={() => handleArchiveTemplate(template)}>Archive</button>
                      </div>
                    </article>
                  ))}

                  <h5>Archived Templates</h5>
                  {archivedTemplates.length === 0 ? <p className="messaging-preferences-empty">No archived templates.</p> : null}
                  {archivedTemplates.map((template) => (
                    <article key={template.id} className="messaging-preferences-card is-muted">
                      <div>
                        <strong>{template.name}</strong>
                        <p>{template.category || "uncategorized"} · {String(template.language || "en").toUpperCase()}</p>
                      </div>
                      <div className="messaging-preferences-card-actions">
                        <button type="button" onClick={() => handleEditTemplate(template)}>View / Edit</button>
                        <button type="button" onClick={() => handleDuplicateTemplate(template)}>Duplicate</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="messaging-preferences-section">
              <div className="messaging-preferences-section-head">
                <div>
                  <h4>Automatic Reply Rules</h4>
                  <p>Host-scoped keyword rules with live runtime execution on inbound guest messages.</p>
                </div>
                <button type="button" className="messaging-preferences-secondary" onClick={resetRuleForm}>
                  New Rule
                </button>
              </div>
              <div className="messaging-preferences-split">
                <div className="messaging-preferences-editor">
                  <label>
                    <span>Rule name</span>
                    <input
                      type="text"
                      value={ruleForm.name}
                      onChange={(event) => setRuleForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Channel</span>
                    <select
                      value={ruleForm.channel}
                      onChange={(event) => setRuleForm((prev) => ({ ...prev, channel: event.target.value }))}
                    >
                      {channelOptions.map((channel) => (
                        <option key={channel} value={channel}>
                          {channel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Keyword pattern</span>
                    <input
                      type="text"
                      value={ruleForm.keywordPattern}
                      onChange={(event) => setRuleForm((prev) => ({ ...prev, keywordPattern: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Reply source</span>
                    <select
                      value={ruleForm.replyMode}
                      onChange={(event) =>
                        setRuleForm((prev) => ({
                          ...prev,
                          replyMode: event.target.value,
                          replyTemplateId: event.target.value === "template" ? prev.replyTemplateId : "",
                          replyText: event.target.value === "text" ? prev.replyText : "",
                        }))
                      }
                    >
                      <option value="text">Custom reply text</option>
                      <option value="template">Linked template</option>
                    </select>
                  </label>
                  {ruleForm.replyMode === "template" ? (
                    <label>
                      <span>Template</span>
                      <select
                        value={ruleForm.replyTemplateId}
                        onChange={(event) => setRuleForm((prev) => ({ ...prev, replyTemplateId: event.target.value }))}
                      >
                        <option value="">Select template</option>
                        {activeTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      <span>Reply text</span>
                      <textarea
                        rows="6"
                        value={ruleForm.replyText}
                        onChange={(event) => setRuleForm((prev) => ({ ...prev, replyText: event.target.value }))}
                      />
                    </label>
                  )}
                  <label className="preference-toggle-card">
                    <span>Rule enabled</span>
                    <input
                      type="checkbox"
                      checked={ruleForm.isEnabled}
                      onChange={(event) => setRuleForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
                    />
                  </label>
                  <div className="messaging-preferences-actions">
                    <button type="button" className="messaging-preferences-primary" onClick={handleSaveRule}>
                      {ruleForm.id ? "Update Rule" : "Create Rule"}
                    </button>
                    {ruleForm.id ? (
                      <button type="button" className="messaging-preferences-secondary" onClick={resetRuleForm}>
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="messaging-preferences-list">
                  <h5>Rules</h5>
                  {rules.length === 0 ? <p className="messaging-preferences-empty">No automatic reply rules yet.</p> : null}
                  {rules.map((rule) => (
                    <article key={rule.id} className="messaging-preferences-card">
                      <div>
                        <strong>{rule.name}</strong>
                        <p>{rule.channel} · keyword: {rule.keywordPattern}</p>
                        <p>
                          {rule.replyTemplateId
                            ? `Template: ${rule.replyTemplateId}`
                            : rule.replyText
                              ? `Custom reply: ${rule.replyText}`
                              : "Custom reply text"}
                        </p>
                      </div>
                      <div className="messaging-preferences-card-actions">
                        <button type="button" onClick={() => handleEditRule(rule)}>Edit</button>
                        <button type="button" onClick={() => handleToggleRule(rule)}>
                          {rule.isEnabled ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="messaging-preferences-section">
              <div className="messaging-preferences-section-head">
                <div>
                  <h4>Template Scheduler</h4>
                  <p>DOMITS lifecycle sends only in this slice. Rules are timezone-aware through the scheduler service.</p>
                </div>
                <button type="button" className="messaging-preferences-secondary" onClick={resetSchedulerForm}>
                  New Scheduled Send
                </button>
              </div>
              <div className="messaging-preferences-split">
                <div className="messaging-preferences-editor">
                  <label>
                    <span>Rule name</span>
                    <input
                      type="text"
                      value={schedulerForm.name}
                      onChange={(event) => setSchedulerForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Template</span>
                    <select
                      value={schedulerForm.templateId}
                      onChange={(event) => setSchedulerForm((prev) => ({ ...prev, templateId: event.target.value }))}
                    >
                      <option value="">Select template</option>
                      {activeTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Trigger</span>
                    <select
                      value={schedulerForm.triggerType}
                      onChange={(event) => setSchedulerForm((prev) => ({ ...prev, triggerType: event.target.value }))}
                    >
                      {schedulerTriggerOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Offset unit</span>
                    <select
                      value={schedulerForm.offsetUnit}
                      onChange={(event) => setSchedulerForm((prev) => ({ ...prev, offsetUnit: event.target.value }))}
                    >
                      <option value="DAYS">Days</option>
                      <option value="HOURS">Hours</option>
                    </select>
                  </label>
                  <label>
                    <span>Offset value</span>
                    <input
                      type="number"
                      min="0"
                      value={schedulerForm.offsetValue}
                      onChange={(event) => setSchedulerForm((prev) => ({ ...prev, offsetValue: event.target.value }))}
                    />
                  </label>
                  <label className="preference-toggle-card">
                    <span>Skip if guest already responded</span>
                    <input
                      type="checkbox"
                      checked={schedulerForm.skipIfGuestResponded}
                      onChange={(event) =>
                        setSchedulerForm((prev) => ({ ...prev, skipIfGuestResponded: event.target.checked }))
                      }
                    />
                  </label>
                  <label className="preference-toggle-card">
                    <span>Rule enabled</span>
                    <input
                      type="checkbox"
                      checked={schedulerForm.isEnabled}
                      onChange={(event) => setSchedulerForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
                    />
                  </label>
                  <div className="messaging-preferences-actions">
                    <button type="button" className="messaging-preferences-primary" onClick={handleSaveSchedulerRule}>
                      {schedulerForm.id ? "Update Scheduled Send" : "Create Scheduled Send"}
                    </button>
                    {schedulerForm.id ? (
                      <button type="button" className="messaging-preferences-secondary" onClick={resetSchedulerForm}>
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="messaging-preferences-list">
                  <h5>Scheduled Rules</h5>
                  {schedulerRules.length === 0 ? (
                    <p className="messaging-preferences-empty">No scheduled template rules yet.</p>
                  ) : null}
                  {schedulerRules.map((rule) => (
                    <article key={rule.id} className="messaging-preferences-card">
                      <div>
                        <strong>{rule.name}</strong>
                        <p>{rule.triggerType} · DOMITS · template {rule.templateId}</p>
                        <p>
                          Offset: {rule.offsetValue ?? 0} {String(rule.offsetUnit || "").toLowerCase() || "hours"}
                        </p>
                      </div>
                      <div className="messaging-preferences-card-actions">
                        <button type="button" onClick={() => handleEditSchedulerRule(rule)}>Edit</button>
                        <button type="button" onClick={() => handleToggleSchedulerRule(rule)}>
                          {rule.isEnabled ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </SettingsLayout>
  );
}

export default MessagingPreferencesCenter;
