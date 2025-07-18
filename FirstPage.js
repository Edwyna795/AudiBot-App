import React, { useRef, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Animated,
  Platform,
  Vibration,
} from "react-native";
import { Audio } from 'expo-audio'; // Updated import
import * as FileSystem from 'expo-file-system';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

// Custom Alert component
const CustomAlert = ({ visible, title, message, onConfirm, onCancel, confirmText = "OK", cancelText = "Cancel" }) => {
  if (!visible) return null;

  return (
    <View style={alertStyles.overlay}>
      <View style={alertStyles.container}>
        <Text style={alertStyles.title}>{title}</Text>
        <Text style={alertStyles.message}>{message}</Text>
        <View style={alertStyles.buttonContainer}>
          {onCancel && (
            <TouchableOpacity onPress={onCancel} style={[alertStyles.button, alertStyles.cancelButton]}>
              <Text style={alertStyles.buttonText}>{cancelText}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onConfirm} style={[alertStyles.button, alertStyles.confirmButton]}>
            <Text style={alertStyles.buttonText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const alertStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#555',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  confirmButton: {
    backgroundColor: '#1E90FF',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

// Music Recognition Service
class MusicRecognitionService {
  constructor() {
    this.apiKey = '025a159d08msh3ada06c6c3459b5p19b45bjsnb8b7675b1980';
    this.apiHost = 'shazam.p.rapidapi.com';
  }

  async recognizeMusic(audioUri) {
    try {
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch('https://shazam.p.rapidapi.com/songs/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': this.apiHost,
        },
        body: JSON.stringify({
          audio: audioBase64,
        }),
      });

      const result = await response.json();
      return this.parseShazamResponse(result);
    } catch (error) {
      console.error('Music recognition error:', error);
      throw new Error('Failed to recognize music');
    }
  }

  parseShazamResponse(response) {
    if (!response.matches || response.matches.length === 0) {
      return null;
    }

    const match = response.matches[0];
    return {
      title: match.title,
      artist: match.subtitle,
      album: match.sections?.[0]?.metadata?.find(item => item.title === 'Album')?.text,
      genre: match.genres?.primary,
      releaseDate: match.sections?.[0]?.metadata?.find(item => item.title === 'Released')?.text,
      albumArt: match.images?.coverart,
      previewUrl: match.hub?.actions?.find(action => action.type === 'uri')?.uri,
      shazamUrl: match.url,
      confidence: match.score || 0,
    };
  }
}

const RoundedImageButton = ({ uri, size, onPress, isRecording }) => (
  <View style={[styles.imageWrapper, { 
    width: size, 
    height: size, 
    borderRadius: size / 2,
    borderWidth: isRecording ? 4 : 0,
    borderColor: isRecording ? '#FF0000' : 'transparent'
  }]}>
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Image 
        source={{ uri }} 
        style={[styles.image, { 
          width: size, 
          height: size, 
          borderRadius: size / 2 
        }]} 
      />
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingPulse} />
        </View>
      )}
    </TouchableOpacity>
  </View>
);

export default function FirstPage({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const timerRef = useRef(null);
  const [recording, setRecording] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const musicRecognitionService = useRef(new MusicRecognitionService()).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fadeAnim, recording]);

  const startRecordingTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setAlertConfig({
          title: "Permission Denied",
          message: "Microphone access is required to identify music.",
          onConfirm: () => setShowAlert(false),
        });
        setShowAlert(true);
        return;
      }

      Vibration.vibrate(100);
      setIsRecording(true);
      
      // Create a new recording instance
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await newRecording.startAsync();
      
      setRecording(newRecording);
      startRecordingTimer();

    } catch (err) {
      console.error('Failed to start recording', err);
      setAlertConfig({
        title: "Recording Error",
        message: "Failed to start recording: " + err.message,
        onConfirm: () => setShowAlert(false),
      });
      setShowAlert(true);
      stopRecording();
    }
  };

  const stopRecording = async () => {
    try {
      stopRecordingTimer();
      setIsRecording(false);
      setIsAnalyzing(true);
      
      if (!recording) {
        console.warn("No active recording to stop.");
        setIsAnalyzing(false);
        return;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      await analyzeRecording(uri);
      
    } catch (err) {
      console.error('Failed to stop recording', err);
      setIsAnalyzing(false);
      setAlertConfig({
        title: "Recording Error",
        message: "Failed to stop recording: " + err.message,
        onConfirm: () => setShowAlert(false),
      });
      setShowAlert(true);
    }
  };

  const analyzeRecording = async (filePath) => {
    try {
      if (recordingTime < 5) {
        setAlertConfig({
          title: "Recording Too Short",
          message: "Please record for at least 5 seconds",
          onConfirm: () => setShowAlert(false),
        });
        setShowAlert(true);
        setIsAnalyzing(false);
        return;
      }

      const result = await musicRecognitionService.recognizeMusic(filePath);
      
      setIsAnalyzing(false);
      
      if (result) {
        navigation.navigate("MusicResult", {
          musicData: result,
          duration: recordingTime
        });
      } else {
        setAlertConfig({
          title: "No Match Found",
          message: "Unable to identify the music.",
          onConfirm: () => setShowAlert(false),
        });
        setShowAlert(true);
      }
    } catch (error) {
      setIsAnalyzing(false);
      setAlertConfig({
        title: "Recognition Failed",
        message: "An error occurred: " + error.message,
        onConfirm: () => setShowAlert(false),
      });
      setShowAlert(true);
    }
  };

  const handleRecordPress = () => {
    if (isAnalyzing) return;
    isRecording ? stopRecording() : startRecording();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getButtonText = () => {
    if (isAnalyzing) return "Analyzing...";
    if (isRecording) return "Stop Recording";
    return "Tap to Identify Music";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Welcome to AudiBot</Text>
        <Text style={styles.subtitle}>Your personal music companion</Text>

        <RoundedImageButton
          uri="https://i.pinimg.com/736x/8a/5c/19/8a5c19de4089d00f2922cc25b855409f.jpg"
          size={SCREEN_WIDTH * 0.6}
          onPress={handleRecordPress}
          isRecording={isRecording}
        />

        <Text style={styles.instructionText}>
          {getButtonText()}
        </Text>

        {isRecording && (
          <Text style={styles.recordingTimeText}>
            {formatTime(recordingTime)}
          </Text>
        )}

        {isAnalyzing && (
          <Text style={styles.analyzingText}>
            🎵 Listening for music...
          </Text>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <TouchableOpacity 
            onPress={() => navigation.navigate("myMusic")}
            style={styles.button}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Enter My Music</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <CustomAlert
        visible={showAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1E90FF",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#e0f0ff",
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  imageWrapper: {
    overflow: "hidden",
    backgroundColor: "#ffffff20",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  image: {
    resizeMode: "cover",
  },
  button: {
    backgroundColor: "#fff",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: {
    color: "#1E90FF",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  recordingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingPulse: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF0000',
    opacity: 0.8,
  },
  recordingTimeText: {
    marginTop: spacing.sm,
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  instructionText: {
    marginTop: spacing.sm,
    fontSize: 16,
    color: '#e0f0ff',
    textAlign: 'center',
  },
  analyzingText: {
    marginTop: spacing.sm,
    fontSize: 16,
    color: '#ffff00',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});