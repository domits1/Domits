import {Alert, Button, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import React, {useState} from "react";
import {COLORS} from "../../../styles/COLORS";
import TranslatedText from "../../translation/components/TranslatedText";
import {useNavigation} from "@react-navigation/native";
import {useTranslation} from "react-i18next";
import {steps} from "../utils/pageStepsConfig";

const OnboardingHeader = ({headerTitle, jumpToStep, pageStatus}) => {
    const navigation = useNavigation();
    const {t} = useTranslation();
    const [showChoosePageModal, setShowChoosePageModal] = useState(false);

    const confirmQuitOnboarding = () => {
        return Alert.alert(
            t("Quit onboarding"),
            t("Are you sure you want to quit adding a property?"),
            [
                {
                    text: t("Yes"),
                    onPress: () => {
                        navigation.goBack()
                    }
                },
                {text: t("No")}
            ]
        )
    }

    const togglePageModal = () => {
        setShowChoosePageModal(!showChoosePageModal)
    }

    return (
        <View>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => confirmQuitOnboarding()}>
                    <Ionicons name="close-outline" size={36} style={styles.closeIcon}/>
                </TouchableOpacity>
                <Text style={styles.titleText} numberOfLines={1}>
                    <TranslatedText textToTranslate={headerTitle}/>
                </Text>
                <TouchableOpacity onPress={() => togglePageModal()}>
                    <Ionicons name="chevron-down-outline" size={36} style={styles.rightIcon}/>
                </TouchableOpacity>
            </View>
            {showChoosePageModal &&
                <Modal
                    transparent={true}
                    visible={true}
                    animationType="slide"
                    onRequestClose={togglePageModal}>
                    <TouchableWithoutFeedback onPress={togglePageModal}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.closeModalButton}>
                                    <TouchableOpacity onPress={togglePageModal}>
                                        <Ionicons name="close-outline" size={36}/>
                                    </TouchableOpacity>
                                </View>

                                {steps.map(step => {
                                    return (
                                        <View key={step.key} style={styles.pageButton}>
                                            <Button
                                                title={`${step.title}` + (!pageStatus[step.key]?.valid && pageStatus[step.key]?.visited ? " ⚠️" : "")}
                                                color={pageStatus[step.key]?.visited ? COLORS.domitsHostBlue : 'rgb(166,166,166)'}
                                                onPress={() => {
                                                    if (pageStatus[step.key]?.visited) {
                                                        togglePageModal();
                                                        jumpToStep(step.key);
                                                    } else {
                                                        Alert.alert(t("Please finish previous pages first."));
                                                    }
                                                }}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            }
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginTop: 20,
        marginBottom: 10,
    },
    titleText: {
        textAlign: "center",
        fontSize: 25,
        color: COLORS.domitsHostBlue,
        flex: 15,
    },
    closeIcon: {
        flex: 1,
    },
    rightIcon: {
        flex: 1,
    },
    // Modal
    modalOverlay: {
        width: "100%",
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
    },
    closeModalButton: {
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    pageButton: {
        marginVertical: 5,
    },
})

export default OnboardingHeader;