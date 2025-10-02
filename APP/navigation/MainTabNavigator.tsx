// navigation/MainTabNavigator.tsx - UPDATED

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Platform } from 'react-native';
import { CustomHeader } from '../components/CustomHeader';
import { Colors } from '../constants/Colors';
import { GraphScreen } from '../screens/GraphScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { RecordScreen } from '../screens/RecordScreen'; // Keep using RecordScreen
import { RootStackParamList } from './RootNavigator';

// Define the type for the user object (must match RootNavigator)
type User = RootStackParamList['Main']['user'];

// --- Type Definitions ---
export type TabParamList = {
  HomeTab: undefined;
  RecordTab: undefined;
};

// Define the Cat type here for type safety across screens
interface Cat {
    id: string;
    name: string;
    breed: string;
    birthdate: string;
    disease: string | null;
    image: string | null;
    normal_heartbeat: string | null;
}

// HomeStackParamList now includes 'Graph' and requires Cat data
export type HomeStackParamList = {
  Home: undefined;
  Graph: { cat: Cat }; 
};

type MainTabNavigatorProps = NativeStackScreenProps<RootStackParamList, 'Main'>;

// --- Component Definitions ---

const Tab = createBottomTabNavigator<TabParamList>(); 
const HomeStack = createNativeStackNavigator<HomeStackParamList>(); 

// 1. HomeStackNavigator (Wrapper for HomeScreen and GraphScreen)
const HomeStackNavigator: React.FC<{ onLogout: () => void; user: User }> = ({ onLogout, user }) => {
  const IMAGE_URL = Platform.OS === 'android' 
    ? `http://192.168.1.7/CLINIC/${user.image}` 
    : `http://localhost/CLINIC/${user.image}`;

  const CustomHeaderComponent = () => (
    <CustomHeader
      userName={user.name}
      userImage={IMAGE_URL}
      onLogout={onLogout}
    />
  );
  
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Home"
        options={{
          header: CustomHeaderComponent, // Use Custom Header
        }}
      >
        {/* Pass the owner's ID to HomeScreen */}
        {(props) => <HomeScreen {...props} ownerId={user.id} />} 
      </HomeStack.Screen>

      {/* Add GraphScreen to the HomeStack */}
      <HomeStack.Screen
        name="Graph"
        options={({ route }) => ({
            title: route.params.cat.name, // Set header title to cat's name
            headerBackTitle: 'Cats', // iOS back button text
            header: CustomHeaderComponent, // Use Custom Header
        })}
      >
        {/* Pass the cat data and owner data implicitly/explicitly */}
        {(props) => <GraphScreen {...props} ownerId={user.id} />}
      </HomeStack.Screen>
    </HomeStack.Navigator>
  );
};

// 2. Main Tab Navigator
export const MainTabNavigator: React.FC<MainTabNavigatorProps> = ({ route }) => {
  const { onLogout, user } = route.params;

  // Default Header component for RecordTab
  const DefaultHeader = () => {
    const IMAGE_URL = Platform.OS === 'android' 
        ? `http://192.168.1.7/CLINIC/${user.image}` 
        : `http://localhost/CLINIC/${user.image}`;

    return (
      <CustomHeader
        userName={user.name}
        userImage={IMAGE_URL}
        onLogout={onLogout}
      />
    );
  };

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'HomeTab') {
            iconName = 'home-outline';
          } else if (route.name === 'RecordTab') {
            iconName = 'time-outline'; // Changed icon to suggest history/records
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.brand,
        tabBarInactiveTintColor: Colors.muted,
        
        // --- FLOATING TAB BAR STYLE ---
        tabBarStyle: {
          backgroundColor: Colors.panel,
          borderTopColor: 'transparent',
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
          
          // Floating properties
          position: 'absolute', 
          marginHorizontal: 15, 
          bottom: 20,
          borderRadius: 15, 
          shadowColor: Colors.bg, 
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 5,
          elevation: 10, 
        },
        tabBarBackground: () => (
            <></>
        ),
        
        // Only RecordTab needs the default header now
        header: DefaultHeader, 
      })}
    >
        {/* Updated RecordTab to pass ownerId and reflect its new purpose */}
      <Tab.Screen 
        name="RecordTab" 
        options={{ title: 'Records History' }}
      >
        {/* Pass ownerId to RecordScreen (which is now a historical viewer) */}
        {() => <RecordScreen ownerId={user.id} />}
      </Tab.Screen>

      <Tab.Screen
        name="HomeTab"
        options={{ title: 'Home', headerShown: false }}
      >
        {/* Use render function to pass user and onLogout to HomeStackNavigator */}
        {() => <HomeStackNavigator onLogout={onLogout} user={user} />}
      </Tab.Screen>

    </Tab.Navigator>
  );
};