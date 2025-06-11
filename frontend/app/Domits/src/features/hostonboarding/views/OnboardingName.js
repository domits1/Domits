import {Text, TextInput, View} from "react-native";
import {useEffect, useState} from "react";

const OnboardingName = ({updateFormData, reportValidity, markVisited}) => {
    const [title, setTitle] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        markVisited(true);
        if (title.trim() === '') {
            setError('Title is required.');
            reportValidity(false);
        } else {
            setError('');
            updateFormData((draft) => {
                draft.property.title = title;
            })
            reportValidity(true);
        }
    }, [title]);

    return (
        <View>
            <Text>Enter the Property Title:</Text>
            <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Property Title"
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    padding: 10,
                    marginVertical: 10,
                }}
            />
            {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
        </View>
    );
}

export default OnboardingName;