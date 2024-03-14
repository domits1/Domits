import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const RevenueTool = () => {
  const navigation = useNavigation();
  const [page, setPage] = useState(1);
  const [selectedCards, setSelectedCards] = useState({ 1: null, 2: null, 3: null });
  const [cardInfo, setCardInfo] = useState({ 1: null, 2: null, 3: null });
  const [priceIndicator, setPriceIndicator] = useState({ 1: null, 2: null, 3: null });

  const navigateToRegister = () => {
    // Implement navigation logic using React Navigation
    // You may need to set up your navigation stack and screens accordingly
    navigation.navigate('Register');
  };

  const pageUpdater = (pageNumber) => {
    setPage(pageNumber);
  };

  const handleCardClick = (cardIndex, priceIndex, cardText) => {
    setPriceIndicator({ ...priceIndicator, [page]: priceIndex });
    setSelectedCards({ ...selectedCards, [page]: cardIndex });
    setCardInfo({ ...cardInfo, [page]: cardText });
  };

  const areAllCardsSelected = () => {
    return Object.values(selectedCards).every((card) => card !== null);
  };

  const renderCard = (index, text, image, isSelected, price) => {
    return (
      <TouchableOpacity
        key={index}
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => handleCardClick(index, price, text)}
      >
        <Text>{text}</Text>
        {image && <Image style={styles.cardImage} source={image} />}
      </TouchableOpacity>
    );
  };

  const resetCalculator = () => {
    setPage(1);
    setSelectedCards({ 1: null, 2: null, 3: null });
    setPriceIndicator({ 1: null, 2: null, 3: null });
  };

  const calculatePrice = () => {
    const totaal = priceIndicator[1] * priceIndicator[2] * priceIndicator[3] * 0.88;
    return totaal.toFixed(2);
  };

  const displayInfo = (number) => {
    return cardInfo[number];
  };

  const renderPageContent = () => {
    switch (page) {
      case 1:
        return (
          <View>
            <Text>What type of real-estate do you want to host?</Text>
            <View style={styles.cardHolder}>
              {renderCard(0, "House", null, selectedCards[1] === 0, 1500)}
              {renderCard(1, "Appartement", null, selectedCards[1] === 1, 950)}
              {renderCard(2, "Camper", null, selectedCards[1] === 2, 1700)}
              {renderCard(3, "Boat", null, selectedCards[1] === 3, 720)}
              {renderCard(4, "Villa", null, selectedCards[1] === 4, 10500)}
            </View>
            <View style={styles.buttonHolder}>
              <TouchableOpacity style={styles.nextButtons} onPress={resetCalculator}>
                <Text  style={styles.buttonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextButtons}
                onPress={() => pageUpdater(page + 1)}
              >
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 2:
        return (
          <View>
            <Text>What are the measurements of this real-estate?</Text>
            <View style={styles.cardHolder}>
              {renderCard(0, '< 25m²', null, selectedCards[2] === 0, 0.80)}
              {renderCard(1, '25 - 50 m²', null, selectedCards[2] === 1, 0.95)}
              {renderCard(2, '50 - 75 m²', null, selectedCards[2] === 2, 1)}
              {renderCard(3, '75 - 100 m²', null, selectedCards[2] === 3, 1.15)}
              {renderCard(4, '> 100 m²', null, selectedCards[2] === 4, 1.30)}
            </View>
            <View style={styles.buttonHolder}>
              <TouchableOpacity
                style={styles.nextButtons}
                onPress={() => pageUpdater(page - 1)}
              >
                <Text style={styles.buttonText}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextButtons}
                onPress={() => pageUpdater(page + 1)}
              >
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 3:
        return (
          <View>
            <Text>How many sleeping places does your real-estate have?</Text>
            <View style={styles.cardHolder}>
              {renderCard(0, '1', null, selectedCards[3] === 0, 1)}
              {renderCard(1, '2', null, selectedCards[3] === 1, 1.05)}
              {renderCard(2, '3', null, selectedCards[3] === 2, 1.20)}
              {renderCard(3, '4', null, selectedCards[3] === 3, 1.23)}
              {renderCard(4, '5 or more', null, selectedCards[3] === 4, 1.50)}
            </View>
            <View style={styles.buttonHolder}>
              <TouchableOpacity
                style={styles.nextButtons}
                onPress={() => pageUpdater(page - 1)}
              >
                <Text style={styles.buttonText}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.nextButtons,
                  {
                    backgroundColor: areAllCardsSelected() ? 'green' : '#003366',
                    cursor: areAllCardsSelected() ? 'pointer' : 'not-allowed',
                    opacity: areAllCardsSelected() ? 1 : 0.5,
                  },
                ]}
                onPress={
                  areAllCardsSelected()
                    ? () => pageUpdater(page + 1)
                    : null
                }
                disabled={!areAllCardsSelected()}
              >
                <Text style={{ color: '#fff' }}>Calculate</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 4:
        return (
          <View>
            <View style={styles.priceDisplay}>
              <Text>Est. ${calculatePrice()} per month</Text>
            </View>
            <View style={styles.infoHolder}>
              <Text style={styles.infoHeader}>Based on:</Text>
              <Text style={styles.info}>Real Estate Type: {displayInfo(1)}</Text>
              <Text style={styles.info}>Measurements: {displayInfo(2)}</Text>
              <Text style={styles.info}>Sleeping Places: {displayInfo(3)}</Text>
              <Text style={styles.info}>Service fees: 12%</Text>
              <Text>If this estimation interests you, please consider hosting on Domits!</Text>
            </View>
            <View style={styles.buttonHolder}>
              <TouchableOpacity
                style={styles.nextButtons}
                onPress={resetCalculator}
              >
                <Text  style={styles.buttonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextButtons}
                onPress={navigateToRegister}
              >
                <Text  style={styles.buttonText}>Enlist</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      default:
        return null;
    }
  };


  return (
    <ScrollView style={styles.container}>
      <View style={styles.pages}>
        <Text style={styles.headerText}>Revenue Tool</Text>
      </View>
      <View style={styles.page}>
        {renderPageContent()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  pages: {
    alignItems: 'center',
    marginVertical: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#003366',
  },
  cardHolder: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginVertical: 16,
  },
  card: {
    height: 135,
    width: 135,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#003366',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    fontSize: 16,
    color: '#003366',
  },
  selectedCard: {
    borderColor: '#0d9813',
  },
  cardImage: {
    marginTop: 14,
    width: 100,
    height: 100,
  },
  buttonHolder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nextButtons: {
    backgroundColor: '#003366',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#FFFFFF',
  },
});

export default RevenueTool;