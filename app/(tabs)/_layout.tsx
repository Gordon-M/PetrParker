import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Feather from '@expo/vector-icons/Feather';
// Import MaterialCommunityIcons for the hat
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const RANGER_GREEN = '#2D5A27';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: RANGER_GREEN, 
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        // Centering logic:
        tabBarIconStyle: {
          marginTop: 0, 
          marginBottom: 0,
        },
        tabBarStyle: {
          position: 'absolute',
          alignSelf: 'center',
          left: 0,
          right: 0,      
          bottom: 25, // Adjusted slightly for balance
          marginHorizontal: '12.5%',
          height: 45, 
          borderRadius: 30,
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          paddingBottom: 0, 
          justifyContent: 'center', // Helps with vertical centering
        }}}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="rangertips"
        options={{
          title: 'Tips',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="hat-fedora" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Feather name="search" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}