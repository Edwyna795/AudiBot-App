import React, { useState, useEffect, useRef } from 'react';
import * as FileSystem from 'expo-file-system';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Linking,
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from "crypto-js";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

const ACR_CLOUD_HOST = 'identify-eu-west-1.acrcloud.com';
const ACR_CLOUD_ACCESS_KEY = 'e4eff7d79a11fc7fa51da825669098d1';
const ACR_CLOUD_ACCESS_SECRET = '9qEUgmj1nG1Bw5Sv3i0npzCqxzYTPmYKihCrdaEb';

export default function FirstPage({ navigation }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(1)).current;
  const rippleAnimationRef = useRef(null);
  const audioRecorderPlayerRef = useRef(null);

  useEffect(() => {
    audioRecorderPlayerRef.current = new AudioRecorderPlayer();

    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          ]);

          const recordAudioGranted = granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;
          const readStorageGranted = granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED;
          const writeStorageGranted = granted['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED;

          setHasPermission(recordAudioGranted && readStorageGranted && writeStorageGranted);
        } catch (err) {
          console.warn('Permission request error:', err);
          setHasPermission(false);
        }
      } else {
        setHasPermission(true);
      }
    };

    requestPermissions();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    return () => {
      if (audioRecorderPlayerRef.current) {
        audioRecorderPlayerRef.current.stopRecorder();
        audioRecorderPlayerRef.current.stopPlayer();
        audioRecorderPlayerRef.current.removeRecordBackListener();
        audioRecorderPlayerRef.current = null;
      }
      if (rippleAnimationRef.current) {
        rippleAnimationRef.current.stop();
      }
    };
  }, [fadeAnim]);

  const startContinuousRippleAnimation = () => {
    if (rippleAnimationRef.current) {
      rippleAnimationRef.current.stop();
    }

    const singleRippleAnimation = Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    rippleAnimationRef.current = Animated.loop(singleRippleAnimation);
    rippleScale.setValue(0);
    rippleOpacity.setValue(1);
    rippleAnimationRef.current.start();
  };

  const stopContinuousRippleAnimation = () => {
    if (rippleAnimationRef.current) {
      rippleAnimationRef.current.stop();
      rippleAnimationRef.current = null;
    }
    rippleScale.setValue(0);
    rippleOpacity.setValue(0);
  };

  const handleRecordButtonPress = async () => {
    if (isProcessing) return;
    
    if (isRecording) {
      await onStopRecord();
    } else {
      await onStartRecord();
    }
  };

  const onStartRecord = async () => {
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Microphone access is needed. Please grant permissions in settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    try {
      const path = Platform.select({
        ios: FileSystem.documentDirectory + 'audibot_recording.m4a',
        android: FileSystem.cacheDirectory + 'audibot_recording.mp4',
      });

      startContinuousRippleAnimation();
      await audioRecorderPlayerRef.current.startRecorder(path);
      setIsRecording(true);
      setRecordedAudioUri('');
      setRecognitionResult("Recording...");
    } catch (error) {
      console.error('Recording error:', error);
      setIsRecording(false);
      stopContinuousRippleAnimation();
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      setRecognitionResult("Error starting recording.");
    }
  };

  const onStopRecord = async () => {
    try {
      const result = await audioRecorderPlayerRef.current.stopRecorder();
      audioRecorderPlayerRef.current.removeRecordBackListener();
      setIsRecording(false);
      setRecordedAudioUri(result);
      stopContinuousRippleAnimation();
      setRecognitionResult("Processing audio...");

      if (result) {
        await processAudioForRecognition(result);
      } else {
        Alert.alert('Error', 'No audio file found after recording.');
        setRecognitionResult("Recording failed, no audio file.");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      stopContinuousRippleAnimation();
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
      setRecognitionResult("Error stopping recording.");
      setIsProcessing(false);
    }
  };

  const processAudioForRecognition = async (audioUri) => {
    setIsProcessing(true);

    try {
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error("Recorded audio file does not exist.");
      }
      const audioFileSize = fileInfo.size;

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const httpMethod = "POST";
      const httpUri = "/v1/identify";
      const dataType = "audio";
      const signatureVersion = "1";

      const stringToSign = `${httpMethod}\n${httpUri}\n${ACR_CLOUD_ACCESS_KEY}\n${dataType}\n${signatureVersion}\n${timestamp}`;
      const signature = CryptoJS.HmacSHA1(stringToSign, ACR_CLOUD_ACCESS_SECRET).toString(CryptoJS.enc.Base64);

      const formData = new FormData();
      formData.append('sample', {
        uri: audioUri,
        name: `audibot_recording.${Platform.OS === 'ios' ? 'm4a' : 'mp4'}`,
        type: Platform.select({
          ios: 'audio/m4a',
          android: 'audio/mp4',
        }),
      });
      formData.append('access_key', ACR_CLOUD_ACCESS_KEY);
      formData.append('sample_bytes', audioFileSize.toString());
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('data_type', dataType);
      formData.append('signature_version', signatureVersion);

      const response = await fetch(`https://${ACR_CLOUD_HOST}${httpUri}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const recognitionResponse = await response.json();

      if (recognitionResponse.status?.code === 0) {
        if (recognitionResponse.metadata?.music?.length > 0) {
          const track = recognitionResponse.metadata.music[0];
          const recognizedSong = {
            title: track.title || "Unknown Title",
            artist: track.artists?.[0]?.name || "Unknown Artist",
            album: track.album?.name || "Unknown Album",
            artwork: track.artwork_url || "https://placehold.co/150x150/CCCCCC/000000?text=No+Artwork",
          };

          setRecognitionResult(`🎶 ${recognizedSong.title}\nby ${recognizedSong.artist}`);

          const currentHistory = await AsyncStorage.getItem('history');
          const historyArray = currentHistory ? JSON.parse(currentHistory) : [];
          historyArray.unshift({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...recognizedSong,
          });
          await AsyncStorage.setItem('history', JSON.stringify(historyArray));

          navigation.navigate("myMusic", recognizedSong);
        } else {
          setRecognitionResult("No music found. Try a clearer sample!");
          Alert.alert("Recognition Failed", "Could not identify the music. Please try again.");
        }
      } else {
        const errorMsg = recognitionResponse.status?.msg || 'Unknown error';
        Alert.alert('API Error', `Error: ${errorMsg}`);
        setRecognitionResult(`Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Processing failed:', error);
      Alert.alert('Error', `Failed to identify music: ${error.message || 'Unknown error'}`);
      setRecognitionResult("Failed to identify. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Welcome to Audibot</Text>
        <Text style={styles.subtitle}>Your personal music companion</Text>

        {/* Modified button without microphone icon */}
        <TouchableOpacity
          onPress={handleRecordButtonPress}
          disabled={isProcessing}
          style={styles.recordButton}
          activeOpacity={0.7}
        >
          <View style={styles.buttonContent}>
            {isRecording && (
              <Animated.View
                style={[
                  styles.ripple,
                  {
                    transform: [{ scale: rippleScale }],
                    opacity: rippleOpacity,
                  },
                ]}
              />
            )}
            <Image
              source={{ uri: "https://i.pinimg.com/736x/8a/5c/19/8a5c19de4089d00f2922cc25b855409f.jpg" }}
              style={styles.image}
            />
            <View style={styles.iconContainer}>
              {isProcessing && (
                <ActivityIndicator size="large" color="#fff" />
              )}
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          {!hasPermission && (
            <Text style={styles.permissionText}>
              Grant microphone permissions to start!
            </Text>
          )}
          {isRecording && <Text style={styles.statusText}>Recording...</Text>}
          {isProcessing && <Text style={styles.statusText}>Processing...</Text>}
          {recognitionResult && !isProcessing && !isRecording && (
            <Text style={styles.resultText}>{recognitionResult}</Text>
          )}
          {!isRecording && !isProcessing && hasPermission && !recognitionResult && (
            <Text style={styles.instructionText}>Tap to identify music</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.myMusicButton}
          onPress={() => navigation.navigate("myMusic")}
        >
          <Text style={styles.myMusicButtonText}>My Music</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

// Your original styles remain completely unchanged
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1E90FF",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#e0f0ff",
    marginBottom: 32,
    textAlign: "center",
  },
  recordButton: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ripple: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: SCREEN_WIDTH * 0.3,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: SCREEN_WIDTH * 0.3,
    position: 'absolute',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: SCREEN_WIDTH * 0.3,
    position: 'absolute',
  },
  statusContainer: {
    marginTop: 32,
    minHeight: 50,
    alignItems: 'center',
  },
  permissionText: {
    color: 'gold',
    fontSize: 18,
    textAlign: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  resultText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  myMusicButton: {
    marginTop: 48,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  myMusicButtonText: {
    color: '#1E90FF',
    fontSize: 18,
    fontWeight: '600',
  },
});