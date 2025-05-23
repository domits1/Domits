import {StyleSheet} from "react-native";
import {COLORS} from "../../../../styles/COLORS";

export const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#ffffff',
    },
    registerContainer: {
        width: '100%',
        maxWidth: 400,
        padding: 20,
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'black',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        color: 'black',
        marginBottom: 5,
        fontWeight: '600'
    },
    input: {
        height: 50,
        borderColor: COLORS.domitsHostBlue,
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    passwordRequirements: {
        marginBottom: 15
    },
    asHostCheckBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    errorText: {
        color: 'red',
        fontSize: 14,
        marginBottom: 20
    },
    // Sign up button
    signUpButton: {
        backgroundColor: COLORS.domitsHostBlue,
        paddingVertical: 12,
        borderRadius: 5,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold'
    },
});