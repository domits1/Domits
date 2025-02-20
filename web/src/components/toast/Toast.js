import React from 'react'
import {useState, useEffect} from 'react'
import PropTypes from 'prop-types'
import styles from './toast_styling.module.css'

function Toast({message, status, duration, onClose}) {
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (message) {
      setShowToast(true)
      const toastTimer = setTimeout(() => {
        setShowToast(false)
      }, duration)
      const clearMessageTimer = setTimeout(() => {
        if (onClose) onClose()
      }, duration + 500)
      return () => {
        clearTimeout(toastTimer)
        clearTimeout(clearMessageTimer)
      }
    }
  }, [message])

  return (
    <div
      className={`${styles.Toast} ${styles[status]} ${!showToast ? styles.hidden : ''}`}>
      <div className="Toast-content">{message}</div>
      <div
        className={`${styles['progress-bar']} ${styles[status]} ${showToast ? styles['active'] : styles['hidden']}`}></div>
    </div>
  )
}

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
  duration: PropTypes.number, // in milliseconds
  onClose: PropTypes.func,
}

Toast.defaultProps = {
  duration: 3000, // Default duration of 3 seconds
}

export default Toast
