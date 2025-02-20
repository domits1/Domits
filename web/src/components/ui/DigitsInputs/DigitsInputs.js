import React from 'react'
import styles from './digits_input_styling.module.css'

const DigitAction = {
  Previous: 'PREVIOUS',
  Next: 'NEXT',
  First: 'FIRST',
  Last: 'LAST',
  None: 'NONE',
}

function DigitInputs({amount, inputRef, onComplete, error}) {
  const digitInputMap = {
    0: DigitAction.Next,
    1: DigitAction.Next,
    2: DigitAction.Next,
    3: DigitAction.Next,
    4: DigitAction.Next,
    5: DigitAction.Next,
    6: DigitAction.Next,
    7: DigitAction.Next,
    8: DigitAction.Next,
    9: DigitAction.Next,
    Backspace: DigitAction.Previous,
    Delete: DigitAction.Next,
    ArrowLeft: DigitAction.Previous,
    ArrowRight: DigitAction.Next,
    ArrowUp: DigitAction.Last,
    ArrowDown: DigitAction.First,
  }

  const inputActionMap = {
    FIRST: () =>
      setTimeout(() => {
        inputRef.current[0].select()
      }, 10),
    LAST: () =>
      setTimeout(() => {
        inputRef.current[inputRef.current.length - 1].select()
      }, 10),
    PREVIOUS: digitIndex =>
      setTimeout(() => {
        inputRef.current[digitIndex === 0 ? 0 : digitIndex - 1].select()
      }, 10),
    NEXT: digitIndex =>
      setTimeout(() => {
        inputRef.current[
          digitIndex === amount - 1 ? amount - 1 : digitIndex + 1
        ].select()
      }, 10),
    NONE: () => {},
  }

  function validateInputs() {
    const allValues = inputRef.current.map(input => input.value).join('')
    if (
      allValues.length === amount &&
      allValues.split('').every(val => val !== '')
    ) {
      onComplete(allValues)
    } else {
      onComplete(false)
    }
  }

  function onChange(e) {
    let isInputValid = false
    Object.keys(digitInputMap).forEach(validInput =>
      e.target.value == validInput ? (isInputValid = true) : null,
    )

    validateInputs()

    if (!isInputValid) return (e.target.value = '')
  }

  function onDigitClick(e) {
    e.currentTarget.select()
  }

  function onKeyDown(e, digitIndex) {
    const instruction = digitInputMap[e.key] || DigitAction.None
    inputActionMap[instruction](...[digitIndex])
  }

  function onPaste(e) {
    const pastedCode = e.clipboardData.getData('text').split('')

    if (pastedCode.length === amount) {
      inputRef.current.forEach(
        (input, index) => (input.value = pastedCode[index]),
      )
      onComplete(pastedCode.join(''))
    }
  }

  return React.createElement(
    'div',
    {className: styles.digitinputs},
    Array(amount)
      .fill(0)
      .map((_, index) =>
        React.createElement('input', {
          autoComplete: 'off',
          key: index,
          ref: element => (inputRef.current[index] = element),
          onKeyDown: e => onKeyDown(e, index),
          onChange: onChange,
          onPaste: onPaste,
          onClick: onDigitClick,
          className: `${styles.digitinputs_digit} ${
            error ? styles.error_digitinputs_digit : ''
          }`,
          type: 'tel',
          maxLength: 1,
          name: `digit${index}`,
          required: true,
        }),
      ),
  )
}

export default DigitInputs
