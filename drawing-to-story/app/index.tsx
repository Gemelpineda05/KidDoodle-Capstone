import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Clouds */}
      <Image
        source={require('../assets/images/cloud1.png')} // unang cloud image
        style={styles.cloud1}
        resizeMode="contain"
      />
      <Image
        source={require('../assets/images/cloud2.png')} // pangalawang cloud image
        style={styles.cloud2}
        resizeMode="contain"
      />


      {/* Middle Section */}
      <View style={styles.middleSection}>
        <Image
          source={require('../assets/images/BATA.png')}
          style={styles.appLogo}
          resizeMode="contain"
        />

        {/* Play Button */}
        <TouchableOpacity style={styles.playButton} onPress={() => router.push('/enter-name')}>
          <Text style={styles.playText}>► PLAY</Text>
        </TouchableOpacity>

        {/* Saved Stories Button */}
        <TouchableOpacity style={styles.savedButton} onPress={() => router.push('/saved')}>
          <Text style={styles.savedText}>📚 SAVED STORIES</Text>
        </TouchableOpacity>
      </View>

      {/* Palette Logo at Bottom */}
      <Image
        source={require('../assets/images/paints.png')}
        style={styles.paletteLogo}
        resizeMode="contain"
      />
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFCD28',
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'space-between', // divide screen top/middle/bottom
  },
  middleSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // occupy middle space
  },
  appLogo: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.25,
    marginBottom: 25, // space before buttons
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  playButton: {
    backgroundColor: '#D4952B',
    paddingVertical: 14, // dati 18
    paddingHorizontal: 40, // dati 50
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginBottom: 15,
  },
  playText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
  },
  savedButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  savedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paletteLogo: {
    width: screenWidth * 0.5,
    height: screenHeight * 0.15,
    marginBottom: 30, // distance from bottom
    alignSelf: 'center',
  },
  cloud1: {
    position: 'absolute',
    top: screenHeight * 0.05,   // mas mataas
    left: 10,
    width: screenWidth * 0.35,
    height: screenHeight * 0.10,
    opacity: 0.9,
  },
  cloud2: {
    position: 'absolute',
    bottom: screenHeight * 0.15,  // nilagay sa ibaba, hindi sa middle
    right: 10,
    width: screenWidth * 0.40,
    height: screenHeight * 0.18,
    opacity: 0.9,
  },
});
