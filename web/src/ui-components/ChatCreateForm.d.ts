/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, SwitchFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type ChatCreateFormInputValues = {
    text?: string;
    email?: string;
    recipientEmail?: string;
    isRead?: boolean;
    sortKey?: string;
    createdAt?: string;
    channelID?: string;
};
export declare type ChatCreateFormValidationValues = {
    text?: ValidationFunction<string>;
    email?: ValidationFunction<string>;
    recipientEmail?: ValidationFunction<string>;
    isRead?: ValidationFunction<boolean>;
    sortKey?: ValidationFunction<string>;
    createdAt?: ValidationFunction<string>;
    channelID?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ChatCreateFormOverridesProps = {
    ChatCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    text?: PrimitiveOverrideProps<TextFieldProps>;
    email?: PrimitiveOverrideProps<TextFieldProps>;
    recipientEmail?: PrimitiveOverrideProps<TextFieldProps>;
    isRead?: PrimitiveOverrideProps<SwitchFieldProps>;
    sortKey?: PrimitiveOverrideProps<TextFieldProps>;
    createdAt?: PrimitiveOverrideProps<TextFieldProps>;
    channelID?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type ChatCreateFormProps = React.PropsWithChildren<{
    overrides?: ChatCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: ChatCreateFormInputValues) => ChatCreateFormInputValues;
    onSuccess?: (fields: ChatCreateFormInputValues) => void;
    onError?: (fields: ChatCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ChatCreateFormInputValues) => ChatCreateFormInputValues;
    onValidate?: ChatCreateFormValidationValues;
} & React.CSSProperties>;
export default function ChatCreateForm(props: ChatCreateFormProps): React.ReactElement;
