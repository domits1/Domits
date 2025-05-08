import {Image, Text, View} from 'react-native';
import {StripeProvider} from "@stripe/stripe-react-native";
import React, {useEffect} from "react";
import Header from "../components/Header";
import {S3URL} from "../../../../store/constants";
import {styles} from "../styles/styles";

const StripePayment = ({navigation, route}) => {
    const property = route.params.property;

    useEffect(() => {
        console.log(`${S3URL}${property.images[0].key}`)
        // Create booking (Should return a paymentIntent, ephemeralKey and customerId (Stripe id)
        // See https://docs.stripe.com/payments/accept-a-payment?platform=react-native#setup-server-side
    })

    return (
        <>
            <View style={styles.container}>
                <Header navigation={navigation}/>
                <Image
                    source={{uri: `${S3URL}${property.images[0].key}`}}
                    style={styles.image}
                />
                <Text>{property.property.title}</Text>
            </View>
            <StripeProvider
                publishableKey={"pk_test_51OAG6OGiInrsWMEcRkwvuQw92Pnmjz9XIGeJf97hnA3Jk551czhUgQPoNwiCJKLnf05K6N2ZYKlXyr4p4qL8dXvk00sxduWZd3"}
                urlScheme={"com.domits.domits"}>
            </StripeProvider>
        </>
    );
};

export default StripePayment;
