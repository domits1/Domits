import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, Animated, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Sound from 'react-native-sound';
import RNFetchBlob from 'rn-fetch-blob';

import usePollySpeech from './Hooks/usePollySpeech';
import useUserDetails from './Hooks/useUserDetails';
import useFetchData from './Hooks/useFetchData';
import useChatHistory from './Hooks/useChatHistory';
import useVoiceInput from './Hooks/useVoiceInput';

const Support = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [awaitingUserChoice, setAwaitingUserChoice] = useState(true);
  const [currentOption, setCurrentOption] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [dropdownAnimation] = useState(new Animated.Value(0));

  const { messageAudios, fetchPollySpeech } = usePollySpeech();
  const { userId, username } = useUserDetails(setMessages, fetchPollySpeech);
  const { accommodations, faqList, fetchAccommodations, fetchFAQ } = useFetchData();
  const { downloadChatHistory, shareChatHistory } = useChatHistory(messages);
  const { isRecording, handleVoiceInput } = useVoiceInput(setUserInput);


  const flatListRef = useRef(null);


  useEffect(() => {
    fetchFAQ();
  }, []);

  const handleButtonClick = useCallback((choice) => {
    setAwaitingUserChoice(false);
    setCurrentOption(choice);
    handleUserChoice(choice);
  }, []);

  const handleUserChoice = useCallback((choice) => {
    const messageId = Date.now();
    let newMessage = '';
    switch (choice) {
      case '1':
        newMessage = 'You can ask me about accommodations. Here are some suggestions:';
        setSuggestions(['List my accommodation', 'Show all accommodations']);
        break;
      case '2':
        newMessage = 'You can ask me about Domits. Here are some suggestions:';
        setSuggestions(['Is Domits 100% free for hosts']);
        break;
      case '3':
        newMessage = 'You can contact an expert at support@domits.com or call +123456789.';
        setSuggestions([]);
        break;
      default:
        newMessage = 'Please choose a valid option (1, 2, or 3).';
        setSuggestions([]);
        setAwaitingUserChoice(true);
    }

    setMessages([{ id: messageId, text: newMessage, sender: 'bot', contentType: 'text', audioUrl: messageAudios[messageId], }]);
    fetchPollySpeech(newMessage, messageId);
  }, [fetchPollySpeech]);


  const handleSubmit = useCallback(() => {
    if (userInput.trim() && currentOption) {
      const messageId = Date.now();
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: messageId, text: userInput, sender: 'user', contentType: 'text' },
      ]);
      fetchPollySpeech(userInput, messageId);
      setUserInput('');

      if (currentOption === '1') {
        handleAccommodationQuery(userInput);
      } else if (currentOption === '2') {
        handleFAQQuery(userInput);
      } else {
        handleExpertContact();
      }
    }
  }, [userInput, currentOption, fetchPollySpeech]);

  const handleAccommodationQuery = useCallback(async (input) => {
    const messageId = Date.now();
    if (input.toLowerCase().includes('show all accommodations')) {
      await fetchAccommodations(userId);
    }
    const responseMessage = accommodations.length
      ? `Here are the accommodations:\n${accommodations
        .map((acc) => `
      Title: ${acc.title}
      City: ${acc.city}
    `)
        .join('\n\n')}`
      : 'Sorry, there is no accommodation data available right now.';

    setMessages((prevMessages) => [
      ...prevMessages,
      { id: messageId, text: responseMessage, sender: 'bot', contentType: 'text' },
    ]);
    fetchPollySpeech(responseMessage, messageId);
  }, [accommodations, fetchAccommodations, userId, fetchPollySpeech]);

  const handleFAQQuery = useCallback((input) => {
    const messageId = Date.now();
    const bestMatch = faqList.find((faq) =>
      faq.question.toLowerCase().includes(input.toLowerCase())
    );
    const responseMessage = bestMatch
      ? `Q: ${bestMatch.question}\nA: ${bestMatch.answer}`
      : "Sorry, I couldn't find an answer to your question.";

    setMessages((prevMessages) => [
      ...prevMessages,
      { id: messageId, text: responseMessage, sender: 'bot', contentType: 'text' },
    ]);
    fetchPollySpeech(responseMessage, messageId);
  });

  const handleExpertContact = () => {
    const expertMessage = 'You can contact an expert at support@domits.com or call +123456789.';
    const messageId = Date.now();
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: messageId, text: expertMessage, sender: 'bot', contentType: 'text' },
    ]);
    fetchPollySpeech(expertMessage, messageId);
  };

  const goBackToOptions = () => {
    setAwaitingUserChoice(true);
    setSuggestions([]);
    setCurrentOption(null);

    const message = `Hello again, ${username}! Please choose an option:`;
    const messageId = Date.now();
    setMessages([{ id: messageId, text: message, sender: 'bot', contentType: 'text' }]);
    fetchPollySpeech(message, messageId);

  };

  useEffect(() => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        messageAudios[msg.id]
          ? { ...msg, audioUrl: messageAudios[msg.id] }
          : msg
      )
    );
  }, [messageAudios]);


  const renderItem = ({ item }) => {
    const isUser = item.sender === 'user';
    const alignStyle = item.sender === 'user' ? styles.alignEnd : styles.alignStart;
    const profileImage = isUser
      ? require('../pictures/domits-logo.jpg')
      : require('../pictures/domits-logo.jpg');

    const playAudio = async (base64Audio) => {
      if (!base64Audio.startsWith('data:audio/mp3;base64,')) {
        console.error('Invalid Base64 Audio');
        return;
      }
      const audioData = base64Audio.replace('data:audio/mp3;base64,', '');
      const path = `${RNFetchBlob.fs.dirs.CacheDir}/temp_audio.mp3`;

      try {
        await RNFetchBlob.fs.writeFile(path, audioData, 'base64');
        const sound = new Sound(path, '', (error) => {
          if (error) {
            console.error('Error loading audio:', error);
            return;
          }
          sound.play();
        });
      } catch (err) {
        console.error('Error writing audio file:', err);
      }
    };
    return (
      <View style={[styles.messageContainer, alignStyle]}>
        {!isUser && (
          <View style={styles.messageContent}>
            <View style={styles.senderHeader}>
              <Image
                source={profileImage}
                style={styles.senderImage}
              />
              <Text style={styles.senderName}>
                {item.sender === 'bot' ? 'Domits Bot' : 'YOU'}
              </Text>
              {item.audioUrl && (
                <TouchableOpacity
                  style={styles.speakerIconContainer}
                  onPress={() => playAudio(item.audioUrl)}
                >
                  <Icon name="volume-up" size={24} color="green" marginLeft={10} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.senderMessageText}>{item.text}</Text>

          </View>
        )}

        {isUser && (
          <View style={styles.messageContent}>
            <View style={styles.youHeader}>
              {item.audioUrl && (
                <TouchableOpacity
                  style={styles.speakerIconContainer}
                  onPress={() => playAudio(item.audioUrl)}
                >
                  <Icon name="volume-up" size={24} color="green" marginRight={10} />
                </TouchableOpacity>
              )}
              <Text style={styles.youLabel}>YOU</Text>
              <Image
                source={profileImage}
                style={styles.youImage}
              />

            </View>
            <Text style={styles.youMessageText}>{item.text}</Text>
          </View>
        )}
      </View>
    );
  };

  const toggleDropdown = () => {
    setIsDropdownVisible(!isDropdownVisible);
    Animated.timing(dropdownAnimation, {
      toValue: isDropdownVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        style={styles.messageList}
        onContentSizeChange={() => {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }}
        onLayout={() => {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }}
      />

      {awaitingUserChoice && (
        <View style={styles.optionButtons}>
          <TouchableOpacity onPress={() => handleButtonClick('1')} style={styles.optionButton}>
            <Text style={styles.optionButtonText}>1. I have a question regarding accommodations</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleButtonClick('2')} style={styles.optionButton}>
            <Text style={styles.optionButtonText}>2. I want to learn about Domits</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleButtonClick('3')} style={styles.optionButton}>
            <Text style={styles.optionButtonText}>3. Connect me with an expert</Text>
          </TouchableOpacity>
        </View>
      )}
      {!awaitingUserChoice && (
        <TouchableOpacity onPress={goBackToOptions} style={styles.optionButton}>
          <Text style={styles.optionButtonText}>Go Back</Text>
        </TouchableOpacity>
      )}

      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Suggestions:</Text>
          {suggestions.map((suggestion, index) => (
            <Text key={index} style={styles.suggestionText}>{suggestion}</Text>
          ))}
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={currentOption ? toggleDropdown : null}
          disabled={!currentOption}>
          <Icon name="add" size={40} color={currentOption ? 'green' : '#b6dbb9'} style={styles.icon} />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.input,
            { borderColor: currentOption ? 'green' : '#b6dbb9' }
          ]}
          placeholder={"Write a message..."}
          value={userInput}
          onChangeText={setUserInput}
          onSubmitEditing={handleSubmit}
          editable={!!currentOption}
        />
      </View>

      {isDropdownVisible && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={isDropdownVisible}
          onRequestClose={() => setIsDropdownVisible(false)}
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setIsDropdownVisible(false)}
          >
            <Animated.View
              style={[
                styles.dropdown,
                {
                  opacity: dropdownAnimation,
                  transform: [{
                    translateY: dropdownAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                },
              ]}
            >

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  downloadChatHistory();
                  setIsDropdownVisible(false);
                }}
              >
                <View style={styles.iconTextContainer}>
                  <Icon name="download" size={20} color="#34C759" style={styles.icon} />
                  <Text style={styles.dropdownItemText}>Download Chat</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  shareChatHistory();
                  setIsDropdownVisible(false);
                }}
              >
                <View style={styles.iconTextContainer}>
                  <Icon name="share" size={20} color="#34C759" style={styles.icon} />
                  <Text style={styles.dropdownItemText}> Share Chat</Text>
                </View>
              </TouchableOpacity>
              {/* speech to text  */}
              {/* <View style={styles.divider} /> */}

              {/* <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  console.log('TTS');
                  handleVoiceInput();
                  // setIsDropdownVisible(false);
                }}
              // disabled={isRecording}
              >
                <View style={styles.iconTextContainer}>
                  <Icon name="mic" size={20} color="#34C759" style={styles.icon} />
                  <Text style={styles.dropdownItemText}> {isRecording ? 'Listening...' : 'Start Recording'}</Text>
                </View>
              </TouchableOpacity> */}
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  messageList: {
    flex: 1,
    padding: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
    fontSize: 16,

  },
  messageContainer: {
    marginVertical: 8,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    color: '#333',
    fontSize: 16,
    // borderRadius: 10,
    padding: 10,
    marginVertical: 5,
    marginTop: 2,
    fontWeight: '400',
  },
  optionButtons: {
    padding: 10,
  },
  optionButton: {
    backgroundColor: '#f1f1f1',
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  optionButtonText: {
    fontSize: 16,
    color: 'green',
  },
  suggestionsContainer: {
    padding: 10,
  },
  suggestionsTitle: {
    fontWeight: 'bold',
  },
  suggestionText: {
    fontSize: 16,
    color: 'green',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopColor: '#ddd',
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: 'green',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
    marginLeft: 10,
    backgroundColor: 'white',
  },
  icon: {
    marginRight: 10, // Space between icon and text
  },
  dropdown: {
    position: 'absolute',
    bottom: 130,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    elevation: 5,
    width: 250,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'green',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignStart: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
  },
  alignEnd: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
  },
  senderHeader: {
    flexDirection: 'row',
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  youHeader: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderColor: 'green',
  },
  senderName: {
    fontSize: 20,
    color: 'black',
    fontWeight: '500',
    marginLeft: 10,
    justifyContent: 'center',
  },
  senderImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 5,
  },
  youLabel: {
    fontSize: 16,
    color: 'black',
    fontWeight: '500',
    marginRight: 10,

  },
  youImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 5,

  },
  senderMessageText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    marginTop: 2,
    fontWeight: '400',
    borderColor: 'green',
    borderStyle: 'solid',
    paddingTop: 8,
    width: 'auto',
    maxWidth: '90%',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  youMessageText: {
    fontSize: 16,
    color: '#333',
    marginRight: 15,
    marginTop: 2,
    alignSelf: 'flex-end',
    paddingTop: 8,

    width: 'auto',
    maxWidth: '100%',
    flexWrap: 'wrap',
    overflow: 'hidden',

  },
  messageContent: {
    marginVertical: 5,
  },
  senderLabel: {
    fontSize: 18,
    color: 'black',
    fontWeight: '500',
    marginLeft: 10,
    justifyContent: 'center',
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 0.6,
    backgroundColor: '#E0E0E0', // Light gray color for separation
    marginHorizontal: 10,
  },
});

export default Support;