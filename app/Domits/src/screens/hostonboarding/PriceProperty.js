import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  ScrollView,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {SafeAreaView} from "react-native-safe-area-context";

function PriceSettingScreen() {
  const [price, setPrice] = useState('100');
  const [monthlyDiscount, setMonthlyDiscount] = useState(false);
  const [weeklyDiscount, setWeeklyDiscount] = useState(false);
  const [firstBookerDiscount, setFirstBookerDiscount] = useState(false);
  const [discountValue, setDiscountValue] = useState({
    monthly: '',
    weekly: '',
    firstBooker: '',
  });

  const renderPickerItems = () => {
    let items = [];
    for (let i = 50; i <= 1000; i += 50) {
      items.push(<Picker.Item key={i} label={`$${i}`} value={i.toString()} />);
    }
    return items;
  };

  return (
      <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
      <Text style={styles.title}>How much do travelers pay a night</Text>
      <TextInput
        style={styles.input}
        onChangeText={setPrice}
        value={price}
        keyboardType="numeric"
      />
      <Picker
        selectedValue={price}
        onValueChange={itemValue => setPrice(itemValue)}
        style={styles.picker}>
        {renderPickerItems()}
      </Picker>

      <Text style={styles.subtitle}>Do you offer discounts?</Text>
      <View style={styles.switchContainer}>
        <Text>Monthly discount</Text>
        <Switch
          onValueChange={() =>
            setMonthlyDiscount(previousState => !previousState)
          }
          value={monthlyDiscount}
        />
        {monthlyDiscount && (
          <TextInput
            style={styles.discountInput}
            onChangeText={value =>
              setDiscountValue({...discountValue, monthly: value})
            }
            value={discountValue.monthly}
            keyboardType="numeric"
            placeholder="%"
          />
        )}
      </View>

      <View style={styles.switchContainer}>
        <Text>Weekly discount</Text>
        <Switch
          onValueChange={() =>
            setWeeklyDiscount(previousState => !previousState)
          }
          value={weeklyDiscount}
        />
        {weeklyDiscount && (
          <TextInput
            style={styles.discountInput}
            onChangeText={value =>
              setDiscountValue({...discountValue, weekly: value})
            }
            value={discountValue.weekly}
            keyboardType="numeric"
            placeholder="%"
          />
        )}
      </View>

      <View style={styles.switchContainer}>
        <Text>First booker discount</Text>
        <Switch
          onValueChange={() =>
            setFirstBookerDiscount(previousState => !previousState)
          }
          value={firstBookerDiscount}
        />
        {firstBookerDiscount && (
          <TextInput
            style={styles.discountInput}
            onChangeText={value =>
              setDiscountValue({...discountValue, firstBooker: value})
            }
            value={discountValue.firstBooker}
            keyboardType="numeric"
            placeholder="%"
          />
        )}
      </View>
    </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    padding: 16,
  },
  input: {
    height: 50,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    fontSize: 18,
    borderRadius: 5,
  },
  picker: {
    height: 150,
    width: '100%',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    padding: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  discountInput: {
    width: 60,
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
  },
});

export default PriceSettingScreen;
