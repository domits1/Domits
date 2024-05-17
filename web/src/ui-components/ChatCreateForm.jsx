/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import {
  Button,
  Flex,
  Grid,
  SwitchField,
  TextField,
} from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { generateClient } from "aws-amplify/api";
import { createChat } from "../graphql/mutations";
const client = generateClient();
export default function ChatCreateForm(props) {
  const {
    clearOnSuccess = true,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    text: "",
    email: "",
    recipientEmail: "",
    isRead: false,
    sortKey: "",
    createdAt: "",
    channelID: "",
  };
  const [text, setText] = React.useState(initialValues.text);
  const [email, setEmail] = React.useState(initialValues.email);
  const [recipientEmail, setRecipientEmail] = React.useState(
    initialValues.recipientEmail
  );
  const [isRead, setIsRead] = React.useState(initialValues.isRead);
  const [sortKey, setSortKey] = React.useState(initialValues.sortKey);
  const [createdAt, setCreatedAt] = React.useState(initialValues.createdAt);
  const [channelID, setChannelID] = React.useState(initialValues.channelID);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    setText(initialValues.text);
    setEmail(initialValues.email);
    setRecipientEmail(initialValues.recipientEmail);
    setIsRead(initialValues.isRead);
    setSortKey(initialValues.sortKey);
    setCreatedAt(initialValues.createdAt);
    setChannelID(initialValues.channelID);
    setErrors({});
  };
  const validations = {
    text: [{ type: "Required" }],
    email: [],
    recipientEmail: [],
    isRead: [],
    sortKey: [],
    createdAt: [],
    channelID: [],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue;
    let validationResponse = validateField(value, validations[fieldName]);
    const customValidator = fetchByPath(onValidate, fieldName);
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse);
    }
    setErrors((errors) => ({ ...errors, [fieldName]: validationResponse }));
    return validationResponse;
  };
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async (event) => {
        event.preventDefault();
        let modelFields = {
          text,
          email,
          recipientEmail,
          isRead,
          sortKey,
          createdAt,
          channelID,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item)
                )
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName])
            );
            return promises;
          }, [])
        );
        if (validationResponses.some((r) => r.hasError)) {
          return;
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields);
        }
        try {
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === "string" && value === "") {
              modelFields[key] = null;
            }
          });
          await client.graphql({
            query: createChat.replaceAll("__typename", ""),
            variables: {
              input: {
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
          if (clearOnSuccess) {
            resetStateValues();
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "ChatCreateForm")}
      {...rest}
    >
      <TextField
        label="Text"
        isRequired={true}
        isReadOnly={false}
        value={text}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              text: value,
              email,
              recipientEmail,
              isRead,
              sortKey,
              createdAt,
              channelID,
            };
            const result = onChange(modelFields);
            value = result?.text ?? value;
          }
          if (errors.text?.hasError) {
            runValidationTasks("text", value);
          }
          setText(value);
        }}
        onBlur={() => runValidationTasks("text", text)}
        errorMessage={errors.text?.errorMessage}
        hasError={errors.text?.hasError}
        {...getOverrideProps(overrides, "text")}
      ></TextField>
      <TextField
        label="Email"
        isRequired={false}
        isReadOnly={false}
        value={email}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              text,
              email: value,
              recipientEmail,
              isRead,
              sortKey,
              createdAt,
              channelID,
            };
            const result = onChange(modelFields);
            value = result?.email ?? value;
          }
          if (errors.email?.hasError) {
            runValidationTasks("email", value);
          }
          setEmail(value);
        }}
        onBlur={() => runValidationTasks("email", email)}
        errorMessage={errors.email?.errorMessage}
        hasError={errors.email?.hasError}
        {...getOverrideProps(overrides, "email")}
      ></TextField>
      <TextField
        label="Recipient email"
        isRequired={false}
        isReadOnly={false}
        value={recipientEmail}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              text,
              email,
              recipientEmail: value,
              isRead,
              sortKey,
              createdAt,
              channelID,
            };
            const result = onChange(modelFields);
            value = result?.recipientEmail ?? value;
          }
          if (errors.recipientEmail?.hasError) {
            runValidationTasks("recipientEmail", value);
          }
          setRecipientEmail(value);
        }}
        onBlur={() => runValidationTasks("recipientEmail", recipientEmail)}
        errorMessage={errors.recipientEmail?.errorMessage}
        hasError={errors.recipientEmail?.hasError}
        {...getOverrideProps(overrides, "recipientEmail")}
      ></TextField>
      <SwitchField
        label="Is read"
        defaultChecked={false}
        isDisabled={false}
        isChecked={isRead}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              text,
              email,
              recipientEmail,
              isRead: value,
              sortKey,
              createdAt,
              channelID,
            };
            const result = onChange(modelFields);
            value = result?.isRead ?? value;
          }
          if (errors.isRead?.hasError) {
            runValidationTasks("isRead", value);
          }
          setIsRead(value);
        }}
        onBlur={() => runValidationTasks("isRead", isRead)}
        errorMessage={errors.isRead?.errorMessage}
        hasError={errors.isRead?.hasError}
        {...getOverrideProps(overrides, "isRead")}
      ></SwitchField>
      <TextField
        label="Sort key"
        isRequired={false}
        isReadOnly={false}
        value={sortKey}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              text,
              email,
              recipientEmail,
              isRead,
              sortKey: value,
              createdAt,
              channelID,
            };
            const result = onChange(modelFields);
            value = result?.sortKey ?? value;
          }
          if (errors.sortKey?.hasError) {
            runValidationTasks("sortKey", value);
          }
          setSortKey(value);
        }}
        onBlur={() => runValidationTasks("sortKey", sortKey)}
        errorMessage={errors.sortKey?.errorMessage}
        hasError={errors.sortKey?.hasError}
        {...getOverrideProps(overrides, "sortKey")}
      ></TextField>
      <TextField
        label="Created at"
        isRequired={false}
        isReadOnly={false}
        value={createdAt}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              text,
              email,
              recipientEmail,
              isRead,
              sortKey,
              createdAt: value,
              channelID,
            };
            const result = onChange(modelFields);
            value = result?.createdAt ?? value;
          }
          if (errors.createdAt?.hasError) {
            runValidationTasks("createdAt", value);
          }
          setCreatedAt(value);
        }}
        onBlur={() => runValidationTasks("createdAt", createdAt)}
        errorMessage={errors.createdAt?.errorMessage}
        hasError={errors.createdAt?.hasError}
        {...getOverrideProps(overrides, "createdAt")}
      ></TextField>
      <TextField
        label="Channel id"
        isRequired={false}
        isReadOnly={false}
        value={channelID}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              text,
              email,
              recipientEmail,
              isRead,
              sortKey,
              createdAt,
              channelID: value,
            };
            const result = onChange(modelFields);
            value = result?.channelID ?? value;
          }
          if (errors.channelID?.hasError) {
            runValidationTasks("channelID", value);
          }
          setChannelID(value);
        }}
        onBlur={() => runValidationTasks("channelID", channelID)}
        errorMessage={errors.channelID?.errorMessage}
        hasError={errors.channelID?.hasError}
        {...getOverrideProps(overrides, "channelID")}
      ></TextField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Clear"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          {...getOverrideProps(overrides, "ClearButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={Object.values(errors).some((e) => e?.hasError)}
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
