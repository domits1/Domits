import React from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useUploadUrl } from './Hooks/useUploadURL';

const ChatUploadAttachment = ({ onUploadComplete, iconSize = 40, iconColor = 'black', iconStyle }) => {
  const { getUploadUrl } = useUploadUrl();

  const handlePickFile = async () => {
    try {
      const file = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.images, DocumentPicker.types.video, DocumentPicker.types.allFiles],
      });

      const response = await getUploadUrl(file.type);

      if (!response.uploadUrl || !response.fields) {
        Alert.alert('Error', 'Could not get upload URL.');
        return;
      }

      const formData = new FormData();
      Object.entries(response.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      });

      const uploadRes = await fetch(response.uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error(errorText);
        Alert.alert('Upload Failed', 'Could not upload file.');
        return;
      }

      onUploadComplete?.(response.fileUrl); // Notify parent
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('Upload error:', err);
        Alert.alert('Error', 'File upload failed.');
      }
    }
  };

  return (
    <TouchableOpacity onPress={handlePickFile}>
      <Icon name="image" size={iconSize} color={iconColor} style={iconStyle} />
    </TouchableOpacity>
  );
};

export default ChatUploadAttachment;
