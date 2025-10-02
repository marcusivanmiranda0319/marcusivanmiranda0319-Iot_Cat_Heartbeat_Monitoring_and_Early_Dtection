// navigation/RootNavigator.tsx - UPDATED

import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Colors } from '../constants/Colors';
import { LoginScreen } from '../screens/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';

// Define the type for the user object
type User = {
    id: number;
    name: string;
    email: string;
    image: string;
};

// Define types for navigation (Main now requires user data)
export type RootStackParamList = {
  Login: undefined;
  Main: { onLogout: () => void; user: User }; // User data added
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Define the custom dark theme
const CustomDarkTheme = {
  // ... (Keep the rest of the CustomDarkTheme definition as before)
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.brand,
    background: Colors.bg,
    card: Colors.panel,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.red,
  },
};

export const RootNavigator = () => {
  // State to hold user data (null means logged out)
  const [user, setUser] = React.useState<User | null>(null);

  // Function to handle login (store user data)
  const handleLogin = (userData: User) => setUser(userData);

  // Function to handle logout
  const handleLogout = React.useCallback(() => setUser(null), []);

  return (
    <NavigationContainer theme={CustomDarkTheme}>
      <Stack.Navigator>
        {user ? (
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            // Pass the user object and logout function as params
            initialParams={{ onLogout: handleLogout, user: user }} 
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen
            name="Login"
            options={{ headerShown: false }}
          >
            {/* Pass the updated handleLogin function to the login screen */}
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};