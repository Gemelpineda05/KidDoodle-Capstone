import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tts from 'react-native-tts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function StoryScreen() {
  const { story, name, imageUri } = useLocalSearchParams<{ story: string; name?: string; imageUri?: string }>();
  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!Tts) return;

    const onFinish = () => setIsSpeaking(false);
    const onCancel = () => setIsSpeaking(false);

    Tts.addEventListener('tts-finish', onFinish);
    Tts.addEventListener('tts-cancel', onCancel);

    return () => {
      // Stop any ongoing speech when component unmounts
      if (Tts && Tts.stop) {
        Tts.stop();
      }
    };
  }, []);

  const toggleSpeech = () => {
    if (!Tts) {
      Alert.alert('Speech', 'Text-to-speech is not available. Please restart the app.');
      return;
    }

    if (isSpeaking) {
      Tts.stop();
      setIsSpeaking(false);
    } else {
      Tts.setDefaultRate(0.5);
      Tts.speak(story || '', {
        androidParams: {
          KEY_PARAM_PAN: -1,
          KEY_PARAM_VOLUME: 1.0,
          KEY_PARAM_STREAM: 'STREAM_MUSIC',
        },
        iosVoiceId: 'com.apple.ttsbundle.Samantha-compact',
        rate: 0.5,
      });
      setIsSpeaking(true);
    }
  };

  const saveStory = async () => {
    try {
      const savedStories = await AsyncStorage.getItem('savedStories');
      const stories = savedStories ? JSON.parse(savedStories) : [];

      const newStory = {
        id: Date.now().toString(),
        name: name || 'Friend',
        story: story || '',
        imageUri: imageUri || '',
        date: new Date().toISOString(),
      };

      stories.unshift(newStory); // Add to beginning of array
      await AsyncStorage.setItem('savedStories', JSON.stringify(stories));
      await AsyncStorage.setItem('clearCanvas', 'true'); // <- flag para malinis canvas

      Alert.alert(
        'Success',
        'Story saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.push('/saved')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save story');
    }
  };

  
  const splitIntoChunks = (text: string, chunkSize: number = 2): string[] => {
    const sentences = text.match(/[^.!?]+[.!?]/g) || [];
    const chunks: string[] = [];

    for (let i = 0; i < sentences.length; i += chunkSize) {
      chunks.push(sentences.slice(i, i + chunkSize).join(" ").trim());
    }

    return chunks;
  };

  const storyChunks = splitIntoChunks(story || "");


  return (
    <View style={styles.container}>
      <Text style={styles.title}>HERE'S YOUR STORY!!</Text>
      <View style={styles.card}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {storyChunks.map((chunk, index) => (
            <Text key={index} style={styles.body}>
              {chunk}
              {"\n\n"}  {/* adds space between paragraphs */}
            </Text>
          ))}
        </ScrollView>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleSpeech}>
          <Text style={styles.actionText}>{isSpeaking ? '⏸️' : '🔊'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.save]} onPress={saveStory}>
          <Text style={styles.saveText}>SAVE</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>BACK</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2B632',
    padding: 20,
  },
  title: {
    backgroundColor: '#D4952B',
    color: '#fff',
    fontWeight: '900',
    fontSize: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: screenHeight * 0.02,
    marginTop: screenHeight * 0.05,
    letterSpacing: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginBottom: screenHeight * 0.02,
    flex: 1,
    minHeight: screenHeight * 0.3,
    maxHeight: screenHeight * 0.6,
  },
  scrollContainer: {
    flex: 1,
  },
  body: {
    color: '#2C3E50',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'left',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: screenHeight * 0.02,
  },
  actionBtn: {
    backgroundColor: '#E9ECEF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  actionText: {
    fontSize: 24,
    fontWeight: '900',
  },
  save: {
    backgroundColor: '#D4952B',
    flex: 1,
    marginLeft: 20,
  },
  saveText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 1,
  },
  backBtn: {
    alignSelf: 'center',
    backgroundColor: '#D4952B',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  backText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
  },
});


