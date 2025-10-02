// screens/LoginScreen.tsx - UPDATED

import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { RootStackParamList } from '../navigation/RootNavigator';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'> & {
  onLogin: (userData: any) => void; // Update onLogin to accept user data
};

// Use the appropriate development IP address:
// 10.0.2.2 for Android Emulator (works out-of-the-box)
// localhost or 127.0.0.1 for iOS Simulator
// Your actual local network IP (e.g., 192.168.1.X) for a physical phone
const API_BASE_URL = Platform.OS === 'android' ? 'http://192.168.1.7/CLINIC/API/OWNER/login.php' : 'http://localhost/CLINIC/API/OWNER/login.php';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('mmarcusivanmiranda@gmail.com'); // Pre-fill for testing
  const [password, setPassword] = React.useState('marcus'); // Use a known password for testing (e.g., '123' if you set it up like that)
  const [loading, setLoading] = React.useState(false);

  const handleLoginPress = async () => {
    if (!email || !password) {
      Alert.alert("Login Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Successful login: pass the user data up to RootNavigator
        onLogin(data.owner); 
      } else {
        // Failed login
        Alert.alert("Login Failed", data.message || "An unknown error occurred.");
      }
    } catch (error) {
      console.error("Network or Fetch Error:", error);
      Alert.alert("Connection Error", "Could not connect to the server. Check XAMPP and network settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Ionicons name="lock-closed-outline" size={80} color={Colors.brand} style={styles.icon} />
        <Text style={styles.title}>Welcome Back</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleLoginPress} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.bg} />
          ) : (
            <Text style={styles.buttonText}>LOG IN</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// ... (Styles remain the same)
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.bg,
      justifyContent: 'center',
      paddingHorizontal: 25,
    },
    content: {
      alignItems: 'center',
      width: '100%',
    },
    icon: {
      marginBottom: 30,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: Colors.text,
      marginBottom: 40,
    },
    input: {
      width: '100%',
      height: 50,
      backgroundColor: Colors.panel,
      borderRadius: 8,
      paddingHorizontal: 15,
      fontSize: 16,
      color: Colors.text,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    loginButton: {
      width: '100%',
      height: 50,
      backgroundColor: Colors.brand,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
    },
    buttonText: {
      color: Colors.bg,
      fontSize: 18,
      fontWeight: 'bold',
    },
  });