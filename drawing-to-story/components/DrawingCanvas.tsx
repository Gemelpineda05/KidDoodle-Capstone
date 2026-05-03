import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, PanResponder, Dimensions, Alert } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive canvas dimensions - Portrait style for better drawing length
const getCanvasDimensions = () => {
  const padding = 40; // Total horizontal padding
  const canvasWidth = screenWidth - padding;
  const canvasHeight = Math.min(canvasWidth * 1.4, screenHeight * 0.6); // Portrait ratio (3:4), max 60% of screen height
  return { canvasWidth, canvasHeight };
};

interface Point {
  x: number;
  y: number;
}

interface DrawingCanvasProps {
  onDrawingComplete: (imageUri: string) => void;
  onClearCanvas?: () => void;
  strokeColor: string;
}

export interface DrawingCanvasRef {
  saveDrawing: () => Promise<void>;
  clearCanvas: () => void;
  undoLastStroke: () => void;
  hasDrawing: () => boolean;
}

type ColoredPath = { points: Point[]; color: string };

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({ onDrawingComplete, onClearCanvas, strokeColor }, ref) => {
  const [paths, setPaths] = useState<ColoredPath[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const hasDrawing = () => {
    return paths.length > 0;
  };

  useImperativeHandle(ref, () => ({
    saveDrawing,
    clearCanvas,
    undoLastStroke,
    hasDrawing,
  }));

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const newPath = [{ x: locationX, y: locationY }];
      setCurrentPath(newPath);
      setIsDrawing(true);
    },
    onPanResponderMove: (evt) => {
      if (isDrawing) {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(prev => [...prev, { x: locationX, y: locationY }]);
      }
    },
    onPanResponderRelease: () => {
      if (isDrawing) {
        setPaths(prev => [...prev, { points: currentPath, color: strokeColor }]);
        setCurrentPath([]);
        setIsDrawing(false);
      }
    },
  });

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath([]);
    setIsDrawing(false);
    if (onClearCanvas) {
      onClearCanvas();
    }
  };

  const undoLastStroke = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const saveDrawing = async () => {
    try {
      if (!viewShotRef.current) {
        Alert.alert('Error', 'Drawing canvas not ready');
        return;
      }

      // Capture the drawing as an image
      const imageUri = await viewShotRef.current?.capture();
      
      // Call the callback with the image URI
      onDrawingComplete(imageUri);
    } catch (error) {
      console.error('Error saving drawing:', error);
      Alert.alert('Error', 'Failed to save drawing');
    }
  };

  const renderPath = (path: ColoredPath, index: number) => {
    if (path.points.length < 2) return null;
    
    const pathData = path.points.map((point, i) => 
      i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    ).join(' ');

    return (
      <Path
        key={index}
        d={pathData}
        stroke={path.color}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  const renderCurrentPath = () => {
    if (currentPath.length < 2) return null;
    
    const pathData = currentPath.map((point, i) => 
      i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    ).join(' ');

    return (
      <Path
        d={pathData}
        stroke={strokeColor}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  const { canvasWidth, canvasHeight } = getCanvasDimensions();

  return (
    <View style={styles.container}>
      <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.8 }}>
        <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]} {...panResponder.panHandlers}>
          <Svg
            width={canvasWidth}
            height={canvasHeight}
            style={styles.svg}
          >
            <Rect width="100%" height="100%" fill="white" />
            {paths.map((path, index) => renderPath(path, index))}
            {renderCurrentPath()}
          </Svg>
        </View>
      </ViewShot>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
  },
  canvas: {
    backgroundColor: 'white',
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  svg: {
    backgroundColor: 'white',
    borderRadius: 13,
  },
});

export default DrawingCanvas;
