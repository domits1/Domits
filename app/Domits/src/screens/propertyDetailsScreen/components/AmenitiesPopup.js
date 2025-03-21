import {Image, Modal, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/propertyDetailsStyles";
import featureIcons from "../../../ui-components/FeatureIcons";
import React from "react";
import TranslatedText from "../../../features/translation/components/TranslatedText";

const AmenitiesPopup = ({features, onClose}) => {
    return (
        <Modal transparent={true} visible={true} animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✖</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                        <TranslatedText textToTranslate={"what does this place have to offer?"}/>
                    </Text>
                    <ScrollView>
                        {Object.keys(features).map(category => {
                            const categoryItems = features[category];
                            if (categoryItems.length > 0) {
                                return (
                                    <View key={category}>
                                        <Text style={styles.categorySubTitle}>{category}</Text>
                                        <View style={styles.subCategoryDivider}/>
                                        {categoryItems.map((item, index) => (
                                            <View key={index} style={styles.categoryItem}>
                                                {typeof featureIcons[item] === 'string' ? (
                                                    <Image
                                                        source={{uri: featureIcons[item]}}
                                                        style={styles.featureIcon}
                                                    />
                                                ) : featureIcons[item] ? (
                                                    <View style={styles.featureIcon}>
                                                        {featureIcons[item]}
                                                    </View>
                                                ) : null}
                                                <Text style={styles.featureText}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>
                                );
                            }
                            return null;
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default AmenitiesPopup;