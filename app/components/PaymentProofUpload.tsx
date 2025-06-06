import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ThemedText } from './ThemedText';
import { useAuth } from '@/contexts/AuthContext';
import { HOST_URL } from '@/config/api';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface SelectedFile {
    uri: string;
    name: string;
    mimeType: string;
}

export function PaymentProofUpload() {
    const { user } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showCongratsModal, setShowCongratsModal] = useState(false);
    const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
    const [showPickerModal, setShowPickerModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const errorRef = useRef<View>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (error) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [error]);

    async function pickFileAndUpload() {
        try {
            setError(null);
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                if (!asset.size) throw new Error('Could not determine file size');
                const fileSizeInMB = asset.size / (1024 * 1024);
                if (fileSizeInMB > MAX_FILE_SIZE_MB) {
                    setError(`Please select a file under ${MAX_FILE_SIZE_MB}MB`);
                    return;
                }
                setSelectedFile({
                    uri: asset.uri,
                    name: asset.name,
                    mimeType: asset.mimeType || 'application/octet-stream',
                });
                setFileName(asset.name);
                handleFileUpload({
                    uri: asset.uri,
                    name: asset.name,
                    mimeType: asset.mimeType || 'application/octet-stream',
                });
            }
        } catch (error) {
            console.error('Error picking file:', error);
            setError('Failed to pick file. Please try again.');
        } finally {
            setShowPickerModal(false);
        }
    }

    async function handleFileUpload(file?: SelectedFile) {
        const fileToUpload = file || selectedFile;
        if (!fileToUpload || !user?.uid) {
            setError('Please select a file first');
            return;
        }
        setIsUploading(true);
        setError(null);
        try {
            const fileInfo = await FileSystem.getInfoAsync(fileToUpload.uri);
            if (!fileInfo.exists || !fileInfo.size) {
                throw new Error('File not found or could not determine size');
            }
            if (fileInfo.size > MAX_FILE_SIZE_BYTES) {
                setError(`Please select a file under ${MAX_FILE_SIZE_MB}MB`);
                return;
            }
            const formData = new FormData();
            formData.append('proof_image', {
                uri: Platform.OS === 'ios' ? fileToUpload.uri.replace('file://', '') : fileToUpload.uri,
                name: fileToUpload.name,
                type: fileToUpload.mimeType,
            } as any);
            formData.append('learner_id', user.uid);
            const response = await fetch(`${HOST_URL}/api/payment-proof/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });
            const data = await response.json();
            if (data.status === 'OK' && data.subscription) {
                console.log('PaymentProofUpload data', data);
                setUploadResult(data);
                setSubscriptionEndDate(data.subscription.end_date);
                setShowConfetti(true);
                setShowCongratsModal(true);
                setSelectedFile(null);
                setFileName(null);
            } else if (data.status === 'ERROR' && data.message) {
                console.log('PaymentProofUpload data', data);
                let userMessage = data.message;
                if (userMessage.includes('already been processed') || userMessage.includes('Duplicate payment')) {
                    userMessage = 'This payment has already been processed. Please do not upload the same proof again.';
                }
                setError(userMessage);
            } else if (data.status === 'NOK' && data.message) {
                let userMessage = data.message;
                if (userMessage.includes('already been processed') || userMessage.includes('Duplicate payment')) {
                    userMessage = 'This payment has already been processed. Please do not upload the same proof again.';
                }
                setError(userMessage);
            } else {
                setError(data.message || 'Upload failed');
            }
        } catch (error) {
            console.error('[PaymentProofUpload] Upload error:', error);
            let errorMessage = 'Failed to upload proof of payment.';
            if (error instanceof Error && error.message) {
                if (error.message.includes('already been processed') || error.message.includes('Duplicate payment')) {
                    errorMessage = 'This payment has already been processed. Please do not upload the same proof again.';
                } else {
                    errorMessage = error.message;
                }
            }
            setError(errorMessage);
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <ScrollView
            ref={scrollViewRef}
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
        >
            <TouchableOpacity
                style={styles.button}
                onPress={() => setShowPickerModal(true)}
                disabled={isUploading}
            >
                <Ionicons name="cloud-upload-outline" size={22} color="#fff" style={styles.uploadIcon} />
                <ThemedText style={styles.buttonText}>
                    {isUploading ? 'Uploading...' : 'Upload Proof of Payment'}
                </ThemedText>
            </TouchableOpacity>

            <Modal
                visible={showPickerModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPickerModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ThemedText style={styles.modalTitle}>Choose File</ThemedText>
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={pickFileAndUpload}
                        >
                            <ThemedText style={styles.modalButtonText}>Choose File</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => setShowPickerModal(false)}
                        >
                            <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {selectedFile && (
                <View style={styles.selectedFileContainer}>
                    <ThemedText style={styles.fileName}>Selected: {selectedFile.name}</ThemedText>
                    {isUploading && <ActivityIndicator style={{ marginTop: 12 }} />}
                </View>
            )}

            {!selectedFile && isUploading && <ActivityIndicator style={{ marginTop: 12 }} />}

            {error && (
                <View style={styles.errorContainer}>
                    <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
            )}

            {uploadResult && uploadResult.status === 'OK' && (
                <View style={styles.resultBox}>
                    <ThemedText>Payment Date: {uploadResult.data.payment_date}</ThemedText>
                    <ThemedText>Amount: {uploadResult.data.amount}</ThemedText>
                    <ThemedText>Reference: {uploadResult.data.reference}</ThemedText>
                    <ThemedText>Subscription: {uploadResult.subscription.type} (ends {uploadResult.subscription.end_date})</ThemedText>
                </View>
            )}

            {showConfetti && (
                <ConfettiCannon
                    count={120}
                    origin={{ x: 0, y: 0 }}
                    fadeOut
                    autoStart
                    onAnimationEnd={() => setShowConfetti(false)}
                />
            )}

            <Modal
                visible={showCongratsModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCongratsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ThemedText style={styles.congratsTitle}>🎉 Congratulations!</ThemedText>
                        <ThemedText style={styles.congratsText}>
                            Your payment was received and your subscription is now active!
                        </ThemedText>
                        {subscriptionEndDate && (
                            <ThemedText style={styles.congratsText}>
                                Your subscription is valid until: {"\n"}
                                <ThemedText style={styles.endDate}>{subscriptionEndDate}</ThemedText>
                            </ThemedText>
                        )}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowCongratsModal(false)}
                        >
                            <ThemedText style={styles.closeButtonText}>Close</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    contentContainer: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: 20,
    },
    button: {
        backgroundColor: '#4F46E5',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        width: '100%',
        marginTop: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
    uploadIcon: {
        marginRight: 8,
    },
    fileName: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
    },
    resultBox: {
        marginTop: 20,
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        padding: 16,
        width: '100%',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: 300,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    modalButton: {
        backgroundColor: '#4F46E5',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        width: '100%',
        marginBottom: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    cancelButton: {
        backgroundColor: '#64748B',
    },
    congratsTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    congratsText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 12,
    },
    endDate: {
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    closeButton: {
        marginTop: 16,
        backgroundColor: '#4F46E5',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 24,
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    selectedFileContainer: {
        marginTop: 16,
        width: '100%',
        alignItems: 'center',
    },
    uploadButton: {
        backgroundColor: '#10B981',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 8,
    },
    uploadButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    errorContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
        width: '100%',
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        textAlign: 'center',
    },
}); 