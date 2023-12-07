/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { TextProps, ViewProps } from "@aws-amplify/ui-react";
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
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type FiltercomponentOverridesProps = {
    Filtercomponent?: PrimitiveOverrideProps<ViewProps>;
    "Rectangle 4"?: PrimitiveOverrideProps<ViewProps>;
    Filter?: PrimitiveOverrideProps<TextProps>;
} & EscapeHatchProps;
export declare type FiltercomponentProps = React.PropsWithChildren<Partial<ViewProps> & {
    property1?: "Default" | "on hover";
} & {
    overrides?: FiltercomponentOverridesProps | undefined | null;
}>;
export default function Filtercomponent(props: FiltercomponentProps): React.ReactElement;
