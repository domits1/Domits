import React, {useState} from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
// import DocumentPicker from 'react-native-document-picker';

const API_BASE_URL =
  'https://bugbtl25mj.execute-api.eu-north-1.amazonaws.com/sendEmail'

export default function Contact() {
  const [sourceEmail, setSourceEmail] = useState('')
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  // const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')

  const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // const pickAttachments = async () => {
  //   try {
  //     const results = await DocumentPicker.pickMultiple({
  //       type: [DocumentPicker.types.allFiles],
  //     });
  //
  //     const maxFiles = 5;
  //     const maxFileSize = 5 * 1024 * 1024; // 5MB
  //
  //     if (results.length > maxFiles) {
  //       Alert.alert('Error', 'You can upload a maximum of 5 files.');
  //       return;
  //     }
  //
  //     for (let file of results) {
  //       if (file.size > maxFileSize) {
  //         Alert.alert(
  //           'Error',
  //           `File "${file.name}" exceeds the 5 MB size limit.`,
  //         );
  //         return;
  //       }
  //     }
  //
  //     setAttachments(results);
  //   } catch (err) {
  //     if (!DocumentPicker.isCancel(err)) {
  //       console.error(err);
  //       Alert.alert('Error', 'Failed to pick files.');
  //     }
  //   }
  // };

  const handleSubmit = async () => {
    if (!name || !subject || !sourceEmail || !message) {
      setFeedbackMessage('Please fill out all fields.')
      return
    }

    if (!isValidEmail(sourceEmail)) {
      setFeedbackMessage('Please enter a valid email address.')
      return
    }

    setIsSubmitting(true)

    const payload = {
      name,
      subject,
      sourceEmail,
      message,
      attachments: [],
    }

    // if (attachments.length > 0) {
    //   for (let file of attachments) {
    //     const fileData = await fetch(file.uri).then(res => res.blob());
    //     payload.attachments.push({
    //       filename: file.name,
    //       content: await fileData.text(),
    //       contentType: file.type,
    //     });
    //   }
    // }

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        Alert.alert('Success', 'Message sent successfully!')
        setFeedbackMessage('Message sent successfully!')
        // Reset form
        setName('')
        setSubject('')
        setSourceEmail('')
        setMessage('')
        // setAttachments([]);
      } else {
        setFeedbackMessage(
          `Failed to send message: ${data.error || 'Unknown error'}`,
        )
      }
    } catch (error) {
      console.error(error)
      setFeedbackMessage(`Error sending message: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Contact Form</Text>
        <Text style={styles.description}>
          We are 24/7 available to ensure optimal reachability across all time
          zones. The more specific you are in your reach out, the faster we can
          assist you! Check your spam inbox if you don't receive a response
          within 24 hours.
        </Text>

        {feedbackMessage ? (
          <Text
            style={[
              styles.feedback,
              feedbackMessage.includes('successfully')
                ? styles.success
                : styles.error,
            ]}>
            {feedbackMessage}
          </Text>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Your Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
        />
        <TextInput
          style={styles.input}
          placeholder="Your Email"
          value={sourceEmail}
          onChangeText={setSourceEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Your Message"
          value={message}
          onChangeText={setMessage}
          multiline
        />

        {/*<TouchableOpacity*/}
        {/*  style={styles.attachmentButton}*/}
        {/*  onPress={pickAttachments}>*/}
        {/*  <Text style={styles.attachmentButtonText}>Add Attachments</Text>*/}
        {/*</TouchableOpacity>*/}

        {/*{attachments.map((file, index) => (*/}
        {/*  <Text key={index} style={styles.attachmentName}>*/}
        {/*    {file.name}*/}
        {/*  </Text>*/}
        {/*))}*/}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Send Message</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

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
})
