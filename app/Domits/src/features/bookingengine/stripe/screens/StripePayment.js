import {Image, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import Header from '../components/Header';
import {S3URL} from '../../../../store/constants';
import {styles} from '../styles/styles';
import Spacer from '../../../../components/Spacer';
import LocationView from '../views/LocationView';
import BookingDatesView from '../views/BookingDatesView';
import CalendarModal from '../components/CalendarModal';
import BookingGuestsView from '../views/BookingGuestsView';
import GuestsModal from '../components/GuestsModal';
import LineDivider from "../../../../components/LineDivider";
import calculateNumberOfNights from "../utils/CalculateNumberOfNights";
import PricingView from "../views/PricingView";
import ConfirmAndPayButton from "../components/ConfirmAndPayButton";

const StripePayment = ({navigation, route}) => {
  const property = route.params.property;

  const [arrivalDate, setArrivalDate] = useState(route.params.arrivalDate);
  const [departureDate, setDepartureDate] = useState(route.params.departureDate,);
  const [showDatePopUp, setShowDatePopUp] = useState(false);

  const [nights, setNights] = useState(calculateNumberOfNights(arrivalDate, departureDate));

  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [showGuestsPopUp, setShowGuestsPopUp] = useState(false);

  useEffect(() => {
    setNights(calculateNumberOfNights(arrivalDate, departureDate))
  }, [arrivalDate, departureDate]);

  useEffect(() => {
    // Create booking (Should return a paymentIntent, ephemeralKey and customerId (Stripe id)
    // See https://docs.stripe.com/payments/accept-a-payment?platform=react-native#setup-server-side
  });

  return (
    <>
      <View style={styles.container}>
        <Header navigation={navigation} />
        <Image
          source={{uri: `${S3URL}${property.images[0].key}`}}
          style={styles.image}
        />
        <Spacer />
        <LocationView property={property} />
        <Spacer />
        <BookingDatesView
          arrivalDate={arrivalDate}
          departureDate={departureDate}
          onChangePress={() => setShowDatePopUp(true)}
        />
        <Spacer />
        <BookingGuestsView
          adults={adults}
          kids={kids}
          onChangePress={() => setShowGuestsPopUp(true)}
        />
        <LineDivider />
        <PricingView adults={adults} kids={kids} nights={nights} pricing={property.pricing} />
        <Spacer />
        <ConfirmAndPayButton />
      </View>
      {/*<StripeProvider*/}
      {/*  publishableKey={*/}
      {/*    'pk_test_51OAG6OGiInrsWMEcRkwvuQw92Pnmjz9XIGeJf97hnA3Jk551czhUgQPoNwiCJKLnf05K6N2ZYKlXyr4p4qL8dXvk00sxduWZd3'*/}
      {/*  }*/}
      {/*  urlScheme={'com.domits.domits'}></StripeProvider>*/}
      {showDatePopUp && (
        <CalendarModal
          showDatePopUp={showDatePopUp}
          setShowDatePopUp={setShowDatePopUp}
          property={property}
          setFirstSelectedDate={setArrivalDate}
          firstSelectedDate={arrivalDate}
          setLastSelectedDate={setDepartureDate}
          lastSelectedDate={departureDate}
        />
      )}
      {showGuestsPopUp && (
        <GuestsModal
          onClose={() => setShowGuestsPopUp(false)}
          maxGuests={
            property.generalDetails.find(detail => detail.detail === 'Guests')
              .value
          }
          currentAdults={adults}
          currentKids={kids}
          setAdults={setAdults}
          setKids={setKids}
        />
      )}
    </>
  );
};

export default StripePayment;
