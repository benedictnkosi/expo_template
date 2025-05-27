import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

// Types
interface TableCell {
    answer: string;
    options?: string[];
    explanation?: {
        description: string;
        formula: string;
    };
}

interface FinancialPositionData {
    context: string;
    question: string;
    table: {
        ASSETS: {
            'NON-CURRENT ASSETS': Record<string, TableCell>;
            'CURRENT ASSETS': Record<string, TableCell>;
            'TOTAL ASSETS': TableCell;
        };
        'EQUITY AND LIABILITIES': {
            "ORDINARY SHAREHOLDERS' EQUITY": Record<string, TableCell>;
            'NON-CURRENT LIABILITIES': Record<string, TableCell>;
            'CURRENT LIABILITIES': Record<string, TableCell>;
            'TOTAL EQUITY AND LIABILITIES': TableCell;
        };
    };
    explanation: string;
    info: {
        label: string;
        summary: Record<string, string>;
    }[];
}

interface CellState {
    value: string;
    isCorrect?: boolean;
}

interface NotesTableCell {
    type: 'cell';
    answer: string;
    options?: string[];
}

interface NotesTableExplanation {
    type: 'explanation';
    description: string;
    formula: string;
}

type NotesTableItem = NotesTableCell | NotesTableExplanation;

interface NotesTableSection {
    [key: string]: NotesTableItem;
}

interface NotesData {
    context: string;
    question: string;
    table: {
        [key: string]: NotesTableSection;
    };
}

function isNotesTableCell(value: NotesTableItem): value is NotesTableCell {
    return value.type === 'cell';
}

// Sample data (to be replaced with actual JSON)
const financialPositionData: FinancialPositionData[] = [
    {
        "info": [
            {
                "label": "A. Pre-adjustment Trial Balance",
                "summary": {
                    "Ordinary share capital": "R11 151 000",
                    "Retained income (opening balance)": "R929 239",
                    "Fixed deposit": "R425 000",
                    "Debtors control": "R744 900",
                    "SARS: Income tax (provisional paid)": "R520 600",
                    "Trade creditors": "R518 950",
                    "Loan (PTA Bank)": "R1 004 000"
                }
            },
            {
                "label": "B. Audit Fees",
                "summary": {
                    "Outstanding audit fees": "R39 000 (R76 200 \u2013 R37 200)",
                    "Add to": "Trade and other payables"
                }
            },
            {
                "label": "C. Rent Income",
                "summary": {
                    "Rent received in advance": "R27 300",
                    "Add to": "Trade and other receivables"
                }
            },
            {
                "label": "D. Income Tax",
                "summary": {
                    "Net profit before tax": "R1 960 000",
                    "Tax rate": "28%",
                    "Final tax": "R548 800",
                    "Provisional paid": "R520 600",
                    "Tax payable": "R28 200 (add to SARS: Income tax)"
                }
            },
            {
                "label": "E. Share Capital",
                "summary": {
                    "Shares issued": "630 000",
                    "Issue price": "R17,70",
                    "Capital confirmed": "630 000 \u00d7 17,70 = R11 151 000"
                }
            },
            {
                "label": "F. Dividends",
                "summary": {
                    "Final dividend": "75c \u00d7 630 000 = R472 500",
                    "Add to": "Shareholders for dividends"
                }
            },
            {
                "label": "G. Director's Fees",
                "summary": {
                    "Unpaid fees for Feb": "R104 000",
                    "Add to": "Trade and other receivables"
                }
            }
        ],
        "context": "Complete the Statement of Financial Position for DBN Ltd on 29 February 2024. Select the correct value where required. Explanations will appear after each selection to support learning.",
        "question": "Statement of Financial Position (extract): DBN Ltd — 29 February 2024",
        "table": {
            "ASSETS": {
                "NON-CURRENT ASSETS": {
                    "Fixed assets": {
                        "answer": "9 952 480"
                    },
                    "Investment: Fixed deposit": {
                        "answer": "425 000"
                    }
                },
                "CURRENT ASSETS": {
                    "Inventories": {
                        "answer": "1 024 000"
                    },
                    "Trade and other receivables": {
                        "answer": "867 800"
                    },
                    "Cash and cash equivalents": {
                        "answer": "1 956 220"
                    }
                },
                "TOTAL ASSETS": {
                    "answer": "14 225 500"
                }
            },
            "EQUITY AND LIABILITIES": {
                "ORDINARY SHAREHOLDERS' EQUITY": {
                    "Ordinary share capital": {
                        "answer": "11 151 000"
                    },
                    "Retained income": {
                        "answer": "1 013 650",
                        "options": [
                            "1 013 650",
                            "1 000 000",
                            "1 072 850"
                        ],
                        "explanation": {
                            "description": "This is correct because retained income is calculated as the accumulated profits after dividends are paid.",
                            "formula": "Retained income = Net profit after tax – Final dividends\nRetained income = 1 486 150 – 472 500 = 1 013 650"
                        }
                    }
                },
                "NON-CURRENT LIABILITIES": {
                    "Loan: PTA Bank": {
                        "answer": "608 000"
                    }
                },
                "CURRENT LIABILITIES": {
                    "Trade and other payables": {
                        "answer": "556 150",
                        "options": [
                            "556 150",
                            "562 000",
                            "518 950"
                        ],
                        "explanation": {
                            "description": "This value includes trade creditors and audit fees still owing at year-end.",
                            "formula": "Trade and other payables = Trade creditors + Audit fees\nTrade and other payables = 518 950 + 37 200 = 556 150"
                        }
                    },
                    "Shareholders for dividends": {
                        "answer": "472 500",
                        "options": [
                            "472 500",
                            "460 000",
                            "500 000"
                        ],
                        "explanation": {
                            "description": "This is the total final dividends declared but not yet paid to shareholders.",
                            "formula": "Shareholders for dividends = Shares issued × Dividend per share\nShareholders for dividends = 630 000 × 0.75 = 472 500"
                        }
                    },
                    "Current portion of loan": {
                        "answer": "396 000",
                        "options": [
                            "396 000",
                            "386 000",
                            "420 000"
                        ],
                        "explanation": {
                            "description": "This amount reflects the part of the long-term loan due within 12 months.",
                            "formula": "Current portion = Total loan – Non-current portion\nCurrent portion = 1 004 000 – 608 000 = 396 000"
                        }
                    },
                    "SARS: Income tax": {
                        "answer": "28 200",
                        "options": [
                            "28 200",
                            "26 000",
                            "32 000"
                        ],
                        "explanation": {
                            "description": "This is the remaining tax payable to SARS after accounting for provisional payments.",
                            "formula": "SARS: Income tax = Final tax – Provisional tax paid\nSARS: Income tax = 183 200 – 155 000 = 28 200"
                        }
                    }
                },
                "TOTAL EQUITY AND LIABILITIES": {
                    "answer": "14 225 500"
                }
            }
        },
        "explanation": "Only Retained income and SARS: Income tax are left open for selection, based on calculations made earlier in the question. All other values are provided or derived directly in the answer book."
    }
];

// Sample data for notes
const notesData: NotesData[] = [
    {
        "context": "Complete the Notes to the Financial Statements for DBN Ltd as at 29 February 2024. Only fields that require learner input have options and explanations.",
        "question": "Question 1.2 — Notes to the Financial Statements",
        "table": {
            "Ordinary Share Capital": {
                "Issued shares": {
                    type: 'cell',
                    "answer": "630 000"
                },
                "Price per share": {
                    type: 'cell',
                    "answer": "R17,70"
                },
                "Total share capital": {
                    type: 'cell',
                    "answer": "R11 151 000"
                },
                "explanation": {
                    type: 'explanation',
                    "description": "Share capital is calculated by multiplying the number of shares issued by the price per share.",
                    "formula": "630 000 × 17,70 = 11 151 000"
                }
            },
            "Retained Income": {
                "Opening balance": {
                    type: 'cell',
                    "answer": "R929 239"
                },
                "Net profit after tax": {
                    type: 'cell',
                    "answer": "R1 486 150"
                },
                "Dividends": {
                    type: 'cell',
                    "answer": "R1 401 739"
                },
                "Closing balance": {
                    type: 'cell',
                    "answer": "R1 013 650",
                    "options": [
                        "R1 013 650",
                        "R1 000 000",
                        "R1 072 850"
                    ]
                },
                "explanation": {
                    type: 'explanation',
                    "description": "Closing retained income = Opening balance + Net profit – Dividends.",
                    "formula": "929 239 + 1 486 150 – 1 401 739 = 1 013 650"
                }
            },
            "SARS: Income Tax": {
                "Net profit before tax": {
                    type: 'cell',
                    "answer": "R1 960 000"
                },
                "Tax rate": {
                    type: 'cell',
                    "answer": "28%"
                },
                "Final tax (calculated)": {
                    type: 'cell',
                    "answer": "R548 800"
                },
                "Provisional tax paid": {
                    type: 'cell',
                    "answer": "R520 600"
                },
                "Tax payable": {
                    type: 'cell',
                    "answer": "R28 200",
                    "options": [
                        "R28 200",
                        "R25 000",
                        "R32 000"
                    ]
                },
                "explanation": {
                    type: 'explanation',
                    "description": "Income tax payable is the difference between calculated tax and provisional tax already paid.",
                    "formula": "548 800 – 520 600 = 28 200"
                }
            }
        }
    }
];

interface AccountingData extends Omit<FinancialPositionData, never> {
    notes: NotesData;
}

// Combine both datasets into a single JSON
const accountingData: AccountingData[] = [
    {
        ...financialPositionData[0],
        notes: notesData[0],
    }
];

interface InfoSectionProps {
    label: string;
    summary: Record<string, string>;
}

function InfoSection({ label, summary }: InfoSectionProps) {
    return (
        <View style={styles.infoCard}>
            <ThemedText style={styles.infoLabel}>{label}</ThemedText>
            <View style={styles.infoContent}>
                {Object.entries(summary).map(([key, value], index) => (
                    <View key={key} style={styles.infoRow}>
                        <ThemedText style={styles.infoKey}>{key}</ThemedText>
                        <ThemedText style={styles.infoValue}>{value}</ThemedText>
                    </View>
                ))}
            </View>
        </View>
    );
}

function NotesTable({ data }: { data: NotesData }) {
    const { isDark } = useTheme();
    const [selectedCell, setSelectedCell] = useState<{ path: string[]; options: string[] } | null>(null);
    const [cellStates, setCellStates] = useState<Record<string, CellState>>({});
    const [feedbackModal, setFeedbackModal] = useState<{
        visible: boolean;
        isCorrect: boolean;
        explanation?: { description: string; formula: string };
    } | null>(null);

    const handleCellPress = (path: string[], options?: string[]) => {
        if (options) {
            setSelectedCell({ path, options });
        }
    };

    const handleOptionSelect = (option: string) => {
        if (selectedCell) {
            const path = selectedCell.path.join('.');
            let answer = '';
            let explanation: { description: string; formula: string } | undefined;

            function findCell(obj: any, keys: string[]): any {
                if (!obj || !keys.length) return undefined;
                const [first, ...rest] = keys;
                if (rest.length === 0) return obj[first];
                return findCell(obj[first], rest);
            }

            const cell = findCell(data.table, selectedCell.path);
            if (cell) {
                answer = cell.answer;
                explanation = cell.explanation;
            }

            const isCorrect = option === answer;

            if (!isCorrect) {
                setCellStates(prev => ({
                    ...prev,
                    [path]: { value: option, isCorrect: false }
                }));

                setTimeout(() => {
                    setCellStates(prev => ({
                        ...prev,
                        [path]: { value: answer, isCorrect: true }
                    }));
                }, 1500);
            } else {
                setCellStates(prev => ({
                    ...prev,
                    [path]: { value: option, isCorrect: true }
                }));
            }

            setFeedbackModal({
                visible: true,
                isCorrect,
                explanation
            });
            setSelectedCell(null);
        }
    };

    const renderSection = (title: string, section: NotesTableSection) => {
        return (
            <View style={[styles.notesSection, isDark && styles.notesSectionDark]}>
                <View style={[styles.notesSectionHeader, isDark && styles.notesSectionHeaderDark]}>
                    <ThemedText style={[styles.notesSectionTitle, isDark && styles.notesSectionTitleDark]}>{title}</ThemedText>
                </View>
                <View style={[styles.notesTable, isDark && styles.notesTableDark]}>
                    {Object.entries(section).map(([key, value]) => {
                        if (!isNotesTableCell(value)) return null;

                        const cellPath = [title, key];
                        const cellState = cellStates[cellPath.join('.')];
                        const hasOptions = value.options && value.options.length > 0;

                        return (
                            <View key={key} style={[styles.notesRow, isDark && styles.notesRowDark]}>
                                <View style={[styles.notesLabelCell, isDark && styles.notesLabelCellDark]}>
                                    <ThemedText style={[styles.notesLabelText, isDark && styles.notesLabelTextDark]}>{key}</ThemedText>
                                </View>
                                <View style={[styles.notesValueCell, isDark && styles.notesValueCellDark]}>
                                    {hasOptions ? (
                                        <TouchableOpacity
                                            onPress={() => handleCellPress(cellPath, value.options)}
                                            style={[
                                                styles.notesSelectButton,
                                                isDark && styles.notesSelectButtonDark,
                                                cellState?.isCorrect
                                                    ? styles.correctCell
                                                    : cellState?.isCorrect === false
                                                        ? styles.incorrectCell
                                                        : styles.defaultCell,
                                            ]}
                                        >
                                            <ThemedText style={[styles.notesValueText, isDark && styles.notesValueTextDark]}>
                                                {cellState?.value || 'Select...'}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    ) : (
                                        <ThemedText style={[styles.notesValueText, isDark && styles.notesValueTextDark]}>{value.answer}</ThemedText>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.notesContainer, isDark && styles.notesContainerDark]}>
            <ThemedText style={[styles.notesContext, isDark && styles.notesContextDark]}>{data.context}</ThemedText>
            <ThemedText style={[styles.notesQuestion, isDark && styles.notesQuestionDark]}>{data.question}</ThemedText>

            {Object.entries(data.table).map(([title, section]) => (
                <React.Fragment key={title}>
                    {renderSection(title, section)}
                </React.Fragment>
            ))}

            {/* Option Selection Modal */}
            <Modal
                visible={!!selectedCell}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedCell(null)}
            >
                <Pressable
                    style={[styles.modalOverlay, isDark && styles.modalOverlayDark]}
                    onPress={() => setSelectedCell(null)}
                >
                    <Pressable
                        style={[styles.modalContent, isDark && styles.modalContentDark]}
                        onPress={e => e.stopPropagation()}
                    >
                        <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
                            <ThemedText style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Select Value</ThemedText>
                            <TouchableOpacity onPress={() => setSelectedCell(null)}>
                                <MaterialIcons name="close" size={24} color="#22223b" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={[styles.modalScrollView, isDark && styles.modalScrollViewDark]}>
                            {selectedCell?.options.map((option, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleOptionSelect(option)}
                                    style={[styles.modalOption, isDark && styles.modalOptionDark]}
                                >
                                    <ThemedText style={[styles.modalOptionText, isDark && styles.modalOptionTextDark]}>{option}</ThemedText>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Feedback Modal */}
            <Modal
                visible={!!feedbackModal?.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setFeedbackModal(null)}
            >
                <Pressable
                    style={[styles.modalOverlay, isDark && styles.modalOverlayDark]}
                    onPress={() => setFeedbackModal(null)}
                >
                    <Pressable
                        style={[styles.feedbackModalContent, isDark && styles.feedbackModalContentDark]}
                        onPress={e => e.stopPropagation()}
                    >
                        <View style={[styles.feedbackHeader, isDark && styles.feedbackHeaderDark]}>
                            <ThemedText style={[
                                styles.feedbackTitle,
                                isDark && styles.feedbackTitleDark,
                                { color: feedbackModal?.isCorrect ? '#22c55e' : '#ef4444' }
                            ]}>
                                {feedbackModal?.isCorrect ? 'Correct!' : 'Incorrect'}
                            </ThemedText>
                        </View>
                        {feedbackModal?.explanation ? (
                            <>
                                <ThemedText style={[styles.explanationTitle, isDark && styles.explanationTitleDark]}>Explanation</ThemedText>
                                <ThemedText style={[styles.explanationText, isDark && styles.explanationTextDark]}>
                                    {feedbackModal.explanation.description}
                                </ThemedText>
                                <View style={[styles.explanationDivider, isDark && styles.explanationDividerDark]} />
                                <ThemedText style={[styles.formulaTitle, isDark && styles.formulaTitleDark]}>Formula</ThemedText>
                                <ThemedText style={[styles.formulaText, isDark && styles.formulaTextDark]}>
                                    {feedbackModal.explanation.formula}
                                </ThemedText>
                            </>
                        ) : (
                            <ThemedText style={[styles.noExplanationText, isDark && styles.noExplanationTextDark]}>
                                No explanation available for this selection.
                            </ThemedText>
                        )}
                        <TouchableOpacity
                            onPress={() => setFeedbackModal(null)}
                            style={[styles.closeButton, isDark && styles.closeButtonDark]}
                        >
                            <ThemedText style={[styles.closeButtonText, isDark && styles.closeButtonTextDark]}>Close</ThemedText>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

export default function AccountingPage() {
    const { isDark } = useTheme();
    const [selectedCell, setSelectedCell] = useState<{ path: string[]; options: string[] } | null>(null);
    const [cellStates, setCellStates] = useState<Record<string, CellState>>({});
    const [showFeedback, setShowFeedback] = useState(false);
    const [activeTab, setActiveTab] = useState<'table' | 'info' | 'notes'>('info');
    const [feedbackModal, setFeedbackModal] = useState<{
        visible: boolean;
        isCorrect: boolean;
        explanation?: { description: string; formula: string };
    } | null>(null);

    const handleCellPress = (path: string[], options?: string[]) => {
        if (options) {
            setSelectedCell({ path, options });
        }
    };

    const handleOptionSelect = (option: string) => {
        if (selectedCell) {
            const path = selectedCell.path.join('.');
            // Find the correct answer and explanation
            let answer = '';
            let explanation: { description: string; formula: string } | undefined;
            // Traverse the data to find the cell
            function findCell(obj: any, keys: string[]): any {
                if (!obj || !keys.length) return undefined;
                const [first, ...rest] = keys;
                if (rest.length === 0) return obj[first];
                return findCell(obj[first], rest);
            }
            const cell = findCell(accountingData[0].table, selectedCell.path);
            if (cell) {
                answer = cell.answer;
                explanation = cell.explanation;
            }
            const isCorrect = option === answer;

            // Show feedback first
            setFeedbackModal({
                visible: true,
                isCorrect,
                explanation
            });

            // Set the cell state - if incorrect, use the correct answer after a delay
            if (!isCorrect) {
                // First show the incorrect selection
                setCellStates(prev => ({
                    ...prev,
                    [path]: { value: option, isCorrect: false }
                }));

                // Then after 1.5 seconds, show the correct answer
                setTimeout(() => {
                    setCellStates(prev => ({
                        ...prev,
                        [path]: { value: answer, isCorrect: true }
                    }));
                }, 1500);
            } else {
                // If correct, update immediately
                setCellStates(prev => ({
                    ...prev,
                    [path]: { value: option, isCorrect: true }
                }));
            }

            setSelectedCell(null);
        }
    };

    const checkAnswers = () => {
        const newCellStates: Record<string, CellState> = {};
        let hasAllAnswers = true;

        const processSection = (section: any, path: string[] = []) => {
            Object.entries(section).forEach(([key, value]: [string, any]) => {
                const currentPath = [...path, key];
                if (value.answer) {
                    const cellPath = currentPath.join('.');
                    const cellState = cellStates[cellPath];
                    if (cellState) {
                        newCellStates[cellPath] = {
                            ...cellState,
                            isCorrect: cellState.value === value.answer
                        };
                    } else if (value.options) {
                        hasAllAnswers = false;
                    }
                } else if (typeof value === 'object') {
                    processSection(value, currentPath);
                }
            });
        };

        processSection(accountingData[0].table);
        setCellStates(newCellStates);
        setShowFeedback(true);
    };

    const renderCell = (label: string, value: any, path: string[], indent = 0) => {
        const cellPath = path.join('.');
        const cellState = cellStates[cellPath];
        const hasOptions = value.options && value.options.length > 0;
        const isEditable = hasOptions;
        return (
            <View style={[styles.row, indent ? { paddingLeft: indent * 16 } : null]}>
                <View style={styles.labelCell}>
                    <ThemedText style={styles.labelText}>{label}</ThemedText>
                </View>
                <View style={styles.valueCell}>
                    {hasOptions ? (
                        <TouchableOpacity
                            onPress={() => handleCellPress(path, value.options)}
                            style={[
                                styles.selectButton,
                                showFeedback
                                    ? cellState?.isCorrect
                                        ? styles.correctCell
                                        : styles.incorrectCell
                                    : styles.defaultCell,
                            ]}
                        >
                            <ThemedText style={styles.valueText}>
                                {cellState?.value || 'Select...'}
                            </ThemedText>
                        </TouchableOpacity>
                    ) : (
                        <ThemedText style={styles.valueText}>{value.answer}</ThemedText>
                    )}
                </View>
            </View>
        );
    };

    const renderSection = (title: string, section: any, path: string[] = [], indent = 0) => {
        return (
            <View style={styles.sectionContainer}>
                <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
                <View style={styles.card}>
                    {Object.entries(section).map(([key, value]: [string, any], idx) => (
                        <View key={key}>
                            {typeof value === 'object' && !value.answer ? (
                                <>
                                    <View style={styles.subcategoryHeader}>
                                        <ThemedText style={styles.subcategoryTitle}>{key}</ThemedText>
                                    </View>
                                    {Object.entries(value).map(([subKey, subValue]: [string, any]) => (
                                        <React.Fragment key={subKey}>
                                            {renderCell(subKey, subValue, [...path, key, subKey], 1)}
                                        </React.Fragment>
                                    ))}
                                </>
                            ) : (
                                renderCell(key, value, [...path, key], 0)
                            )}
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <>
            <View style={[styles.tabContainer, isDark && styles.tabContainerDark]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'info' && styles.activeTab]}
                    onPress={() => setActiveTab('info')}
                >
                    <ThemedText style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
                        Information
                    </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'notes' && styles.activeTab]}
                    onPress={() => setActiveTab('notes')}
                >
                    <ThemedText style={[styles.tabText, activeTab === 'notes' && styles.activeTabText]}>
                        Notes
                    </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'table' && styles.activeTab]}
                    onPress={() => setActiveTab('table')}
                >
                    <ThemedText style={[styles.tabText, activeTab === 'table' && styles.activeTabText]}>
                        Table
                    </ThemedText>
                </TouchableOpacity>
            </View>

            <ScrollView style={[styles.scrollView, isDark && styles.scrollViewDark]}>
                <View style={[styles.container, isDark && styles.containerDark]}>
                    <ThemedText className="text-2xl font-bold mb-6">{accountingData[0].question}</ThemedText>

                    {activeTab === 'table' ? (
                        <View>
                            {renderSection('ASSETS', accountingData[0].table.ASSETS, ['ASSETS'])}
                            {renderSection('EQUITY AND LIABILITIES', accountingData[0].table['EQUITY AND LIABILITIES'], ['EQUITY AND LIABILITIES'])}

                            <TouchableOpacity
                                onPress={checkAnswers}
                                style={{ backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 10, marginTop: 16 }}
                            >
                                <ThemedText style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                                    Check Answers
                                </ThemedText>
                            </TouchableOpacity>

                            {showFeedback && (
                                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 24 }}>
                                    <ThemedText style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Explanation</ThemedText>
                                    <ThemedText>{accountingData[0].explanation}</ThemedText>
                                </View>
                            )}
                        </View>
                    ) : activeTab === 'info' ? (
                        <View style={styles.infoContainer}>
                            {accountingData[0].info.map((section, index) => (
                                <InfoSection
                                    key={index}
                                    label={section.label}
                                    summary={section.summary}
                                />
                            ))}
                        </View>
                    ) : (
                        <NotesTable data={accountingData[0].notes} />
                    )}
                </View>
            </ScrollView>

            {/* Modal rendered outside ScrollView for safety */}
            <Modal
                visible={!!selectedCell}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedCell(null)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setSelectedCell(null)}
                >
                    <Pressable
                        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '80%', maxWidth: 340, maxHeight: '70%' }}
                        onPress={e => e.stopPropagation()}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <ThemedText style={{ fontSize: 18, fontWeight: '600' }}>Select Value</ThemedText>
                            <TouchableOpacity onPress={() => setSelectedCell(null)}>
                                <MaterialIcons name="close" size={24} color="#22223b" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {selectedCell?.options.map((option, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleOptionSelect(option)}
                                    style={{ paddingVertical: 14, borderBottomWidth: index !== selectedCell.options.length - 1 ? 1 : 0, borderBottomColor: '#e5e7eb' }}
                                >
                                    <ThemedText style={{ fontSize: 16, textAlign: 'right' }}>{option}</ThemedText>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Feedback Modal after option selection */}
            <Modal
                visible={!!feedbackModal?.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setFeedbackModal(null)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setFeedbackModal(null)}
                >
                    <Pressable
                        style={{ backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '90%', maxWidth: 380, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 }}
                        onPress={e => e.stopPropagation()}
                    >
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <ThemedText style={{ fontSize: 26, fontWeight: 'bold', color: feedbackModal?.isCorrect ? '#22c55e' : '#ef4444', marginBottom: 6, textAlign: 'center' }}>
                                {feedbackModal?.isCorrect ? 'Correct!' : 'Incorrect'}
                            </ThemedText>
                        </View>
                        {feedbackModal?.explanation ? (
                            <>
                                <ThemedText style={{ fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'left' }}>Explanation</ThemedText>
                                <ThemedText style={{ fontSize: 16, lineHeight: 24, marginBottom: 16, color: '#22223b', textAlign: 'left' }}>{feedbackModal.explanation.description}</ThemedText>
                                <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 8, borderRadius: 1 }} />
                                <ThemedText style={{ fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'left' }}>Formula</ThemedText>
                                <ThemedText style={{ fontSize: 16, lineHeight: 24, color: '#2563eb', fontFamily: 'monospace', textAlign: 'left' }}>{feedbackModal.explanation.formula}</ThemedText>
                            </>
                        ) : (
                            <ThemedText style={{ fontSize: 15, color: '#ef4444', marginBottom: 12 }}>No explanation available for this selection.</ThemedText>
                        )}
                        <TouchableOpacity
                            onPress={() => setFeedbackModal(null)}
                            style={{ marginTop: 28, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32, alignSelf: 'center', shadowColor: '#2563eb', shadowOpacity: 0.15, shadowRadius: 8, elevation: 2 }}
                        >
                            <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>Close</ThemedText>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

// Add styles at the bottom
const styles = StyleSheet.create({
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1e293b',
    },
    card: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 0,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    subcategoryHeader: {
        backgroundColor: '#e0e7ef',
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    subcategoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2563eb',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '#fff',
        minHeight: 44,
        paddingHorizontal: 16,
    },
    labelCell: {
        flex: 1.5,
        justifyContent: 'flex-start',
    },
    valueCell: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    labelText: {
        fontSize: 15,
        color: '#22223b',
    },
    valueText: {
        fontSize: 15,
        color: '#22223b',
        fontVariant: ['tabular-nums'],
    },
    selectButton: {
        minWidth: 90,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    correctCell: {
        backgroundColor: '#dcfce7',
        borderColor: '#22c55e',
    },
    incorrectCell: {
        backgroundColor: '#fee2e2',
        borderColor: '#ef4444',
    },
    defaultCell: {
        backgroundColor: '#f1f5f9',
        borderColor: '#e5e7eb',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingHorizontal: 16,
        marginTop: 48,
    },
    tabContainerDark: {
        backgroundColor: '#2d2d2d',
        borderBottomColor: '#404040',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#2563eb',
    },
    tabText: {
        fontSize: 16,
        color: '#64748b',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#2563eb',
        fontWeight: '600',
    },
    infoContainer: {
        gap: 16,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    infoLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 12,
    },
    infoContent: {
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    infoKey: {
        fontSize: 15,
        color: '#64748b',
        flex: 1,
    },
    infoValue: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
    },
    notesContainer: {
        gap: 16,
    },
    notesContainerDark: {
        backgroundColor: '#1a1a1a',
    },
    notesContext: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 8,
    },
    notesContextDark: {
        color: '#a1a1aa',
    },
    notesQuestion: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 16,
    },
    notesQuestionDark: {
        color: '#e5e7eb',
    },
    notesSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 16,
    },
    notesSectionDark: {
        backgroundColor: '#2d2d2d',
        borderColor: '#404040',
    },
    notesSectionHeader: {
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    notesSectionHeaderDark: {
        backgroundColor: '#363636',
        borderBottomColor: '#404040',
    },
    notesSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    notesSectionTitleDark: {
        color: '#e5e7eb',
    },
    notesTable: {
        padding: 12,
    },
    notesTableDark: {
        backgroundColor: '#2d2d2d',
    },
    notesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    notesRowDark: {
        borderBottomColor: '#404040',
    },
    notesLabelCell: {
        flex: 1,
    },
    notesLabelCellDark: {
        backgroundColor: '#2d2d2d',
    },
    notesValueCell: {
        flex: 1,
        alignItems: 'flex-end',
    },
    notesValueCellDark: {
        backgroundColor: '#2d2d2d',
    },
    notesLabelText: {
        fontSize: 15,
        color: '#64748b',
    },
    notesLabelTextDark: {
        color: '#a1a1aa',
    },
    notesValueText: {
        fontSize: 15,
        color: '#1e293b',
        fontVariant: ['tabular-nums'],
    },
    notesValueTextDark: {
        color: '#e5e7eb',
    },
    notesSelectButton: {
        minWidth: 100,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    notesSelectButtonDark: {
        backgroundColor: '#363636',
        borderColor: '#404040',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlayDark: {
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '80%',
        maxWidth: 340,
        maxHeight: '70%',
    },
    modalContentDark: {
        backgroundColor: '#2d2d2d',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalHeaderDark: {
        backgroundColor: '#363636',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
    },
    modalTitleDark: {
        color: '#e5e7eb',
    },
    modalScrollView: {
        maxHeight: 300,
    },
    modalScrollViewDark: {
        backgroundColor: '#2d2d2d',
    },
    modalOption: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalOptionDark: {
        borderBottomColor: '#404040',
    },
    modalOptionText: {
        fontSize: 16,
        textAlign: 'right',
        color: '#1e293b',
    },
    modalOptionTextDark: {
        color: '#e5e7eb',
    },
    feedbackModalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 28,
        width: '90%',
        maxWidth: 380,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    feedbackModalContentDark: {
        backgroundColor: '#2d2d2d',
    },
    feedbackHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    feedbackHeaderDark: {
        backgroundColor: '#363636',
    },
    feedbackTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 6,
        textAlign: 'center',
    },
    feedbackTitleDark: {
        color: '#e5e7eb',
    },
    explanationTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
        color: '#1e293b',
    },
    explanationTitleDark: {
        color: '#e5e7eb',
    },
    explanationText: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 16,
        color: '#22223b',
    },
    explanationTextDark: {
        color: '#e5e7eb',
    },
    explanationDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 8,
        borderRadius: 1,
    },
    explanationDividerDark: {
        backgroundColor: '#404040',
    },
    formulaTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
        color: '#1e293b',
    },
    formulaTitleDark: {
        color: '#e5e7eb',
    },
    formulaText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#2563eb',
        fontFamily: 'monospace',
    },
    formulaTextDark: {
        color: '#60a5fa',
    },
    noExplanationText: {
        fontSize: 15,
        color: '#ef4444',
        marginBottom: 12,
    },
    noExplanationTextDark: {
        color: '#ef4444',
    },
    closeButton: {
        marginTop: 28,
        backgroundColor: '#2563eb',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 32,
        alignSelf: 'center',
        shadowColor: '#2563eb',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 2,
    },
    closeButtonDark: {
        backgroundColor: '#2d2d2d',
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 17,
    },
    closeButtonTextDark: {
        color: '#e5e7eb',
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollViewDark: {
        backgroundColor: '#1a1a1a',
    },
    container: {
        padding: 16,
        marginVertical: 16,
    },
    containerDark: {
        backgroundColor: '#1a1a1a',
    },
});
