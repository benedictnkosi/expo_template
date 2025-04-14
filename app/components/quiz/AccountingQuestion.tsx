import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, Pressable, Animated } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { checkAnswer } from '@/services/api';

interface TableCell {
    value?: string;
    isEditable?: boolean;
    correct?: string;
    options?: string[];
    isCorrect?: boolean;
}

interface TableRow {
    A: string | TableCell;
    B: string | TableCell;
    C: string | TableCell;
    D: string | TableCell;
}

interface QuizQuestionTextProps {
    question: string;
    questionId: number;
}

interface SelectedCell {
    rowIndex: number;
    column: string;
    cell: TableCell;
}

interface SuccessModalProps {
    isVisible: boolean;
    onClose: () => void;
    points: number;
    colors: any;
}

interface CheckAnswerResponse {
    status: string;
    correct: boolean;
    explanation: string | null;
    correctAnswer: string;
    points: number;
    message: string;
    lastThreeCorrect: boolean;
    streak: number;
    streakUpdated: boolean;
    subject: string;
    is_favorited: boolean;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isVisible, onClose, points, colors }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isVisible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }).start();
        } else {
            scaleAnim.setValue(0);
        }
    }, [isVisible]);

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Animated.View 
                    style={[
                        styles.successModalContent,
                        { 
                            backgroundColor: colors.card,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
                    <ThemedText style={styles.successTitle}>Correct!</ThemedText>
                    <ThemedText style={styles.pointsText}>+{points} points</ThemedText>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

export const AccountingQuestion = ({ 
    question,
    questionId
}: QuizQuestionTextProps) => {
    const { isDark, colors } = useTheme();
    const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [points, setPoints] = useState(0);
    const correctSound = useRef<Audio.Sound>();
    const incorrectSound = useRef<Audio.Sound>();
    
    // Parse the JSON string into table data
    const tableData: TableRow[] = React.useMemo(() => {
        try {
            return JSON.parse(question);
        } catch (error) {
            console.error('Failed to parse question JSON:', error);
            return [];
        }
    }, [question]);

    // Load sounds
    useEffect(() => {
        async function loadSounds() {
            try {
                const { sound: correct } = await Audio.Sound.createAsync(
                    require('@/assets/audio/correct_answer.mp3')
                );
                const { sound: incorrect } = await Audio.Sound.createAsync(
                    require('@/assets/audio/bad_answer.mp3')
                );
                correctSound.current = correct;
                incorrectSound.current = incorrect;
            } catch (error) {
                console.log('Error loading sounds:', error);
            }
        }
        loadSounds();

        return () => {
            if (correctSound.current) {
                correctSound.current.unloadAsync();
            }
            if (incorrectSound.current) {
                incorrectSound.current.unloadAsync();
            }
        };
    }, []);

    const playSound = async (isCorrect: boolean) => {
        try {
            // Check if sound is enabled in AsyncStorage
            const soundEnabled = await AsyncStorage.getItem('soundEnabled');

            // Only play sound if it's enabled (null means default which is true)
            if (soundEnabled === null || soundEnabled === 'true') {
                const soundToPlay = isCorrect ? correctSound.current : incorrectSound.current;
                if (soundToPlay) {
                    await soundToPlay.replayAsync();
                }
            }
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    };

    const handleCellPress = (rowIndex: number, column: string, cell: TableCell) => {
        if (cell.isEditable) {
            setSelectedCell({ rowIndex, column, cell });
        }
    };

    const handleOptionSelect = async (option: string) => {
        if (selectedCell) {
            try {
                const userUID = await AsyncStorage.getItem('userUID');
                if (!userUID) {
                    console.error('No user UID found');
                    return;
                }

                // Convert row index to 1-based and format cell reference (e.g., A1, B2, C3)
                const cellReference = `${selectedCell.column}${selectedCell.rowIndex + 1}`;

                const response = await checkAnswer(
                    userUID, 
                    questionId, 
                    option, 
                    0, 
                    "Normal", 
                    cellReference
                ) as CheckAnswerResponse;

                const updatedTableData = [...tableData];
                const cell = updatedTableData[selectedCell.rowIndex][selectedCell.column as keyof TableRow] as TableCell;
                cell.value = option;
                cell.isCorrect = response.correct;
                cell.isEditable = cell.isCorrect; // Disable if incorrect
                
                // Play appropriate sound
                await playSound(cell.isCorrect);
                
                if (cell.isCorrect) {
                    setPoints(response.points);
                    setShowSuccessModal(true);
                    // Auto-hide the modal after 1.5 seconds
                    setTimeout(() => {
                        setShowSuccessModal(false);
                    }, 1500);
                }
                
                setSelectedCell(null);
            } catch (error) {
                console.error('Error checking answer:', error);
                // Handle error appropriately
            }
        }
    };

    const renderCell = (cell: string | TableCell, rowIndex: number, column: string) => {
        if (typeof cell === 'string') {
            return (
                <ThemedText style={[styles.cellText, { color: colors.text }]}>
                    {cell}
                </ThemedText>
            );
        }

        if (cell.isEditable) {
            return (
                <TouchableOpacity 
                    style={styles.editableCell}
                    onPress={() => handleCellPress(rowIndex, column, cell)}
                >
                    <ThemedText style={[styles.cellText, { color: colors.text }]}>
                        {cell.value || 'Select'}
                    </ThemedText>
                </TouchableOpacity>
            );
        }

        // Show incorrect answer with correct value
        if (cell.value && !cell.isCorrect) {
            return (
                <View style={[styles.incorrectCell, { backgroundColor: '#ffebee' }]}>
                    
                    <ThemedText style={[styles.correctText, { color: '#388e3c' }]}>
                        {cell.correct}
                    </ThemedText>
                </View>
            );
        }

        // Show correct answer with green highlight
        if (cell.value && cell.isCorrect) {
            return (
                <View style={[styles.correctCell, { backgroundColor: '#e8f5e9' }]}>
                    <ThemedText style={[styles.correctText, { color: '#388e3c' }]}>
                        {cell.value}
                    </ThemedText>
                </View>
            );
        }

        return null;
    };

    if (!tableData.length) {
        return (
            <View style={styles.errorContainer}>
                <ThemedText style={[styles.errorText, { color: colors.text }]}>
                    Invalid table data
                </ThemedText>
            </View>
        );
    }

    return (
        <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tableContainer}>
                    {tableData.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.tableRow}>
                            {Object.entries(row).map(([column, cell]) => (
                                <View key={column} style={styles.cell}>
                                    {renderCell(cell, rowIndex, column)}
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>

            <Modal
                visible={!!selectedCell}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedCell(null)}
            >
                <Pressable 
                    style={styles.modalOverlay}
                    onPress={() => setSelectedCell(null)}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        {selectedCell?.cell.options?.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.optionButton, { 
                                    borderColor: colors.border,
                                    backgroundColor: colors.card
                                }]}
                                onPress={() => handleOptionSelect(option)}
                            >
                                <ThemedText style={[styles.optionText, { color: colors.text }]}>
                                    {option}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            <SuccessModal 
                isVisible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                points={points}
                colors={colors}
            />
        </>
    );
};

const styles = StyleSheet.create({
    tableContainer: {
        marginTop: 16,
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 8,
    },
    cell: {
        width: 100,
        padding: 8,
        borderRightWidth: 1,
        borderRightColor: '#eee',
    },
    cellText: {
        fontSize: 14,
    },
    editableCell: {
        minHeight: 40,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 8,
        justifyContent: 'center',
    },
    errorContainer: {
        padding: 16,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
        color: 'red',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        maxHeight: '80%',
        borderRadius: 8,
        padding: 16,
    },
    optionButton: {
        padding: 16,
        borderWidth: 1,
        borderRadius: 4,
        marginBottom: 8,
    },
    optionText: {
        fontSize: 16,
        textAlign: 'center',
    },
    incorrectCell: {
        minHeight: 40,
        borderWidth: 1,
        borderColor: '#d32f2f',
        borderRadius: 4,
        padding: 8,
        justifyContent: 'center',
    },
    incorrectText: {
        fontSize: 14,
    },
    correctCell: {
        minHeight: 40,
        borderWidth: 1,
        borderColor: '#388e3c',
        borderRadius: 4,
        padding: 8,
        justifyContent: 'center',
    },
    correctText: {
        fontSize: 14,
        fontWeight: '500',
    },
    successModalContent: {
        width: '80%',
        maxWidth: 300,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    pointsText: {
        fontSize: 18,
        color: '#4CAF50',
        fontWeight: '600',
    },
}); 