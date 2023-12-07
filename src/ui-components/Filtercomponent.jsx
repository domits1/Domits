/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import {
  getOverrideProps,
  getOverridesFromVariants,
  mergeVariantsAndOverrides,
} from "./utils";
import { Text, View } from "@aws-amplify/ui-react";
export default function Filtercomponent(props) {
  const { overrides: overridesProp, ...rest } = props;
  const variants = [
    {
      overrides: { "Rectangle 4": {}, Filter: {}, Filtercomponent: {} },
      variantValues: { property1: "Default" },
    },
    {
      overrides: { "Rectangle 4": {}, Filter: {}, Filtercomponent: {} },
      variantValues: { property1: "on hover" },
    },
  ];
  const overrides = mergeVariantsAndOverrides(
    getOverridesFromVariants(variants, props),
    overridesProp || {}
  );
  return (
    <View
      width="200px"
      height="80px"
      display="block"
      gap="unset"
      alignItems="unset"
      justifyContent="unset"
      position="relative"
      boxShadow="0px 4px 4px rgba(0, 0, 0, 0.25)"
      padding="0px 0px 0px 0px"
      {...getOverrideProps(overrides, "Filtercomponent")}
      {...rest}
    >
      <View
        width="200px"
        height="80px"
        display="block"
        gap="unset"
        alignItems="unset"
        justifyContent="unset"
        position="absolute"
        top="0%"
        bottom="0%"
        left="0%"
        right="0%"
        borderRadius="50px"
        padding="0px 0px 0px 0px"
        backgroundColor="rgba(0,87,255,1)"
        {...getOverrideProps(overrides, "Rectangle 4")}
      ></View>
      <Text
        fontFamily="Mitr"
        fontSize="24px"
        fontWeight="400"
        color="rgba(255,255,255,1)"
        textTransform="uppercase"
        lineHeight="37.68000030517578px"
        textAlign="left"
        display="block"
        direction="column"
        justifyContent="unset"
        letterSpacing="1.35px"
        width="unset"
        height="unset"
        gap="unset"
        alignItems="unset"
        position="absolute"
        top="26.25%"
        bottom="26.25%"
        left="29.5%"
        right="30%"
        padding="0px 0px 0px 0px"
        whiteSpace="pre-wrap"
        children="Filter"
        {...getOverrideProps(overrides, "Filter")}
      ></Text>
    </View>
  );
}
