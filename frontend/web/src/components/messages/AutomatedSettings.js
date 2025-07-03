import { useState, useEffect } from 'react';
import EventsAndTriggers from './components/eventsAndTriggers';
import Customization from './components/customization';
import Scheduling from './components/scheduling';
import Preview from './components/preview';

const AutomatedSettings = ({ setAutomatedSettings }) => {
    const [settings, setSettings] = useState(null);
    const [options, setOptions] = useState('Events & Triggers');
    const optionsList = [
        'Events & Triggers',
        'Customization',
        'Scheduling',
        'Preview'
    ];
    
    return (
        <div className="automated-settings-modal">
            <div className="top-bar">
                <h2>Automated Settings</h2>
                <h2> {options}</h2>
                <button onClick={() => setAutomatedSettings(null)}>Close</button>
            </div>
            <div className="settings-body">
                <div className="setting-bar-1">
                    {optionsList.map(option => (
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
                  {options === 'Events & Triggers' && <EventsAndTriggers />}
                    {options === 'Customization' && <Customization />}
                    {options === 'Scheduling' && <Scheduling />}
                    {options === 'Preview' && <Preview />}
                </div>
            </div>
        </div>
    )

}

export default AutomatedSettings;
