/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
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
export declare type AccommodationUpdateFormInputValues = {
    accommodation?: string;
    description?: string;
};
export declare type AccommodationUpdateFormValidationValues = {
    accommodation?: ValidationFunction<string>;
    description?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type AccommodationUpdateFormOverridesProps = {
    AccommodationUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    accommodation?: PrimitiveOverrideProps<TextFieldProps>;
    description?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type AccommodationUpdateFormProps = React.PropsWithChildren<{
    overrides?: AccommodationUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    accommodation?: any;
    onSubmit?: (fields: AccommodationUpdateFormInputValues) => AccommodationUpdateFormInputValues;
    onSuccess?: (fields: AccommodationUpdateFormInputValues) => void;
    onError?: (fields: AccommodationUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: AccommodationUpdateFormInputValues) => AccommodationUpdateFormInputValues;
    onValidate?: AccommodationUpdateFormValidationValues;
} & React.CSSProperties>;
export default function AccommodationUpdateForm(props: AccommodationUpdateFormProps): React.ReactElement;
