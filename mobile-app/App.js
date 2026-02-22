import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    Appearance,
    Platform,
    Modal,
    FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Colors from './constants/Colors';
import SCHEDULE_DB from './data/schedule_data.json';
import { requestPermissions, scheduleRamadanNotifications } from './logic/notifications';

// Configuration
const DEFAULT_DIVISION = "Dhaka";
const DEFAULT_ZILLA = "Dhaka";

export default function App() {
    const [division, setDivision] = useState(DEFAULT_DIVISION);
    const [zilla, setZilla] = useState(DEFAULT_ZILLA);
    const [isDarkMode, setIsDarkMode] = useState(Appearance.getColorScheme() === 'dark');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [modalMode, setModalMode] = useState('division'); // 'division' or 'zilla'

    // ── PERSISTENCE & INIT ──────────────────────────────────
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const storedDiv = await AsyncStorage.getItem('selectedDivision');
                const storedZil = await AsyncStorage.getItem('selectedZilla');
                const storedTheme = await AsyncStorage.getItem('darkMode');

                if (storedDiv) setDivision(storedDiv);
                if (storedZil) setZilla(storedZil);
                if (storedTheme !== null) setIsDarkMode(storedTheme === 'true');

                // Initial permission check
                await requestPermissions();
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        };
        loadSettings();
    }, []);

    const saveLocation = async (div, zil) => {
        setDivision(div);
        setZilla(zil);
        await AsyncStorage.setItem('selectedDivision', div);
        await AsyncStorage.setItem('selectedZilla', zil);

        // Refresh notifications for the new location
        const data = SCHEDULE_DB[div]?.[zil];
        if (data) {
            await scheduleRamadanNotifications(data, zil);
        }
    };

    // ── THEME TOGGLE ─────────────────────────────────────────
    const toggleTheme = async () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        await AsyncStorage.setItem('darkMode', String(newMode));
    };

    // ── DATA PROCESSING ──────────────────────────────────────
    const schedule = SCHEDULE_DB[division]?.[zilla] || [];

    const getBSTInfo = useCallback(() => {
        const bstMs = Date.now() + (6 * 60 * 60 * 1000);
        const bst = new Date(bstMs);
        const dateStr = bst.toISOString().split('T')[0];
        return { dateStr, epochNow: Date.now() };
    }, []);

    const bstTimeToEpoch = (dateStr, timeStr) => {
        const [y, mo, d] = dateStr.split('-').map(Number);
        const [hh, mm] = timeStr.split(':').map(Number);
        return Date.UTC(y, mo - 1, d, hh, mm, 0) - (6 * 60 * 60 * 1000);
    };

    const formatTime12 = (t) => {
        if (!t) return '--:--';
        let [hh, mm] = t.split(':').map(Number);
        const suffix = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12 || 12;
        return `${hh}:${String(mm).padStart(2, '0')} ${suffix}`;
    };

    // ── COUNTDOWN LOGIC ──────────────────────────────────────
    const [countdown, setCountdown] = useState({ label: 'Loading...', h: '00', m: '00', s: '00' });

    useEffect(() => {
        if (!schedule.length) return;

        const updateCountdown = () => {
            const { dateStr: todayStr, epochNow } = getBSTInfo();
            const todayIdx = schedule.findIndex(e => e.date === todayStr);

            if (todayIdx === -1) {
                setCountdown({ label: 'Ramadan 2026', h: '00', m: '00', s: '00' });
                return;
            }

            const today = schedule[todayIdx];
            const tomorrow = schedule[todayIdx + 1];
            const iftarEpoch = bstTimeToEpoch(today.date, today.iftar);
            const msToIftar = iftarEpoch - epochNow;

            if (msToIftar > 0) {
                const s = Math.floor(msToIftar / 1000);
                setCountdown({
                    label: '🌅 Time Until Iftar',
                    h: String(Math.floor(s / 3600)).padStart(2, '0'),
                    m: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
                    s: String(s % 60).padStart(2, '0')
                });
            } else if (tomorrow) {
                const msToSehri = bstTimeToEpoch(tomorrow.date, tomorrow.sehri_end) - epochNow;
                if (msToSehri > 0) {
                    const s = Math.floor(msToSehri / 1000);
                    setCountdown({
                        label: '🌙 Time Until Sehri',
                        h: String(Math.floor(s / 3600)).padStart(2, '0'),
                        m: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
                        s: String(s % 60).padStart(2, '0')
                    });
                }
            }
        };

        const timer = setInterval(updateCountdown, 1000);
        updateCountdown();
        return () => clearInterval(timer);
    }, [schedule, getBSTInfo]);

    const { dateStr: todayStr } = getBSTInfo();
    const todayIdx = schedule.findIndex(e => e.date === todayStr);
    const todayEntry = todayIdx !== -1 ? schedule[todayIdx] : null;

    // ── UI THEME ─────────────────────────────────────────────
    const theme = isDarkMode ? Colors.dark : Colors;
    const bgColor = isDarkMode ? Colors.dark.background : Colors.background;
    const textColor = isDarkMode ? Colors.dark.text : Colors.text;
    const secondaryColor = Colors.secondary;

    // ── LOCATION MODAL RENDER ────────────────────────────────
    const renderLocationItem = ({ item }) => (
        <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
                if (modalMode === 'division') {
                    setDivision(item);
                    const zil = Object.keys(SCHEDULE_DB[item])[0];
                    saveLocation(item, zil);
                    setModalMode('zilla');
                } else {
                    saveLocation(division, item);
                    setShowLocationModal(false);
                }
            }}
        >
            <Text style={[styles.modalItemText, { color: textColor }]}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            <View style={styles.topBar}>
                <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
                    <Text style={{ fontSize: 24 }}>{isDarkMode ? '☀️' : '🌙'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setModalMode('division'); setShowLocationModal(true); }} style={styles.iconBtn}>
                    <Text style={{ fontSize: 24 }}>📍</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: secondaryColor }]}>Ramadan 2026</Text>
                    <Text style={[styles.subtitle, { color: isDarkMode ? Colors.dark.textLight : Colors.text }]}>
                        Bangladesh Iftar Countdown
                    </Text>
                </View>

                {/* Today Card */}
                {todayEntry && (
                    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.badge, { backgroundColor: Colors.primary }]}>
                                <Text style={styles.badgeText}>Day {todayEntry.ramadan_day}</Text>
                            </View>
                            <Text style={[styles.dateText, { color: textColor }]}>{todayEntry.date}</Text>
                        </View>

                        <View style={styles.timesRow}>
                            <View style={styles.timeBlock}>
                                <Text style={[styles.timeLabel, { color: isDarkMode ? Colors.dark.textLight : '#666' }]}>Sehri Ends</Text>
                                <Text style={[styles.timeValue, { color: Colors.primary }]}>{formatTime12(todayEntry.sehri_end)}</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: isDarkMode ? Colors.dark.divider : '#eee' }]} />
                            <View style={styles.timeBlock}>
                                <Text style={[styles.timeLabel, { color: isDarkMode ? Colors.dark.textLight : '#666' }]}>Iftar Time</Text>
                                <Text style={[styles.timeValue, { color: Colors.accent }]}>{formatTime12(todayEntry.iftar)}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Countdown Area */}
                <View style={styles.countdownContainer}>
                    <Text style={[styles.countdownLabel, { color: textColor }]}>{countdown.label}</Text>
                    <Text style={[styles.countdownTimer, { color: Colors.primary }]}>
                        {countdown.h} : {countdown.m} : {countdown.s}
                    </Text>
                </View>

                {/* Notifications setup helper */}
                <TouchableOpacity
                    style={[styles.notifyBtn, { borderColor: Colors.primary }]}
                    onPress={() => scheduleRamadanNotifications(schedule, zilla)}
                >
                    <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>⏰ Sync Ramadan Alarms</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={{ color: isDarkMode ? Colors.dark.textLight : '#666' }}>
                        Selected: {zilla}, {division}
                    </Text>
                </View>
            </ScrollView>

            {/* Location Modal */}
            <Modal visible={showLocationModal} animationType="slide" transparent={true}>
                <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)' }]}>
                    <View style={[styles.modalHeader, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.modalTitle, { color: textColor }]}>
                            Select {modalMode === 'division' ? 'Division' : 'Zilla'}
                        </Text>
                        <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                            <Text style={{ color: Colors.accent, fontWeight: 'bold' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={modalMode === 'division' ? Object.keys(SCHEDULE_DB).sort() : Object.keys(SCHEDULE_DB[division]).sort()}
                        renderItem={renderLocationItem}
                        keyExtractor={item => item}
                        style={{ width: '100%' }}
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    iconBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
    },
    header: {
        marginTop: 10,
        marginBottom: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        fontFamily: Platform.OS === 'ios' ? 'Amiri' : 'serif',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 5,
        letterSpacing: 1,
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    card: {
        width: '100%',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    badge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 25,
    },
    badgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.9,
    },
    timesRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    timeBlock: {
        alignItems: 'center',
        flex: 1,
    },
    timeLabel: {
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    timeValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    divider: {
        width: 1,
        height: 40,
        opacity: 0.5,
    },
    countdownContainer: {
        alignItems: 'center',
        marginVertical: 40,
    },
    countdownLabel: {
        fontSize: 14,
        marginBottom: 15,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    countdownTimer: {
        fontSize: 54,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    footer: {
        marginTop: 20,
        opacity: 0.5,
        marginBottom: 40,
    },
    notifyBtn: {
        borderWidth: 1,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 10,
    },
    modalContainer: {
        flex: 1,
        paddingTop: 60,
        alignItems: 'center',
    },
    modalHeader: {
        width: '100%',
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalItem: {
        width: '100%',
        padding: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    },
    modalItemText: {
        fontSize: 18,
    }
});
