import React, { useEffect, useState } from 'react';

function DemoValidator(hostId) {
    const [isDemo, setIsDemo] = useState(false);
    const demoOwnerId = process.env.REACT_APP_DEMO_OWNER_ID;
    
    useEffect(() => {
        if (hostId === demoOwnerId) {
            setIsDemo(true);
        }
    }, [hostId]);

  return {isDemo};
}

export default DemoValidator