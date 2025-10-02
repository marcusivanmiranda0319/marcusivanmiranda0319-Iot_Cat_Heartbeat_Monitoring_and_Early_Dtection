// screens/RecordScreen.tsx - CORRECTED (Removed 'loading' from useEffect dependency array)

import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

// --- Type Definitions ---
interface Cat {
    id: string;
    name: string;
    normal_heartbeat: string | null;
}

interface Record {
    id: string;
    cat_id: string;
    heartbeat: string;
    recorded_at: string;
}

interface RecordScreenProps {
    ownerId: number; 
}

// --- API URLs ---
const API_BASE_URL = Platform.OS === 'android' 
    ? 'http://192.168.1.7/CLINIC/' 
    : 'http://localhost/CLINIC/';

const CAT_API_URL = `${API_BASE_URL}API/CAT/display.php`;
const RECORD_API_URL = `${API_BASE_URL}API/RECORD/display.php`;

// --- Utility Functions ---
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

// --- Main Component ---
export const RecordScreen: React.FC<RecordScreenProps> = ({ ownerId }) => {
    const [cats, setCats] = useState<Cat[]>([]);
    const [selectedCatId, setSelectedCatId] = useState<string>(''); 
    const [normalHeartbeatRange, setNormalHeartbeatRange] = useState<string>('');
    const [records, setRecords] = useState<Record[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCats = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${CAT_API_URL}?owner_id=${ownerId}`);
            const data = await response.json();

            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                setCats(data.data);
                // Auto-select the first cat
                const firstCat = data.data[0];
                setSelectedCatId(firstCat.id);
                setNormalHeartbeatRange(firstCat.normal_heartbeat || '');
            } else {
                setCats([]);
                setSelectedCatId('');
                setNormalHeartbeatRange('');
            }
        } catch (error) {
            console.error("Fetch Cats Error:", error);
            Alert.alert("Network Error", "Could not connect to the API to fetch cats.");
        } 
        // NOTE: We don't set loading=false here for an empty cat list 
        // to prevent the "No Cats Found" screen from flickering before initial records are fetched.
    };

    const fetchRecords = async (catId: string) => {
        if (!catId) {
            setRecords([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${RECORD_API_URL}?cat_id=${catId}`);
            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                setRecords(data.data.reverse()); 
            } else {
                setRecords([]);
            }
        } catch (error) {
            console.error("Fetch Records Error:", error);
            Alert.alert("Network Error", "Could not fetch heartbeat records.");
        } finally {
            setLoading(false);
        }
    };

    // 1. Fetch cats on initial load
    useEffect(() => {
        fetchCats();
    }, [ownerId]);

    // 2. Fetch records when selectedCatId changes
    useEffect(() => {
        if (selectedCatId) {
            fetchRecords(selectedCatId);
        } else {
            // Only set records empty if we finished fetching all cats (i.e., when fetchCats is done)
            if (!loading && cats.length === 0) {
                setRecords([]);
            }
        }
    // FIX APPLIED: Removed 'loading' from the dependency array to stop the infinite loop/blinking.
    }, [selectedCatId, cats.length]); 

    // --- Handlers ---
    const handleCatChange = (itemValue: string) => {
        const cat = cats.find(c => c.id === itemValue);
        
        setSelectedCatId(itemValue);
        setNormalHeartbeatRange(cat?.normal_heartbeat || '');
    };

    // --- Renderers ---
    const renderRecordItem = ({ item }: { item: Record }) => {
        const heartbeat = parseInt(item.heartbeat);
        const [minBPM, maxBPM] = normalHeartbeatRange.split('-').map((s: string) => parseInt(s.trim())); 
        
        let status = 'Unknown';
        let statusColor = Colors.text;

        if (!isNaN(minBPM) && !isNaN(maxBPM)) {
            if (heartbeat >= minBPM && heartbeat <= maxBPM) {
                status = 'Normal';
                statusColor = '#4BB543'; // Green
            } else {
                status = heartbeat < minBPM ? 'Low' : 'High';
                statusColor = '#FF3333'; // Red
            }
        }

        return (
            <View style={styles.recordItem}>
                <View style={styles.recordTimeContainer}>
                    <Ionicons name="time-outline" size={16} color={Colors.muted} />
                    <Text style={styles.recordTime}>{fmtDateTime(item.recorded_at)}</Text>
                </View>
                <Text style={styles.recordBPM}>{heartbeat} <Text style={styles.recordBPMUnit}>BPM</Text></Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusText}>{status}</Text>
                </View>
            </View>
        );
    };

    // --- UI Logic ---
    if (loading && cats.length === 0) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.brand} />
                <Text style={styles.loadingText}>Loading cats...</Text>
            </View>
        );
    }
    
    if (cats.length === 0) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.title}>No Cats Found</Text>
                <Text style={styles.loadingText}>Please register a cat first.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Historical Heartbeat Records</Text>
            
            <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Select Cat:</Text>
                <Picker
                    selectedValue={selectedCatId || ''} 
                    onValueChange={handleCatChange}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                    mode="dropdown"
                >
                    {cats.map((cat) => (
                        <Picker.Item 
                            key={cat.id} 
                            label={`${cat.name} (Normal: ${cat.normal_heartbeat || 'N/A'})`} 
                            value={cat.id} 
                        />
                    ))}
                </Picker>
            </View>

            {loading && selectedCatId ? (
                <View style={[styles.center, { height: 200 }]}>
                    <ActivityIndicator size="small" color={Colors.brand} />
                    <Text style={styles.loadingText}>Loading records...</Text>
                </View>
            ) : records.length > 0 ? (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderRecordItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={[styles.center, { height: 200 }]}>
                    <Text style={styles.noDataText}>No historical records found for this cat.</Text>
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
    loadingText: {
        color: Colors.muted,
        marginTop: 10,
    },
    noDataText: {
        color: Colors.muted,
        fontSize: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.brand,
        marginBottom: 15,
    },
    pickerContainer: {
        backgroundColor: Colors.panel,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    pickerLabel: {
        fontSize: 14,
        color: Colors.muted,
        marginTop: 5,
        marginLeft: 5,
    },
    picker: {
        color: Colors.text,
    },
    pickerItem: {
        color: Colors.text,
    },
    listContent: {
        paddingBottom: 120, // Space for the floating tab bar
    },
    recordItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.panel,
        borderRadius: 10,
        padding: 15,
        marginVertical: 5,
        borderLeftWidth: 5,
        borderLeftColor: Colors.brand,
        shadowColor: Colors.bg,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    recordTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 3,
    },
    recordTime: {
        fontSize: 14,
        color: Colors.muted,
        marginLeft: 5,
    },
    recordBPM: {
        flex: 1.5,
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        textAlign: 'center',
    },
    recordBPMUnit: {
        fontSize: 12,
        fontWeight: 'normal',
        color: Colors.muted,
    },
    statusBadge: {
        flex: 1,
        paddingVertical: 5,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.panel, // Light text for badge background
    },
});