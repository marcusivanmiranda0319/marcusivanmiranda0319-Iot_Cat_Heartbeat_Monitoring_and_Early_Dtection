// screens/GraphScreen.tsx - CORRECTED (Explicitly typed 's')

import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { HomeStackParamList } from '../navigation/MainTabNavigator';

// Local Color Definitions to ensure conditional styling works (assuming light/dark contrast)
const SUCCESS_COLOR = '#4BB543'; // Green
const ERROR_COLOR = '#FF3333'; // Red

// Define the types from the API responses/props
interface Cat {
    id: string;
    name: string;
    breed: string;
    birthdate: string;
    disease: string | null;
    image: string | null;
    normal_heartbeat: string | null;
}

interface Record {
    id: string;
    cat_id: string;
    heartbeat: string;
    recorded_at: string;
}

type GraphScreenProps = NativeStackScreenProps<HomeStackParamList, 'Graph'> & {
    ownerId: number;
};

// Utility function
const fmtDateTime = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${dd}/${mm}/${yy} : ${hours}:${minutes} ${ampm}`;
};

// Possible diseases
const possibleDiseases = {
    'Cardiomyopathies': [{ name: 'Hypertrophic Cardiomyopathy (HCM)', range: '>220 bpm' }, { name: 'Dilated Cardiomyopathy (DCM)', range: 'elevated heart rate' }, { name: 'Restrictive Cardiomyopathy (RCM)', range: 'often associated with tachycardia' }],
    'Arrhythmias (Abnormal Rhythms)': [{ name: 'Bradycardia', range: '<140 bpm' }, { name: 'Third-Degree Atrioventricular (AV) Block', range: '40-65 bpm' }, { name: 'Tachycardia', range: '>220 bpm' }, { name: 'Supraventricular Tachycardia (SVT)', range: '150-380 bpm' }, { name: 'Ventricular Tachycardia (VT)', range: '>240 bpm' }, { name: 'Sinus Arrhythmia', range: '140-220 bpm' }],
    'Congenital Heart Defects': [{ name: 'Ventricular Septal Defect (VSD)', range: 'high-end of the normal range or above' }, { name: 'Patent Ductus Arteriosus (PDA)', range: 'elevated' }]
};

function getMatchingDiseases(bpm: number, normalRange: string): string[] {
    let matchingDiseases: string[] = [];
    // Safely parse the cat's normal heart rate range
    // EXPLICITLY TYPED 's' HERE
    const [normalMin, normalMax] = normalRange.split('-').map((s: string) => parseInt(s.trim())); 

    for (const group in possibleDiseases) {
        let groupMatches: string[] = [];
        // @ts-ignore
        for (const disease of possibleDiseases[group]) {
            let rangeMatch = false;
            const rangeText = disease.range;

            if (rangeText.includes('<')) {
                const value = parseInt(rangeText.replace(/<|bpm/g, '').trim());
                if (!isNaN(value) && bpm < value) rangeMatch = true;
            } else if (rangeText.includes('>')) {
                const value = parseInt(rangeText.replace(/>|bpm/g, '').trim());
                if (!isNaN(value) && bpm > value) rangeMatch = true;
            } else if (rangeText.includes('-')) {
                // Fixed and safer range parsing
                // EXPLICITLY TYPED 's' HERE
                const parts = rangeText.replace(/bpm/g, '').split('-').map((s: string) => parseInt(s.trim()));
                const min = parts[0];
                const max = parts[1];
                
                if (!isNaN(min) && !isNaN(max) && parts.length === 2 && bpm >= min && bpm <= max) {
                    rangeMatch = true;
                }
            } else if ((rangeText.includes('elevated') || rangeText.includes('tachycardia')) && !isNaN(normalMax) && bpm > normalMax) {
                rangeMatch = true;
            }
            if (rangeMatch) groupMatches.push(`${disease.name}: ${disease.range}`);
        }
        if (groupMatches.length > 0) {
            matchingDiseases.push(group);
            matchingDiseases = matchingDiseases.concat(groupMatches);
        }
    }
    return matchingDiseases;
}


// API URL
const API_BASE_URL = Platform.OS === 'android' 
    ? 'http://192.168.1.7/CLINIC/' 
    : 'http://localhost/CLINIC/';

const RECORD_API_URL = `${API_BASE_URL}API/RECORD/display.php`;

export const GraphScreen: React.FC<GraphScreenProps> = ({ route }) => {
    // Get cat data from navigation params
    const cat = route.params?.cat; 

    // State for record data and loading
    const [records, setRecords] = useState<Record[]>([]);
    const [loading, setLoading] = useState(true);

    // Computed values
    const imageUrl = cat?.image ? `${API_BASE_URL}${cat.image}` : 'https://via.placeholder.com/150/94a3b8/0b1220?text=NO+IMG';
    const normalHeartbeat = cat?.normal_heartbeat || '—';
    const lastRecord = records.length > 0 ? records[records.length - 1] : null;
    const currentBPM = lastRecord ? parseInt(lastRecord.heartbeat) : NaN;
    const [minBPM, maxBPM] = normalHeartbeat.split('-').map(s => parseInt(s.trim()));
    const catDisease = cat?.disease?.toLowerCase();

    // Determine Heartbeat Status
    let heartbeatStatus = 'No data available.';
    let isAbnormal = false;
    let matchingDiseases: string[] = [];

    if (lastRecord) {
        if (!isNaN(minBPM) && !isNaN(maxBPM) && currentBPM >= minBPM && currentBPM <= maxBPM) {
            heartbeatStatus = 'Normal Heartbeat';
        } else {
            isAbnormal = true;
            heartbeatStatus = currentBPM < minBPM 
                ? 'Abnormal Reading: Lower than normal range.' 
                : 'Abnormal Reading: Higher than normal range.';
            
            // Check for possible diseases only if the current record is abnormal AND the cat is not already diagnosed
            if (catDisease === 'normal' || !catDisease || catDisease === 'n/a') {
                matchingDiseases = getMatchingDiseases(currentBPM, normalHeartbeat);
            }
        }
    }


    const fetchRecords = async () => {
        if (!cat?.id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${RECORD_API_URL}?cat_id=${cat.id}`);
            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                const fetchedRecords: Record[] = data.data;
                setRecords(fetchedRecords);
            } else {
                setRecords([]);
            }
        } catch (error) {
            console.error("Fetch Records Error:", error);
            Alert.alert("Network Error", "Could not connect to the API to fetch heartbeat records.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
        // Set up a 30-second interval to refresh data
        const intervalId = setInterval(fetchRecords, 30000); 
        return () => clearInterval(intervalId); // Cleanup function
    }, [cat?.id]);


    if (!cat) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.title}>Error</Text>
                <Text style={styles.subtitle}>No cat data passed for analysis.</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.brand} />
                <Text style={styles.loadingText}>Loading records...</Text>
            </View>
        );
    }
    
    return (
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.container}>
            <View style={styles.header}>
                <Image source={{ uri: imageUrl }} style={styles.catImage} />
                <View style={styles.details}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.catDetail}>Breed: {cat.breed}</Text>
                    <Text style={styles.catDetail}>DOB: {cat.birthdate}</Text>
                    <Text style={styles.catDetail}>Normal BPM: <Text style={{fontWeight: 'bold'}}>{normalHeartbeat}</Text></Text>
                    <Text style={styles.catDetail}>
                        Disease: <Text style={{
                            fontWeight: 'bold', 
                            color: catDisease === 'normal' ? SUCCESS_COLOR : ERROR_COLOR 
                        }}>
                            {cat.disease || 'N/A'}
                        </Text>
                    </Text>
                </View>
            </View>
            
            <View style={styles.card}>
                <Text style={styles.latestBPMTitle}>Latest Heartbeat</Text>
                <Text style={styles.latestBPMValue}>{currentBPM || '--'}<Text style={styles.bpmUnit}> BPM</Text></Text>
                <Text style={[
                    styles.statusText, 
                    { color: isAbnormal ? ERROR_COLOR : SUCCESS_COLOR }
                ]}>
                    {heartbeatStatus}
                </Text>
                {lastRecord && (
                    <Text style={styles.updatedText}>
                        <Ionicons name="time-outline" size={14} color={Colors.muted} /> Last reading: {fmtDateTime(lastRecord.recorded_at)}
                    </Text>
                )}
            </View>

            {/* Possible Diseases Section */}
            {isAbnormal && (catDisease === 'normal' || !catDisease || catDisease === 'n/a') && matchingDiseases.length > 0 && (
                <View style={[styles.card, styles.diseaseCard]}>
                    <Text style={styles.diseaseTitle}>⚠️ Possible Related Diseases</Text>
                    {matchingDiseases.map((item, index) => {
                        // Check if the item is a group title (based on my convention)
                        const isGroup = !item.includes(': '); 
                        return (
                            <Text 
                                key={index} 
                                style={isGroup ? styles.diseaseGroup : styles.diseaseItem}
                            >
                                {isGroup ? item.toUpperCase() : `• ${item}`}
                            </Text>
                        )
                    })}
                </View>
            )}

            {/* Extra padding for the floating tab bar */}
            <View style={{height: 100}} /> 
        </ScrollView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    scrollContent: {
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    center: { 
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: Colors.muted,
        marginTop: 10,
    },
    title: { 
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.brand,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: Colors.text,
    },
    header: {
        flexDirection: 'row',
        backgroundColor: Colors.panel,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    catImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 15,
        backgroundColor: Colors.muted,
        borderWidth: 2,
        borderColor: Colors.brand,
    },
    details: {
        flex: 1,
    },
    catName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.brand,
        marginBottom: 5,
    },
    catDetail: {
        fontSize: 14,
        color: Colors.text,
    },
    card: {
        backgroundColor: Colors.panel,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: Colors.bg,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    latestBPMTitle: {
        fontSize: 16,
        color: Colors.muted,
        textAlign: 'center',
    },
    latestBPMValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: Colors.text,
        textAlign: 'center',
        marginVertical: 5,
    },
    bpmUnit: {
        fontSize: 20,
        color: Colors.muted,
        fontWeight: 'normal',
    },
    statusText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
    },
    updatedText: {
        fontSize: 12,
        color: Colors.muted,
        textAlign: 'center',
        marginTop: 5,
    },
    diseaseCard: {
        backgroundColor: Colors.panel,
        borderLeftColor: ERROR_COLOR,
        borderLeftWidth: 5,
        padding: 15,
    },
    diseaseTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: ERROR_COLOR,
        marginBottom: 10,
    },
    diseaseGroup: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 8,
        marginBottom: 2,
    },
    diseaseItem: {
        fontSize: 14,
        color: Colors.muted,
        marginLeft: 10,
        lineHeight: 20,
    }
});