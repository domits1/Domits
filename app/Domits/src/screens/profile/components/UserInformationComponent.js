import {Text, View} from "react-native";
import {styles} from "../styles/ProfileStyles";
import React, {useEffect, useState} from "react";
import {useAuth} from "../../../context/AuthContext";
import {setUserAttributes} from "../utils/ProfileFunctions";

const UserInformationComponent = () => {
    const {userAttributes} = useAuth();
    const [firstName, setFirstName] = useState('');
    const [emailAddress, setEmailAddress] = useState('');

    useEffect(() => {
        setUserAttributes(userAttributes, setFirstName, setEmailAddress).then();
    }, [userAttributes]);

    return (
        <View>
            <View style={styles.avatarContainer}>
                <View style={styles.listItem}>
                    <Text style={styles.listItemText}>Name: {firstName}</Text>
                </View>
            </View>
            <View style={styles.listItem}>
                <Text style={styles.listItemText}>Email: {emailAddress}</Text>
            </View>
        </View>
    )
}

export default UserInformationComponent;