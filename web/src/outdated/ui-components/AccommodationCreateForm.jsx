/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from 'react'
import {Button, Flex, Grid, TextField} from '@aws-amplify/ui-react'
import {fetchByPath, getOverrideProps, validateField} from './utils'
import {generateClient} from 'aws-amplify/api'
import {createAccommodation} from '../../graphql/mutations'
const client = generateClient()
export default function AccommodationCreateForm(props) {
  const {
    clearOnSuccess = true,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props
  const initialValues = {
    accommodation: '',
    description: '',
  }
  const [accommodation, setAccommodation] = React.useState(
    initialValues.accommodation,
  )
  const [description, setDescription] = React.useState(
    initialValues.description,
  )
  const [errors, setErrors] = React.useState({})
  const resetStateValues = () => {
    setAccommodation(initialValues.accommodation)
    setDescription(initialValues.description)
    setErrors({})
  }
  const validations = {
    accommodation: [],
    description: [],
  }
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue,
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue
    let validationResponse = validateField(value, validations[fieldName])
    const customValidator = fetchByPath(onValidate, fieldName)
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse)
    }
    setErrors(errors => ({...errors, [fieldName]: validationResponse}))
    return validationResponse
  }
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async event => {
        event.preventDefault()
        let modelFields = {
          accommodation,
          description,
        }
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map(item =>
                  runValidationTasks(fieldName, item),
                ),
              )
              return promises
            }
            promises.push(runValidationTasks(fieldName, modelFields[fieldName]))
            return promises
          }, []),
        )
        if (validationResponses.some(r => r.hasError)) {
          return
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields)
        }
        try {
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === 'string' && value === '') {
              modelFields[key] = null
            }
          })
          await client.graphql({
            query: createAccommodation.replaceAll('__typename', ''),
            variables: {
              input: {
                ...modelFields,
              },
            },
          })
          if (onSuccess) {
            onSuccess(modelFields)
          }
          if (clearOnSuccess) {
            resetStateValues()
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map(e => e.message).join('\n')
            onError(modelFields, messages)
          }
        }
      }}
      {...getOverrideProps(overrides, 'AccommodationCreateForm')}
      {...rest}>
      <TextField
        label="Accommodation"
        isRequired={false}
        isReadOnly={false}
        value={accommodation}
        onChange={e => {
          let {value} = e.target
          if (onChange) {
            const modelFields = {
              accommodation: value,
              description,
            }
            const result = onChange(modelFields)
            value = result?.accommodation ?? value
          }
          if (errors.accommodation?.hasError) {
            runValidationTasks('accommodation', value)
          }
          setAccommodation(value)
        }}
        onBlur={() => runValidationTasks('accommodation', accommodation)}
        errorMessage={errors.accommodation?.errorMessage}
        hasError={errors.accommodation?.hasError}
        {...getOverrideProps(overrides, 'accommodation')}></TextField>
      <TextField
        label="Description"
        isRequired={false}
        isReadOnly={false}
        value={description}
        onChange={e => {
          let {value} = e.target
          if (onChange) {
            const modelFields = {
              accommodation,
              description: value,
            }
            const result = onChange(modelFields)
            value = result?.description ?? value
          }
          if (errors.description?.hasError) {
            runValidationTasks('description', value)
          }
          setDescription(value)
        }}
        onBlur={() => runValidationTasks('description', description)}
        errorMessage={errors.description?.errorMessage}
        hasError={errors.description?.hasError}
        {...getOverrideProps(overrides, 'description')}></TextField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, 'CTAFlex')}>
        <Button
          children="Clear"
          type="reset"
          onClick={event => {
            event.preventDefault()
            resetStateValues()
          }}
          {...getOverrideProps(overrides, 'ClearButton')}></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, 'RightAlignCTASubFlex')}>
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={Object.values(errors).some(e => e?.hasError)}
            {...getOverrideProps(overrides, 'SubmitButton')}></Button>
        </Flex>
      </Flex>
    </Grid>
  )
}
