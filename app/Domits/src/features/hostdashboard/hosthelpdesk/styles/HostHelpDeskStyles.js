import {StyleSheet} from "react-native";

export
const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    attachmentButton: {
        backgroundColor: '#007BFF',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,
    },
    attachmentButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    attachmentName: {
        fontSize: 14,
        marginBottom: 5,
    },
    submitButton: {
        backgroundColor: '#28A745',
        padding: 12,
        borderRadius: 5,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    feedback: {
        textAlign: 'center',
        marginBottom: 10,
    },
    success: {
        color: 'green',
    },
    error: {
        color: 'red',
    },
});