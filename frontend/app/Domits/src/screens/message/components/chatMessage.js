import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { styles } from '../styles/chatMessageStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_IMAGE_WIDTH = SCREEN_WIDTH * 0.35;

const ChatMessage = ({ message, userId, contactName, }) => {
    const { userId: senderId, text, createdAt, fileUrls = [] } = message;
    const [imageDimensions, setImageDimensions] = useState({});
    const loadedUrlsRef = useRef(new Set());

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    };

    useEffect(() => {
        fileUrls.forEach((fileUrl) => {
            if (!fileUrl.endsWith('.mp4') && !loadedUrlsRef.current.has(fileUrl)) {
                loadedUrlsRef.current.add(fileUrl);
                Image.getSize(
                    fileUrl,
                    (width, height) => {
                        const aspectRatio = height / width;
                        let displayWidth = width;
                        let displayHeight = height;
                        
                        if (width > MAX_IMAGE_WIDTH) {
                            displayWidth = MAX_IMAGE_WIDTH;
                            displayHeight = MAX_IMAGE_WIDTH * aspectRatio;
                        }
                        
                        setImageDimensions(prev => ({
                            ...prev,
                            [fileUrl]: { width: displayWidth, height: displayHeight }
                        }));
                    },
                    (error) => {
                        console.error('Error getting image size:', error);
                        setImageDimensions(prev => ({
                            ...prev,
                            [fileUrl]: { width: MAX_IMAGE_WIDTH, height: MAX_IMAGE_WIDTH * 0.75 }
                        }));
                    }
                );
            }
        });
    }, [fileUrls]);

    const isCurrentUser = senderId === userId;
    const hasText = text && text.trim().length > 0;
    const hasImages = fileUrls.length > 0;
    const isImageOnly = hasImages && !hasText;

    return (
        <View
            style={[
                styles.messageContainer,
                isCurrentUser ? styles.messageRight : styles.messageLeft,
            ]}
        >
            {isImageOnly ? (
                <View style={[styles.imageContainerWrapper, isCurrentUser && styles.imageContainerWrapperRight]}>
                    <View style={styles.imageContainer}>
                        {fileUrls.map((fileUrl, index) => {
                            const isVideo = fileUrl.endsWith('.mp4');
                            const dimensions = imageDimensions[fileUrl] || { width: MAX_IMAGE_WIDTH, height: MAX_IMAGE_WIDTH * 0.75 };
                            return (
                                <View key={index} style={[styles.imageWrapper, isCurrentUser && styles.imageWrapperRight]}>
                                    {isVideo ? (
                                        <Image
                                            source={{ uri: fileUrl }}
                                            useNativeControls
                                            resizeMode="contain"
                                            style={{ width: dimensions.width, height: dimensions.height }}
                                        />
                                    ) : (
                                        <Image
                                            source={{ uri: fileUrl }}
                                            style={{ 
                                                width: dimensions.width, 
                                                height: dimensions.height, 
                                                borderRadius: 10 
                                            }}
                                            resizeMode="contain"
                                        />
                                    )}
                                    <Text style={[styles.timestamp, isCurrentUser && styles.timestampRight]}>{formatDate(createdAt)}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            ) : (
                <View style={[styles.messageWrapper, isCurrentUser && styles.messageWrapperRight]}>
                    <View style={[styles.messageContent, isCurrentUser && styles.userMessageBubble]}>
                        {!isCurrentUser && (
                            <View style={styles.senderHeader}>
                                <Image
                                    source={require('../../pictures/domits-logo.jpg')}
                                    style={styles.senderImage}
                                />
                                <Text style={styles.senderName}>{contactName}</Text>
                            </View>
                        )}

                        {hasText && (
                            <Text style={isCurrentUser ? styles.userMessageText : styles.senderMessageText}>
                                {text}
                            </Text>
                        )}

                        {hasImages && (
                            <View
                                style={[
                                    { marginTop: hasText ? 10 : 0, flexDirection: 'row', flexWrap: 'wrap' },
                                    isCurrentUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
                                ]}
                            >
                                {fileUrls.map((fileUrl, index) => {
                                    const isVideo = fileUrl.endsWith('.mp4');
                                    const dimensions = imageDimensions[fileUrl] || { width: MAX_IMAGE_WIDTH, height: MAX_IMAGE_WIDTH * 0.75 };
                                    return isVideo ? (
                                        <Image
                                            key={index}
                                            source={{ uri: fileUrl }}
                                            useNativeControls
                                            resizeMode="contain"
                                            style={{ width: dimensions.width, height: dimensions.height, marginTop: 5 }}
                                        />
                                    ) : (
                                        <Image
                                            key={index}
                                            source={{ uri: fileUrl }}
                                            style={{ 
                                                width: dimensions.width, 
                                                height: dimensions.height, 
                                                marginTop: 5, 
                                                borderRadius: 10 
                                            }}
                                            resizeMode="contain"
                                        />
                                    );
                                })}
                            </View>
                        )}
                    </View>
                    <Text style={[styles.timestamp, isCurrentUser && styles.timestampRight]}>{formatDate(createdAt)}</Text>
                </View>
            )}
        </View>
    );
};



export default ChatMessage;
