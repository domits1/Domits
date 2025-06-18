import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
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
    marginRight: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    backgroundColor: '#E0E0E0',
    marginHorizontal: 10,
  },
});