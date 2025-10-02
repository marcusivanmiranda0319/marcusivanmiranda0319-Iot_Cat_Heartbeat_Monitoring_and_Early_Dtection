// screens/HomeScreen.tsx - CORRECTED

import { useNavigation } from '@react-navigation/native'; // CORRECTED: Import useNavigation from @react-navigation/native
import { NativeStackScreenProps } from '@react-navigation/native-stack'; // Keep NativeStackScreenProps
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { CatCard } from '../components/CatCard';
import { Colors } from '../constants/Colors';
import { HomeStackParamList } from '../navigation/MainTabNavigator';

interface Cat {
    id: string;
    name: string;
    breed: string;
    birthdate: string;
    disease: string | null;
    image: string | null;
    normal_heartbeat: string | null;
}

// Define the navigation type for the Home Screen
// Use useNavigation instead of accessing props directly for type safety with the hook
type HomeScreenNavigationProps = NativeStackScreenProps<HomeStackParamList, 'Home'>['navigation'];

interface HomeScreenProps {
    ownerId: number; // Prop passed from MainTabNavigator
}

// API URL uses query parameter 'owner_id'
const API_BASE_URL = Platform.OS === 'android' 
    ? 'http://192.168.1.7/CLINIC/API/CAT/display.php' 
    : 'http://localhost/CLINIC/API/CAT/display.php';

export const HomeScreen: React.FC<HomeScreenProps> = ({ ownerId }) => {
    const navigation = useNavigation<HomeScreenNavigationProps>(); // Get navigation hook
    const [cats, setCats] = useState<Cat[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCats = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}?owner_id=${ownerId}`);
            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                setCats(data.data);
            } else {
                setCats([]);
                Alert.alert("Data Error", data.message || "Failed to load cat data.");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            Alert.alert("Network Error", "Could not connect to the API to fetch cat data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCats();
    }, [ownerId]);

    // Handler for card press
    const handleCatPress = (cat: Cat) => {
        // Navigate to the 'Graph' screen within the HomeStack, passing the cat data
        navigation.navigate('Graph', { cat: cat }); 
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.brand} />
                <Text style={styles.loadingText}>Loading cats...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your Registered Cats</Text>
            {cats.length > 0 ? (
                <FlatList
                    data={cats}
                    keyExtractor={(item) => item.id.toString()}
                    // Pass the navigation handler to CatCard
                    renderItem={({ item }) => <CatCard cat={item} onPress={handleCatPress} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.center}>
                    <Text style={styles.subtitle}>No cats registered under your account.</Text>
                    <Text style={styles.bodyText}>Use the 'Record' tab to add a new cat.</Text>
                </View>
            )}
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 150, // Added space for the floating navigation bar
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.brand,
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 16,
    color: Colors.muted,
    textAlign: 'center',
  },
  loadingText: {
    color: Colors.muted,
    marginTop: 10,
  }
});