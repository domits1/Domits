<<<<<<< HEAD
import { useState, useEffect, useMemo } from "react";
import EventsAndTriggers from "./components/eventsAndTriggers";
import Customization from "./components/customization";
import Scheduling from "./components/scheduling";
import Preview from "./components/preview";
import { v4 as uuidv4 } from "uuid";
import {
  createDefaultAutomationSettings,
  loadAutomationSettings,
  saveAutomationSettings,
  emitAutomationUpdated,
} from "./automationConfig";

const optionsList = ["Events & Triggers", "Customization", "Scheduling", "Preview"];

const AutomatedSettings = ({ setAutomatedSettings, hostId }) => {
  const [options, setOptions] = useState("Events & Triggers");
  const [settings, setSettings] = useState(() => createDefaultAutomationSettings());
  const [selection, setSelection] = useState("booking_confirmation");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => {
    if (!hostId) return;
    setSettings(loadAutomationSettings(hostId));
    setHasUnsavedChanges(false);
  }, [hostId]);

  const events = settings?.events || {};

  const handleToggleEvent = (eventId) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        events: {
          ...prev.events,
          [eventId]: {
            ...prev.events[eventId],
            enabled: !prev.events[eventId].enabled,
          },
        },
      };
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleAddCustomEvent = () => {
    const newId = `custom_${uuidv4()}`;
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [newId]: {
          id: newId,
          label: "New Custom Message",
          description: "A custom automated message.",
          template: "",
          enabled: false,
          sendDelayMinutes: 0,
          isCustom: true,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleDeleteEvent = (eventId) => {
    if (confirm("Are you sure you want to delete this custom message?")) {
      setSettings((prev) => {
        const nextEvents = { ...prev.events };
        delete nextEvents[eventId];
        return {
          ...prev,
          events: nextEvents,
        };
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleRenameEvent = (eventId, newLabel) => {
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [eventId]: {
          ...prev.events[eventId],
          label: newLabel,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleTemplateChange = (eventId, template) => {
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [eventId]: {
          ...prev.events[eventId],
          template,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleDelayChange = (eventId, minutes) => {
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [eventId]: {
          ...prev.events[eventId],
          sendDelayMinutes: minutes,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleReset = () => {
    const shouldReset =
      typeof window === "undefined" ? true : window.confirm("Reset automated messages to default drafts?");
    if (!shouldReset) return;
    setSettings(createDefaultAutomationSettings());
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (!hostId) return;
    setSaveState("saving");
    saveAutomationSettings(hostId, settings);
    emitAutomationUpdated(hostId);
    setHasUnsavedChanges(false);
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2400);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const shouldClose =
        typeof window === "undefined" ? true : window.confirm("You have unsaved changes. Close anyway?");
      if (!shouldClose) {
        return;
      }
    }
    setAutomatedSettings(null);
  };

  const currentSubtitle = useMemo(() => {
    switch (options) {
      case "Customization":
        return "Edit the templates guests will receive";
      case "Scheduling":
        return "Control when each message goes out";
      case "Preview":
        return "See the message exactly as guests will read it";
      default:
        return "Decide which automations Domits sends for you";
    }
  }, [options]);

=======
import { useState, useEffect, useMemo } from 'react';
import EventsAndTriggers from './components/eventsAndTriggers';
import Customization from './components/customization';
import Scheduling from './components/scheduling';
import Preview from './components/preview';
import { v4 as uuidv4 } from 'uuid';
import {
  createDefaultAutomationSettings,
  loadAutomationSettings,
  saveAutomationSettings,
  emitAutomationUpdated,
} from "./automationConfig";

const optionsList = ["Events & Triggers", "Customization", "Scheduling", "Preview"];

const AutomatedSettings = ({ setAutomatedSettings, hostId }) => {
  const [options, setOptions] = useState("Events & Triggers");
  const [settings, setSettings] = useState(() => createDefaultAutomationSettings());
  const [selection, setSelection] = useState("booking_confirmation");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => {
    if (!hostId) return;
    setSettings(loadAutomationSettings(hostId));
    setHasUnsavedChanges(false);
  }, [hostId]);

  const events = settings?.events || {};

  const handleToggleEvent = (eventId) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        events: {
          ...prev.events,
          [eventId]: {
            ...prev.events[eventId],
            enabled: !prev.events[eventId].enabled,
          },
        },
      };
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleAddCustomEvent = () => {
    const newId = `custom_${uuidv4()}`;
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [newId]: {
          id: newId,
          label: "New Custom Message",
          description: "A custom automated message.",
          template: "",
          enabled: false,
          sendDelayMinutes: 0,
          isCustom: true,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleDeleteEvent = (eventId) => {
    if (confirm("Are you sure you want to delete this custom message?")) {
      setSettings((prev) => {
        const nextEvents = { ...prev.events };
        delete nextEvents[eventId];
        return {
          ...prev,
          events: nextEvents,
        };
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleRenameEvent = (eventId, newLabel) => {
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [eventId]: {
          ...prev.events[eventId],
          label: newLabel,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleTemplateChange = (eventId, template) => {
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [eventId]: {
          ...prev.events[eventId],
          template,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleDelayChange = (eventId, minutes) => {
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [eventId]: {
          ...prev.events[eventId],
          sendDelayMinutes: minutes,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleReset = () => {
    const shouldReset =
      typeof window === "undefined" ? true : window.confirm("Reset automated messages to default drafts?");
    if (!shouldReset) return;
    setSettings(createDefaultAutomationSettings());
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (!hostId) return;
    setSaveState("saving");
    saveAutomationSettings(hostId, settings);
    emitAutomationUpdated(hostId);
    setHasUnsavedChanges(false);
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2400);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const shouldClose =
        typeof window === "undefined" ? true : window.confirm("You have unsaved changes. Close anyway?");
      if (!shouldClose) {
        return;
      }
    }
    setAutomatedSettings(null);
  };

  const currentSubtitle = useMemo(() => {
    switch (options) {
      case "Customization":
        return "Edit the templates guests will receive";
      case "Scheduling":
        return "Control when each message goes out";
      case "Preview":
        return "See the message exactly as guests will read it";
      default:
        return "Decide which automations Domits sends for you";
    }
  }, [options]);

>>>>>>> 387939875 (feat: Add automated messages system with templates and customization)
    return (
        <div className="automated-settings-modal">
            <div className="top-bar">
                <div>
                    <h2>Automated messages</h2>
                    <p>{currentSubtitle}</p>
                </div>
                <div className="settings-actions">
                    <button className="ghost" onClick={handleReset} title="Reset to defaults">
                        Reset
                    </button>
                    <button
                        className="primary"
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges || saveState === 'saving'}
                    >
                        {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save'}
                    </button>
                    <button onClick={handleClose}>Close</button>
                </div>
            </div>
            {!hostId && (
                <p className="settings-warning">
                    We could not detect your host account. Refresh and try opening settings again.
                </p>
            )}
            <div className="settings-body">
                <div className="setting-bar-1">
                    {optionsList.map((option) => (
                        <h2
                            key={option}
                            onClick={() => setOptions(option)}
                            className={options === option ? 'selected' : ''}
                        >
                            {option}
                        </h2>
                    ))}
                </div>
import { useState, useEffect, useMemo } from "react";
import EventsAndTriggers from "./components/eventsAndTriggers";
import Customization from "./components/customization";
import Scheduling from "./components/scheduling";
import Preview from "./components/preview";
import { v4 as uuidv4 } from "uuid";
import {
  createDefaultAutomationSettings,
  loadAutomationSettings,
  saveAutomationSettings,
  emitAutomationUpdated,
} from "./automationConfig";

<<<<<<< HEAD
const optionsList = ["Events & Triggers", "Customization", "Scheduling", "Preview"];

const AutomatedSettings = ({ setAutomatedSettings, hostId }) => {
  const [options, setOptions] = useState("Events & Triggers");
  const [settings, setSettings] = useState(() => createDefaultAutomationSettings());
  const [selection, setSelection] = useState("booking_confirmation");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => {
    if (!hostId) return;
    setSettings(loadAutomationSettings(hostId));
    setHasUnsavedChanges(false);
  }, [hostId]);

  const events = settings?.events || {};

  const handleToggleEvent = (eventId) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        events: {
          ...prev.events,
          [eventId]: {
            ...prev.events[eventId],
            enabled: !prev.events[eventId].enabled,
          },
        },
      };
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleAddCustomEvent = () => {
    const newId = `custom_${uuidv4()}`;
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [newId]: {
          id: newId,
          label: "New Custom Message",
          description: "A custom automated message.",
          template: "",
          enabled: false,
          sendDelayMinutes: 0,
          isCustom: true,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleDeleteEvent = (eventId) => {
    if (confirm("Are you sure you want to delete this custom message?")) {
      setSettings((prev) => {
        const nextEvents = { ...prev.events };
        delete nextEvents[eventId];
        return {
          ...prev,
          events: nextEvents,
        };
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleRenameEvent = (eventId, newLabel) => {
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [eventId]: {
          ...prev.events[eventId],
          label: newLabel,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleTemplateChange = (eventId, template) => {
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [eventId]: {
          ...prev.events[eventId],
          template,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleDelayChange = (eventId, minutes) => {
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [eventId]: {
          ...prev.events[eventId],
          sendDelayMinutes: minutes,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleReset = () => {
    const shouldReset =
      typeof window === "undefined" ? true : window.confirm("Reset automated messages to default drafts?");
    if (!shouldReset) return;
    setSettings(createDefaultAutomationSettings());
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (!hostId) return;
    setSaveState("saving");
    saveAutomationSettings(hostId, settings);
    emitAutomationUpdated(hostId);
    setHasUnsavedChanges(false);
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2400);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const shouldClose =
        typeof window === "undefined" ? true : window.confirm("You have unsaved changes. Close anyway?");
      if (!shouldClose) {
        return;
      }
    }
    setAutomatedSettings(null);
  };

  const currentSubtitle = useMemo(() => {
    switch (options) {
      case "Customization":
        return "Edit the templates guests will receive";
      case "Scheduling":
        return "Control when each message goes out";
      case "Preview":
        return "See the message exactly as guests will read it";
      default:
        return "Decide which automations Domits sends for you";
    }
  }, [options]);

  return (
    <div className="automated-settings-modal">
      <div className="top-bar">
        <div>
          <h2>Automated messages</h2>
          <p>{currentSubtitle}</p>
        </div>
        <div className="settings-actions">
          <button className="ghost" onClick={handleReset} title="Reset to defaults">
            Reset
          </button>
          <button className="primary" onClick={handleSave} disabled={!hasUnsavedChanges || saveState === "saving"}>
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save"}
          </button>
          <button onClick={handleClose}>Close</button>
        </div>
      </div>
      {!hostId && (
        <p className="settings-warning">
          We could not detect your host account. Refresh and try opening settings again.
        </p>
      )}
      <div className="settings-body">
        <div className="setting-bar-1">
          {optionsList.map((option) => (
            <h2 key={option} onClick={() => setOptions(option)} className={options === option ? "selected" : ""}>
              {option}
            </h2>
          ))}
        </div>

        <div className="setting-bar-2">
          {options === "Events & Triggers" && (
            <EventsAndTriggers
              events={events}
              onToggle={handleToggleEvent}
              onAddCustomEvent={handleAddCustomEvent}
              onDeleteEvent={handleDeleteEvent}
              onRenameEvent={handleRenameEvent}
            />
          )}
          {options === "Customization" && (
            <Customization
              events={events}
              onTemplateChange={handleTemplateChange}
              onSelectEvent={setSelection}
              selectedEventId={selection}
            />
          )}
          {options === "Scheduling" && <Scheduling events={events} onDelayChange={handleDelayChange} />}
          {options === "Preview" && (
            <Preview events={events} selectedEventId={selection} onSelectEvent={setSelection} />
          )}
        </div>
      </div>
    </div>
  );
=======
<<<<<<< HEAD
                <div className="setting-bar-2">
                    {options === 'Events & Triggers' && (
                        <EventsAndTriggers
                            events={events}
                            onToggle={handleToggleEvent}
                            onAddCustomEvent={handleAddCustomEvent}
                            onDeleteEvent={handleDeleteEvent}
                            onRenameEvent={handleRenameEvent}
                        />
=======
import { useState, useEffect, useMemo } from 'react';
import EventsAndTriggers from './components/eventsAndTriggers';
import Customization from './components/customization';
import Scheduling from './components/scheduling';
import Preview from './components/preview';
import {
    createDefaultAutomationSettings,
    loadAutomationSettings,
    saveAutomationSettings,
    emitAutomationUpdated,
} from './automationConfig';

const optionsList = ['Events & Triggers', 'Customization', 'Scheduling', 'Preview'];

const AutomatedSettings = ({ setAutomatedSettings, hostId }) => {
    const [options, setOptions] = useState('Events & Triggers');
    const [settings, setSettings] = useState(() => createDefaultAutomationSettings());
    const [selection, setSelection] = useState('booking_confirmation');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved'

    useEffect(() => {
        if (!hostId) return;
        setSettings(loadAutomationSettings(hostId));
        setHasUnsavedChanges(false);
    }, [hostId]);

    const events = settings?.events || {};

    const handleToggleEvent = (eventId) => {
        setSettings((prev) => {
            const next = {
                ...prev,
                events: {
                    ...prev.events,
                    [eventId]: {
                        ...prev.events[eventId],
                        enabled: !prev.events[eventId].enabled,
                    },
                },
            };
            return next;
        });
        setHasUnsavedChanges(true);
    };

    const handleTemplateChange = (eventId, template) => {
        setSettings((prev) => ({
            ...prev,
            events: {
                ...prev.events,
                [eventId]: {
                    ...prev.events[eventId],
                    template,
                },
            },
        }));
        setHasUnsavedChanges(true);
    };

    const handleDelayChange = (eventId, minutes) => {
        setSettings((prev) => ({
            ...prev,
            events: {
                ...prev.events,
                [eventId]: {
                    ...prev.events[eventId],
                    sendDelayMinutes: minutes,
                },
            },
        }));
        setHasUnsavedChanges(true);
    };

    const handleReset = () => {
        const shouldReset =
            typeof window === 'undefined' ? true : window.confirm('Reset automated messages to default drafts?');
        if (!shouldReset) return;
        setSettings(createDefaultAutomationSettings());
        setHasUnsavedChanges(true);
    };

    const handleSave = () => {
        if (!hostId) return;
        setSaveState('saving');
        saveAutomationSettings(hostId, settings);
        emitAutomationUpdated(hostId);
        setHasUnsavedChanges(false);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2400);
    };

    const handleClose = () => {
        if (hasUnsavedChanges) {
            const shouldClose =
                typeof window === 'undefined' ? true : window.confirm('You have unsaved changes. Close anyway?');
            if (!shouldClose) {
                return;
            }
        }
        setAutomatedSettings(null);
    };

    const currentSubtitle = useMemo(() => {
        switch (options) {
            case 'Customization':
                return 'Edit the templates guests will receive';
            case 'Scheduling':
                return 'Control when each message goes out';
            case 'Preview':
                return 'See the message exactly as guests will read it';
            default:
                return 'Decide which automations Domits sends for you';
        }
    }, [options]);

    return (
        <div className="automated-settings-modal">
            <div className="top-bar">
                <div>
                    <h2>Automated messages</h2>
                    <p>{currentSubtitle}</p>
                </div>
                <div className="settings-actions">
                    <button className="ghost" onClick={handleReset} title="Reset to defaults">
                        Reset
                    </button>
                    <button
                        className="primary"
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges || saveState === 'saving'}
                    >
                        {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save'}
                    </button>
                    <button onClick={handleClose}>Close</button>
                </div>
            </div>
            {!hostId && (
                <p className="settings-warning">
                    We could not detect your host account. Refresh and try opening settings again.
                </p>
            )}
            <div className="settings-body">
                <div className="setting-bar-1">
                    {optionsList.map((option) => (
                        <h2
                            key={option}
                            onClick={() => setOptions(option)}
                            className={options === option ? 'selected' : ''}
                        >
                            {option}
                        </h2>
                    ))}
                </div>

                <div className="setting-bar-2">
                    {options === 'Events & Triggers' && (
                        <EventsAndTriggers events={events} onToggle={handleToggleEvent} />
>>>>>>> 707d537a8 (automated messages)
                    )}
                    {options === 'Customization' && (
                        <Customization
                            events={events}
                            onTemplateChange={handleTemplateChange}
                            onSelectEvent={setSelection}
                            selectedEventId={selection}
                        />
                    )}
                    {options === 'Scheduling' && (
                        <Scheduling events={events} onDelayChange={handleDelayChange} />
                    )}
                    {options === 'Preview' && (
                        <Preview
                            events={events}
                            selectedEventId={selection}
                            onSelectEvent={setSelection}
                        />
                    )}
                </div>
            </div>
        </div>
    );
<<<<<<< HEAD
>>>>>>> 387939875 (feat: Add automated messages system with templates and customization)
=======
>>>>>>> 0f356f96e (automated messages)
>>>>>>> 707d537a8 (automated messages)
};

export default AutomatedSettings;
