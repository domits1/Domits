import React, { createContext, useState } from 'react';

const FlowContext = createContext();

export const FlowProvider = ({ children }) => {
    const [flowState, setFlowState] = useState({
        isHost: false,
    });

    return (
        <FlowContext.Provider value={{ flowState, setFlowState }}>
            {children}
        </FlowContext.Provider>
    );
};

export default FlowContext;