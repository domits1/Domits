import {ToastAndroid} from "react-native";

function ToastMessage (message, duration) {
    ToastAndroid.show(message, duration);
}

export default ToastMessage;
