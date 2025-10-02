// components/CatCard.tsx - UPDATED

import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native'; // Import Pressable
import { Colors } from '../constants/Colors';

interface Cat {
  id: string;
  name: string;
  breed: string;
  birthdate: string;
  disease: string | null;
  image: string | null;
  normal_heartbeat: string | null;
}

interface CatCardProps {
  cat: Cat;
  // New prop for handling press event
  onPress: (cat: Cat) => void;
}

// Use the appropriate development IP address for image path
const API_BASE_URL = Platform.OS === 'android' ? 'http://192.168.1.7/CLINIC/' : 'http://localhost/CLINIC/';

export const CatCard: React.FC<CatCardProps> = ({ cat, onPress }) => {
  const imageUrl = cat.image ? `${API_BASE_URL}${cat.image}` : 'https://via.placeholder.com/150/94a3b8/0b1220?text=NO+IMG';

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.card, 
        { opacity: pressed ? 0.85 : 1 }
      ]}
      // Call the onPress function with the cat data
      onPress={() => onPress(cat)} 
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.catImage}
      />
      <View style={styles.detailsContainer}>
        <Text style={styles.nameText}>{cat.name}</Text>
        <Text style={styles.detailText}>Breed: {cat.breed}</Text>
        <Text style={styles.detailText}>DOB: {cat.birthdate}</Text>
        <Text style={styles.detailText}>Disease: {cat.disease || 'N/A'}</Text>
        <Text style={styles.detailText}>Normal HB: {cat.normal_heartbeat || 'N/A'}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.panel,
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.bg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  catImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    backgroundColor: Colors.muted,
    borderWidth: 2,
    borderColor: Colors.brand,
  },
  detailsContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.brand,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: Colors.muted,
  },
});