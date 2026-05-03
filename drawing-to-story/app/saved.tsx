import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tts from 'react-native-tts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SavedStory {
  id: string;
  name: string;
  story: string;
  imageUri?: string;
  date: string;
}

const colors = ['#E74C3C', '#F39C12', '#F1C40F', '#2ECC71'];
const icons = ['❤️', '⭕', '🔺', '⬜'];

export default function SavedScreen() {
  const router = useRouter();
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [selectedStory, setSelectedStory] = useState<SavedStory | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    loadSavedStories();

    if (Tts) {
      const onFinish = () => setIsSpeaking(false);
      const onCancel = () => setIsSpeaking(false);

      Tts.addEventListener('tts-finish', onFinish);
      Tts.addEventListener('tts-cancel', onCancel);

      return () => {
        if (Tts && Tts.stop) {
          Tts.stop();
        }
      };
    }
  }, []);

  const loadSavedStories = async () => {
    try {
      const stories = await AsyncStorage.getItem('savedStories');
      if (stories) {
        setSavedStories(JSON.parse(stories));
      }
    } catch (error) {
      console.error('Error loading saved stories:', error);
    }
  };

  const truncateStory = (story: string, maxLength: number = 50) => {
    if (story.length <= maxLength) return story;
    return story.substring(0, maxLength) + '...';
  };

  const openStory = (story: SavedStory) => {
    setSelectedStory(story);
    setShowModal(true);
  };

  const closeModal = () => {
    if (Tts && Tts.stop) {
      Tts.stop();
    }
    setIsSpeaking(false);
    setShowModal(false);
  };

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
      Tts.speak(selectedStory?.story || '', {
        androidParams: {
          KEY_PARAM_PAN: -1,
          KEY_PARAM_VOLUME: 1.0,
          KEY_PARAM_STREAM: 'STREAM_MUSIC',
        },
        iosVoiceId: 'com.apple.ttsbundle.Moira-compact',
        rate: 0.5,
      });
      setIsSpeaking(true);
    }
  };

  const deleteStory = async () => {
    if (!selectedStory) return;

    Alert.alert(
      'Delete Story',
      `Are you sure you want to delete ${selectedStory.name}'s story?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedStories = savedStories.filter(story => story.id !== selectedStory.id);
              await AsyncStorage.setItem('savedStories', JSON.stringify(updatedStories));
              setSavedStories(updatedStories);
              closeModal();
              Alert.alert('Story deleted successfully!');
            } catch (error) {
              Alert.alert('Failed to delete story');
            }
          },
        },
      ]
    );
  };

  //  Split into chunks (same as StoryScreen)
  const splitIntoChunks = (text: string, chunkSize: number = 2): string[] => {
    const sentences = text.match(/[^.!?]+[.!?]/g) || [];
    const chunks: string[] = [];

    for (let i = 0; i < sentences.length; i += chunkSize) {
      chunks.push(sentences.slice(i, i + chunkSize).join(" ").trim());
    }

    return chunks;
  };

  const storyChunks = splitIntoChunks(selectedStory?.story || "");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SAVED STORIES</Text>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {savedStories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No saved stories yet!</Text>
            <Text style={styles.emptySubtext}>Create and save your first story!</Text>
          </View>
        ) : (
          savedStories.map((story, idx) => (
            <TouchableOpacity
              key={story.id}
              style={[styles.item, { borderLeftColor: colors[idx % colors.length] }]}
              onPress={() => openStory(story)}
            >
              {story.imageUri ? (
                <Image source={{ uri: story.imageUri }} style={styles.drawingThumbnail} />
              ) : (
                <Text style={styles.icon}>{icons[idx % icons.length]}</Text>
              )}
              <View style={styles.storyInfo}>
                <Text style={styles.storyTitle}>{story.name}'s Story</Text>
                <Text style={styles.storyPreview}>{truncateStory(story.story)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/draw')}>
        <Text style={styles.backText}>BACK</Text>
      </TouchableOpacity>

      {/* Story Modal */}
      <Modal visible={showModal} transparent={true} animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{selectedStory?.name}'s Story</Text>
            {selectedStory?.imageUri && (
              <Image source={{ uri: selectedStory.imageUri }} style={styles.modalDrawing} />
            )}
            <ScrollView style={styles.modalScroll}>
              {storyChunks.map((chunk, index) => (
                <Text key={index} style={styles.modalStory}>
                  {chunk}
                  {"\n\n"} {/* spacing between chunks */}
                </Text>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.speechBtn} onPress={toggleSpeech}>
                <Text style={styles.speechText}>{isSpeaking ? '⏸️' : '🔊'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={deleteStory}>
                <Text style={styles.deleteText}>🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    letterSpacing: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  scrollContainer: {
    flex: 1,
    marginBottom: screenHeight * 0.02,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  item: {
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: screenHeight * 0.015,
    borderLeftWidth: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  icon: {
    fontSize: 24,
    marginRight: 16,
  },
  drawingThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 16,
    backgroundColor: '#f0f0f0',
  },
  storyInfo: {
    flex: 1,
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C3E50',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  storyPreview: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 18,
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
    marginTop: screenHeight * 0.02,
  },
  backText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#F2B632',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 1,
  },
  modalDrawing: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
  },
  modalScroll: {
    maxHeight: screenHeight * 0.4,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexShrink: 1,
  },
  modalStory: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2C3E50',
    textAlign: 'left',
    flexWrap: 'wrap',
    flexShrink: 1, 
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speechBtn: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  speechText: {
    fontSize: 20,
    fontWeight: '900',
  },
  deleteBtn: {
    backgroundColor: '#E74C3C',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  deleteText: {
    fontSize: 20,
    fontWeight: '900',
  },
  closeBtn: {
    backgroundColor: '#D4952B',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  closeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});


