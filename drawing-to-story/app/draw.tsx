import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Dimensions, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DrawingCanvas, { DrawingCanvasRef } from '../components/DrawingCanvas';
import axios from 'axios';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const HF_API_URL = process.env.EXPO_PUBLIC_HF_API_URL || "";
const HF_API_TOKEN = process.env.EXPO_PUBLIC_HF_API_TOKEN || "";

export default function DrawScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const router = useRouter();
  const canvasRef = useRef<DrawingCanvasRef>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [color, setColor] = useState('#000000');
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState(0);

  const saveAndGenerate = async () => {
    if (!canvasRef.current) return;
    try {
      setIsGenerating(true);
      setLoadingStage('Converting your drawing...');
      const uri = await new Promise<string>((resolve) => {
        const sub = setTimeout(resolve, 0);
        canvasRef.current?.saveDrawing().then(() => clearTimeout(sub));
      });
    } catch { }
  };
  

  const animateProgress = (targetProgress: number, duration: number = 1000) => {
    return new Promise<void>((resolve) => {
      const startProgress = progress;
      const startTime = Date.now();

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progressRatio = Math.min(elapsed / duration, 1);
        const currentProgress = startProgress + (targetProgress - startProgress) * progressRatio;

        setProgress(Math.round(currentProgress));

        if (progressRatio < 1) {
          requestAnimationFrame(updateProgress);
        } else {
          resolve();
        }
      };

      updateProgress();
    });
  };

  const handleDrawingComplete = async (imageUri: string) => {
    try {
      setShowModal(true);
      setProgress(0);
      setIsGenerating(true);

      // Stage 1: Convert image to base64 (0-20%)
      setLoadingStage('Converting your drawing...');
      await animateProgress(90, 800);

      const blob = await (await fetch(imageUri)).blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      // Stage 2: Uploading to AI (20-40%)
      setLoadingStage('Uploading to AI...');
      await animateProgress(90, 600);

      // Stage 3: Generating story (40-80%)
      setLoadingStage('Generating story...');
      await animateProgress(80, 1200);

      const { data } = await axios.post(
        HF_API_URL,
        { image: base64, audience: 'Children' },
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${HF_API_TOKEN}` } }
      );

      // Stage 4: Complete (80-100%)
      setLoadingStage('Almost done...');
      await animateProgress(100, 500);

      // Small delay to show 100%
      await new Promise(resolve => setTimeout(resolve, 500));

      if (data && data.success && data.story) {
        setShowModal(false);
        router.push({ pathname: '/story', params: { story: data.story, name: String(name || 'Friend'), imageUri } });
      } else {
        throw new Error('No story returned');
      }
    } catch (e) {
      setShowModal(false);
      Alert.alert('Error', 'Failed to generate story. It might be due to explicit content.');
    } finally {
      setIsGenerating(false);
      setLoadingStage('');
      setProgress(0);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.tool, { backgroundColor: '#E4572E' }]}
          onPress={() => {
            Alert.alert(
              'Clear Drawing',
              'Are you sure you want to clear your drawing?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => canvasRef.current?.clearCanvas()
                }
              ]
            );
          }}
        >
          <Text style={[styles.toolIcon, { color: '#fff' }]}>✖</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tool, styles.toolPurple]} onPress={() => canvasRef.current?.undoLastStroke()}>
          <Text style={styles.toolIcon}>↶</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tool, styles.toolGreen]} onPress={() => { setColor('#000000'); }}>
          <Text style={styles.toolIcon}>✎</Text>
        </TouchableOpacity>
      </View>

      {/* Canvas */}
      <View style={styles.canvasWrap}>
        <DrawingCanvas ref={canvasRef} onDrawingComplete={handleDrawingComplete} strokeColor={color} />
      </View>

      {/* Color Palette */}
      <View style={styles.palette}>
        {['#E4572E', '#E09F3E', '#E8D44D', '#2CA58D', '#2C7BE5', '#7A5AF8'].map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.colorDot,
              {
                backgroundColor: c,
                borderWidth: color === c ? 4 : 0,
                borderColor: '#FFFFFF',
                transform: [{ scale: color === c ? 1.1 : 1 }]
              }
            ]}
          />
        ))}
      </View>

      {/* Create Button */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => {
          if (!canvasRef.current?.hasDrawing()) {
            Alert.alert('Please draw something before creating a story!');
            return;
          }
          canvasRef.current?.saveDrawing();
        }}
      >
        <Text style={styles.createText}>CREATE</Text>
      </TouchableOpacity>


      {/* Loading Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Creating Your Story!</Text>
            <ActivityIndicator size="large" color="#4ECDC4" style={styles.modalSpinner} />
            <Text style={styles.modalStage}>{loadingStage}</Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F2B632',
    flexGrow: 1,
    minHeight: screenHeight,
  },
  toolbar: {
    flexDirection: 'row',
    marginTop: screenHeight * 0.05,
    justifyContent: 'space-between',
    marginBottom: screenHeight * 0.02,
    paddingHorizontal: 20,
  },
  tool: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  toolPurple: { backgroundColor: '#7A5AF8' },
  toolGreen: { backgroundColor: '#2CA58D' },
  toolIcon: { color: '#fff', fontSize: 24, fontWeight: '900' },
  canvasWrap: {
    marginBottom: screenHeight * 0.02,
    alignItems: 'center',
  },
  palette: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: screenHeight * 0.03,
    paddingHorizontal: 20,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  createBtn: {
    alignSelf: 'center',
    backgroundColor: '#D4952B',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginBottom: screenHeight * 0.02,
  },
  createText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: 1,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  loadingText: {
    marginTop: 12,
    color: '#7F8C8D',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#F2B632',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: screenWidth * 0.8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  modalSpinner: {
    marginBottom: 20,
  },
  modalStage: {
    fontSize: 18,
    color: '#2C3E50',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E9ECEF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
});