import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function EnterNameScreen() {
  const router = useRouter();
  const [name, setName] = useState('');

  const onContinue = () => {
    router.push({ pathname: '/draw', params: { name: name || 'Friend' } });
  };

  return (
    <View style={styles.container}>
      {/* Top Clouds */}
      <View style={styles.cloudsContainer}>
        <Image
          source={require('../assets/images/cloud1.png')}
          style={styles.cloud1}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/images/cloud2.png')}
          style={styles.cloud2}
          resizeMode="contain"
        />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.tagline}>WHERE EVERY DOODLE{"\n"}BEGINS A NEW TALE</Text>

        <View style={styles.inputCard}>
          <Text style={styles.label}>ENTER YOUR NAME:</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Type here"
            style={styles.input}
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity style={styles.cta} onPress={onContinue}>
          <Text style={styles.ctaText}>CONTINUE</Text>
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
    backgroundColor: '#F2B632',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cloudsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: screenHeight * 0.05,
    marginBottom: screenHeight * 0.03,
  },
  cloud1: {
    width: screenWidth * 0.35,
    height: screenHeight * 0.10,
    opacity: 0.9,
  },
  cloud2: {
    width: screenWidth * 0.40,
    height: screenHeight * 0.18,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  tagline: {
    color: '#2C3E50',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 24,
    lineHeight: 30,
    marginBottom: screenHeight * 0.05,
    letterSpacing: 1,
  },
  inputCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginBottom: screenHeight * 0.03,
  },
  label: {
    color: '#2C3E50',
    fontWeight: '900',
    marginBottom: 12,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cta: {
    backgroundColor: '#D4952B',
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginTop: 20,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  paletteLogo: {
    width: screenWidth * 0.5,
    height: screenHeight * 0.15,
    marginBottom: 30,
  },
});
