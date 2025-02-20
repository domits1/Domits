import React from 'react'
import Modal from 'react-modal'
import './contactModal.css'

Modal.setAppElement('#root')

const ContactModal = ({show, onClose, onConfirm, title, message}) => {
  return (
    <Modal
      isOpen={show}
      onRequestClose={onClose}
      contentLabel={title}
      ariaHideApp={false}
      className="modal-content"
      overlayClassName="modal-backdrop">
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="modal-actions">
        <button id="cancelButton" onClick={onClose}>
          Cancel
        </button>
        <button id="confirmButton" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </Modal>
  )
}

export default ContactModal
