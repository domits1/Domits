import {Text, View} from 'react-native';
import {StripeProvider} from "@stripe/stripe-react-native";
import {useEffect} from "react";

const StripePayment = () => {

    useEffect(() => {
        // Create booking (Should return a paymentIntent, ephemeralKey and customerId (Stripe id)
        // See https://docs.stripe.com/payments/accept-a-payment?platform=react-native#setup-server-side
    })

    return (
        <StripeProvider
            publishableKey={"pk_test_51OAG6OGiInrsWMEcRkwvuQw92Pnmjz9XIGeJf97hnA3Jk551czhUgQPoNwiCJKLnf05K6N2ZYKlXyr4p4qL8dXvk00sxduWZd3"}
            urlScheme={"com.domits.domits"}>
            <View>
                <Text>Something</Text>
            </View>
        </StripeProvider>
    );
};

export default StripePayment;
