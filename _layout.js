import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons'; // Example icon library

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1E90FF', // Active tab color
        tabBarInactiveTintColor: '#808080', // Inactive tab color
        tabBarStyle: {
          backgroundColor: '#f0f4f7', // Tab bar background color
          borderTopWidth: 0, // Remove top border
          elevation: 5, // Shadow for Android
          shadowColor: '#000', // Shadow for iOS
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerShown: false, // Hide header by default for tab screens
      }}
    >
      <Tabs.Screen
        name="FirstPage" // This matches your FirstPage.js file name
        options={{
          title: 'Identify', // Tab title
          tabBarIcon: ({ color }) => (
            <FontAwesome name="microphone" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="myMusic" // This matches your myMusic.js file name
        options={{
          title: 'My Music', // Tab title
          tabBarIcon: ({ color }) => (
            <FontAwesome name="music" size={24} color={color} />
          ),
        }}
      />
      {/* Add other tab screens here if you have more files in (tabs) */}
    </Tabs>
  );
}
