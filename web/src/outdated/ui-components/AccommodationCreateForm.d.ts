/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from 'react'
import {GridProps, TextFieldProps} from '@aws-amplify/ui-react'
export declare type EscapeHatchProps = {
  [elementHierarchy: string]: Record<string, unknown>
} | null
export declare type VariantValues = {
  [key: string]: string
}
export declare type Variant = {
  variantValues: VariantValues
  overrides: EscapeHatchProps
}
export declare type ValidationResponse = {
  hasError: boolean
  errorMessage?: string
}
export declare type ValidationFunction<T> = (
  value: T,
  validationResponse: ValidationResponse,
) => ValidationResponse | Promise<ValidationResponse>
export declare type AccommodationCreateFormInputValues = {
  accommodation?: string
  description?: string
}
export declare type AccommodationCreateFormValidationValues = {
  accommodation?: ValidationFunction<string>
  description?: ValidationFunction<string>
}
export declare type PrimitiveOverrideProps<T> = Partial<T> &
  React.DOMAttributes<HTMLDivElement>
export declare type AccommodationCreateFormOverridesProps = {
  AccommodationCreateFormGrid?: PrimitiveOverrideProps<GridProps>
  accommodation?: PrimitiveOverrideProps<TextFieldProps>
  description?: PrimitiveOverrideProps<TextFieldProps>
} & EscapeHatchProps
export declare type AccommodationCreateFormProps = React.PropsWithChildren<
  {
    overrides?: AccommodationCreateFormOverridesProps | undefined | null
  } & {
    clearOnSuccess?: boolean
    onSubmit?: (
      fields: AccommodationCreateFormInputValues,
    ) => AccommodationCreateFormInputValues
    onSuccess?: (fields: AccommodationCreateFormInputValues) => void
    onError?: (
      fields: AccommodationCreateFormInputValues,
      errorMessage: string,
    ) => void
    onChange?: (
      fields: AccommodationCreateFormInputValues,
    ) => AccommodationCreateFormInputValues
    onValidate?: AccommodationCreateFormValidationValues
  } & React.CSSProperties
>
export default function AccommodationCreateForm(
  props: AccommodationCreateFormProps,
): React.ReactElement
