import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: 'white',
    },
    requestItem: {
        padding: 15,
        marginVertical: 5,
        borderRadius: 10,
        backgroundColor: '#E0F7E9',
        flexDirection: 'column',
    },
    notificationItem: {
        padding: 15,
        marginVertical: 5,
        borderRadius: 10,
        backgroundColor: '#E0F7E9',
        flexDirection: 'column',
    },
    notificationContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    message: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    time: {
        fontSize: 12,
        color: '#999',
        marginLeft: 10,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#2E7D32',
    },
    denyButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#D32F2F',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    alertOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    alertBox: {
        width: 280,
        padding: 20,
        borderRadius: 10,
        backgroundColor: '#FFFBF2',
        alignItems: 'center',
        elevation: 5,
    },
    alertMessage: {
        fontSize: 16,
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    alertActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertCancel: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#BDBDBD',
    },
    alertConfirm: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#D32F2F',
    },
    alertButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});