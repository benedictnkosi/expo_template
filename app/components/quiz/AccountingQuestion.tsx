import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, Pressable, Animated, Platform } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { checkAnswer } from '@/services/api';
import { createStyles } from './AccountingQuestion.styles';

interface TableCell {
    value?: string;
    isEditable?: boolean;
    correct?: string;
    options?: string[];
    isCorrect?: boolean;
    explanation?: string;
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
    setShowFeedback: (show: boolean) => void;
}

interface SelectedCell {
    rowIndex: number;
    column: string;
    cell: TableCell;
}

interface SuccessModalProps {
    isVisible: boolean;
    onClose: () => void;
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

const SuccessModal: React.FC<SuccessModalProps> = ({ isVisible, onClose, colors }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const { isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
                        { transform: [{ scale: scaleAnim }] }
                    ]}
                >
                    <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
                    <ThemedText style={styles.successTitle}>Correct!</ThemedText>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

const SelectOption = ({ option, onSelect, colors, styles }: { option: string; onSelect: () => void; colors: any; styles: any }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const formatOption = (value: string) => {
        // Check if the value is a number
        const num = parseFloat(value);
        if (!isNaN(num)) {
            // If negative, wrap in parentheses and remove the minus sign
            if (num < 0) {
                return `(${Math.abs(num)})`;
            }
        }
        return value;
    };

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onSelect}
                style={[styles.optionButton, {
                    borderColor: colors.primary,
                    backgroundColor: colors.card,
                    shadowColor: colors.primary,
                    shadowOffset: {
                        width: 0,
                        height: 2,
                    },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                }]}
                activeOpacity={0.7}
            >
                <ThemedText style={[styles.optionText, { color: colors.text }]}>
                    {formatOption(option)}
                </ThemedText>
            </TouchableOpacity>
        </Animated.View>
    );
};

export const AccountingQuestion = ({
    question,
    questionId,
    setShowFeedback
}: QuizQuestionTextProps) => {
    const { isDark, colors } = useTheme();
    const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const correctSound = useRef<Audio.Sound>();
    const incorrectSound = useRef<Audio.Sound>();

    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    // Function to calculate font size based on indentation level
    const getFontSizeForIndentation = (indentationLevel: number, maxIndentation: number) => {
        const baseSize = 14;
        const minSize = 10;
        const sizeStep = (baseSize - minSize) / maxIndentation;
        return Math.max(minSize, baseSize - (indentationLevel * sizeStep));
    };

    // Parse the JSON string into table data
    const tableData: TableRow[] = React.useMemo(() => {
        try {
            const parsed = JSON.parse(question);
            // Calculate max indentation level
            const maxIndentation = Math.max(...parsed.map(row => {
                if (typeof row.A === 'string') {
                    return (row.A.match(/^\s*/) || [''])[0].length;
                }
                return 0;
            }));
            return parsed;
        } catch (error) {
            console.error('Failed to parse question JSON:', error);
            return [];
        }
    }, [question]);

    // Calculate max indentation level
    const maxIndentation = useMemo(() => {
        return Math.max(...tableData.map((row: TableRow) => {
            if (typeof row.A === 'string') {
                return (row.A.match(/^\s*/) || [''])[0].length;
            }
            return 0;
        }));
    }, [tableData]);

    // Add logging for editable cells
    useEffect(() => {
        const totalEditableCells = tableData.reduce((count, row) => {
            return count + Object.values(row).filter(cell =>
                typeof cell === 'object' && cell.isEditable
            ).length;
        }, 0);

        const remainingCells = tableData.reduce((count, row) => {
            return count + Object.values(row).filter(cell =>
                typeof cell === 'object' && cell.isEditable
            ).length;
        }, 0);

        console.log(`Total editable cells: ${totalEditableCells}`);
        console.log(`Remaining cells to fill: ${remainingCells}`);
    }, [tableData]);

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
                cell.isEditable = false; // Disable after any selection

                // Log remaining cells after selection
                const remainingCells = updatedTableData.reduce((count, row) => {
                    return count + Object.values(row).filter(cell =>
                        typeof cell === 'object' && cell.isEditable
                    ).length;
                }, 0);
                console.log(`Cells remaining to fill after selection: ${remainingCells}`);

                // Check if all editable cells are now populated
                const allCellsPopulated = tableData.every(row => {
                    return Object.entries(row).every(([_, cell]) => {
                        if (typeof cell === 'object' && cell.isEditable) {
                            return cell.value !== undefined;
                        }
                        return true;
                    });
                });

                if (allCellsPopulated) {
                    setShowFeedback(true);
                }

                // Play appropriate sound
                await playSound(cell.isCorrect);
                setSelectedCell(null);
            } catch (error) {
                console.error('Error checking answer:', error);
                // Handle error appropriately
            }
        }
    };

    const renderSelectButton = (cell: TableCell, rowIndex: number, column: string) => {
        if (cell.isEditable) {
            return (
                <TouchableOpacity
                    style={[styles.editableCell, {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        shadowColor: colors.primary,
                        shadowOffset: {
                            width: 0,
                            height: 2,
                        },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                    }]}
                    onPress={() => handleCellPress(rowIndex, column, cell)}
                    activeOpacity={0.7}
                >
                    <View style={styles.selectButtonContent}>
                        <ThemedText style={[styles.cellText, {
                            color: cell.value ? colors.text : colors.textSecondary,
                            marginRight: 8
                        }]}>
                            {cell.value || 'Select'}
                        </ThemedText>
                        <MaterialIcons
                            name="keyboard-arrow-down"
                            size={20}
                            color={colors.textSecondary}
                            style={[styles.selectIcon, {
                                opacity: 0.6
                            }]}
                        />
                    </View>
                </TouchableOpacity>
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
            <View style={[styles.tableContainer, { width: '100%' }]}>
                {tableData.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.tableRow}>
                        {/* First Column */}
                        <View style={[styles.cell, styles.cellA]}>
                            {(() => {
                                const cell = row.A;
                                const cellB = row.B;
                                if (typeof cell === 'string') {
                                    // Count leading spaces to determine indentation level
                                    const leadingSpaces = (cell.match(/^\s*/) || [''])[0].length;

                                    return (
                                        <View style={{ width: '100%' }}>
                                            <ThemedText style={[
                                                styles.cellText,
                                                {
                                                    color: colors.text,
                                                    fontWeight: leadingSpaces === maxIndentation ? 'normal' : 'bold',
                                                    fontSize: getFontSizeForIndentation(leadingSpaces, maxIndentation)
                                                }
                                            ]}>
                                                {cell}
                                            </ThemedText>
                                            {typeof cellB === 'object' && !cellB.isEditable && cellB.explanation && (
                                                <ThemedText style={styles.explanationText}>
                                                    {cellB.explanation}
                                                </ThemedText>
                                            )}
                                        </View>
                                    );
                                }

                                if (cell.isEditable) {
                                    return (
                                        <TouchableOpacity
                                            style={styles.editableCell}
                                            onPress={() => handleCellPress(rowIndex, 'A', cell)}
                                        >
                                            <ThemedText style={[styles.cellText, { color: colors.text }]}>??</ThemedText>
                                        </TouchableOpacity>
                                    );
                                }

                                // Show incorrect answer with correct value
                                if (cell.value && !cell.isCorrect) {
                                    const formatValue = (value: string | undefined) => {
                                        if (!value) return '';
                                        const num = parseFloat(value);
                                        if (!isNaN(num) && num < 0) {
                                            return `(${Math.abs(num)})`;
                                        }
                                        return value;
                                    };
                                    return (
                                        <View style={styles.incorrectCell}>
                                            <ThemedText style={[styles.correctText, { color: '#ff4d4f' }]}>
                                                {formatValue(cell.correct)}
                                            </ThemedText>
                                        </View>
                                    );
                                }

                                // Show correct answer with green highlight
                                if (cell.value && cell.isCorrect) {
                                    const formatValue = (value: string | undefined) => {
                                        if (!value) return '';
                                        const num = parseFloat(value);
                                        if (!isNaN(num) && num < 0) {
                                            return `(${Math.abs(num)})`;
                                        }
                                        return value;
                                    };
                                    return (
                                        <View style={styles.correctCell}>
                                            <ThemedText style={[styles.correctText, { color: '#388e3c' }]}>
                                                {formatValue(cell.value)}
                                            </ThemedText>
                                        </View>
                                    );
                                }

                                return null;
                            })()}
                        </View>
                        {/* Second Column */}
                        <View style={[styles.cell, styles.cellB, { borderRightWidth: 0 }]}>
                            {(() => {
                                const cell = row.B;
                                if (typeof cell === 'string') {
                                    return (
                                        <View style={{ width: '100%' }}>
                                            <ThemedText style={[styles.cellText, { color: colors.text }]}>
                                                {cell}
                                            </ThemedText>
                                        </View>
                                    );
                                }

                                if (cell.isEditable) {
                                    return (
                                        <TouchableOpacity
                                            style={styles.editableCell}
                                            onPress={() => handleCellPress(rowIndex, 'B', cell)}
                                        >
                                            <ThemedText style={[styles.cellText, { color: colors.text }]}>??</ThemedText>
                                        </TouchableOpacity>
                                    );
                                }

                                // Show incorrect answer with correct value
                                if (cell.value && !cell.isCorrect) {
                                    const formatValue = (value: string | undefined) => {
                                        if (!value) return '';
                                        const num = parseFloat(value);
                                        if (!isNaN(num) && num < 0) {
                                            return `(${Math.abs(num)})`;
                                        }
                                        return value;
                                    };
                                    return (
                                        <View style={styles.incorrectCell}>
                                            <ThemedText style={[styles.correctText, { color: '#ff4d4f' }]}>
                                                {formatValue(cell.correct)}
                                            </ThemedText>
                                        </View>
                                    );
                                }

                                // Show correct answer with green highlight
                                if (cell.value && cell.isCorrect) {
                                    const formatValue = (value: string | undefined) => {
                                        if (!value) return '';
                                        const num = parseFloat(value);
                                        if (!isNaN(num) && num < 0) {
                                            return `(${Math.abs(num)})`;
                                        }
                                        return value;
                                    };
                                    return (
                                        <View style={styles.correctCell}>
                                            <ThemedText style={[styles.correctText, { color: '#388e3c' }]}>
                                                {formatValue(cell.value)}
                                            </ThemedText>
                                        </View>
                                    );
                                }

                                return null;
                            })()}
                        </View>
                    </View>
                ))}
            </View>

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
                    <View style={styles.blurContainer}>
                        <Animated.View
                            style={[
                                styles.modalContent,
                                {
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                }
                            ]}
                        >
                            <View style={styles.modalHeader}>
                                <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                                    Select an option
                                </ThemedText>
                                <TouchableOpacity
                                    onPress={() => setSelectedCell(null)}
                                    style={styles.closeButton}
                                >
                                    <MaterialIcons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.optionsScrollView}>
                                {selectedCell?.cell.options?.map((option, index) => (
                                    <SelectOption
                                        key={index}
                                        option={option}
                                        onSelect={() => handleOptionSelect(option)}
                                        colors={colors}
                                        styles={styles}
                                    />
                                ))}
                            </ScrollView>
                        </Animated.View>
                    </View>
                </Pressable>
            </Modal>

            <SuccessModal
                isVisible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                colors={colors}
            />
        </>
    );
}; 