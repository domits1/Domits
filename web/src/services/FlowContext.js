// FlowContext.js
import React, {createContext, useContext, useState} from 'react'

const FlowContext = createContext()

export const useFlow = () => useContext(FlowContext)

export const FlowProvider = ({children}) => {
  const [flowState, setFlowState] = useState({
    isHost: false,
  })

  return (
    <FlowContext.Provider value={{flowState, setFlowState}}>
      {children}
    </FlowContext.Provider>
  )
}

export default FlowContext
