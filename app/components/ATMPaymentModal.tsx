import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Share, ScrollView, Linking } from 'react-native';
import Modal from 'react-native-modal';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { HOST_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { getLearner } from '@/services/api';
import { analytics } from '@/services/analytics';
import { PaymentProofUpload } from '../components/PaymentProofUpload';

interface PaymentDetails {
    id: number;
    accountNumber: string;
    bankName: string;
    branchCode: string;
    price: number;
    createdAt: string;
}

interface ATMPaymentModalProps {
    isVisible: boolean;
    onClose: () => void;
}

export function ATMPaymentModal({ isVisible, onClose }: ATMPaymentModalProps) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
    const [learnerDetails, setLearnerDetails] = useState<{ follow_me_code: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isVisible && user?.uid) {
            fetchDetails();
        }
    }, [isVisible, user?.uid]);

    const fetchDetails = async () => {
        try {
            setIsLoading(true);
            // Fetch payment details
            const paymentResponse = await fetch(`${HOST_URL}/api/payments`);
            const paymentData = await paymentResponse.json();
            if (paymentData && paymentData.length > 0) {
                setPaymentDetails(paymentData[0]);
            }

            // Fetch learner details using the getLearner function
            const learnerData = await getLearner(user!.uid);
            setLearnerDetails({ follow_me_code: learnerData.follow_me_code });
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleShareBankingDetails = async () => {
        if (!paymentDetails || !learnerDetails) return;

        const shareMessage = `Dimpo Pro Payment Details:

Amount: R${paymentDetails.price} (Annual Plan)
Reference: ${learnerDetails.follow_me_code}

Bank: ${paymentDetails.bankName}
Account Number: ${paymentDetails.accountNumber}
Branch Code: ${paymentDetails.branchCode}

Please use the reference code when making the payment.`;

        try {
            await Share.share({
                message: shareMessage,
                title: 'Dimpo Pro Payment Details'
            });

            // Track successful share event
            await analytics.track('share_banking_details', {
                userId: user?.uid,
                price: paymentDetails.price,
                bankName: paymentDetails.bankName,
                referenceCode: learnerDetails.follow_me_code
            });
        } catch (error) {
            console.error('Error sharing banking details:', error);

            // Track failed share event
            await analytics.track('share_banking_details_error', {
                userId: user?.uid,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    const handleWhatsAppPress = async () => {
        const whatsappNumber = '27786864479';
        const message = 'Hi, I just paid via ATM/EFT. My reference is AFJK. Please activate my Dimpo Pro.';
        const whatsappUrl = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;

        try {
            await Linking.openURL(whatsappUrl);
        } catch (error) {
            console.error('Error opening WhatsApp:', error);
        }
    };

    if (isLoading) {
        return (
            <Modal
                isVisible={isVisible}
                onBackdropPress={onClose}
                onBackButtonPress={onClose}
                backdropOpacity={0.8}
                style={styles.modal}
            >
                <View style={[styles.container, { backgroundColor: isDark ? colors.card : '#fff' }]}>
                    <ThemedText style={[styles.title, { color: colors.text }]}>Loading...</ThemedText>
                </View>
            </Modal>
        );
    }

    if (!paymentDetails || !learnerDetails) {
        return null;
    }

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            backdropOpacity={0.8}
            style={styles.modal}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            avoidKeyboard={true}
        >
            <View style={[styles.container, { backgroundColor: isDark ? colors.card : '#fff' }]}>
                <View style={styles.header}>
                    <ThemedText style={[styles.title, { color: colors.text }]}>
                        Pay with ATM Deposit or EFT
                    </ThemedText>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollViewContent}
                >
                    <View style={styles.content}>
                        <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
                            Want to upgrade to Pro but don't have Play Store payment set up?
                            You can pay <ThemedText style={{ fontWeight: '700' }}>R{paymentDetails.price}</ThemedText> for the <ThemedText style={{ fontWeight: '700' }}>monthly</ThemedText> plan at ATM or EFT using this reference code:
                        </ThemedText>

                        <View style={[styles.referenceCode, { backgroundColor: isDark ? colors.surface : '#f3f4f6' }]}>
                            <ThemedText style={[styles.referenceCodeText, { color: colors.text }]}>
                                {learnerDetails.follow_me_code}
                            </ThemedText>
                        </View>

                        <View style={styles.detailsContainer}>
                            <View style={styles.detailsHeader}>
                                <Ionicons name="card-outline" size={24} color={colors.primary} style={styles.detailsIcon} />
                                <ThemedText style={[styles.detailsTitle, { color: colors.text }]}>
                                    Use these details:
                                </ThemedText>
                            </View>
                            <View style={styles.details}>
                                <ThemedText style={[styles.detailText, { color: colors.textSecondary }]}>
                                    Bank: {paymentDetails.bankName}
                                </ThemedText>
                                <ThemedText style={[styles.detailText, { color: colors.textSecondary }]}>
                                    Account Number: {paymentDetails.accountNumber}
                                </ThemedText>
                                <ThemedText style={[styles.detailText, { color: colors.textSecondary }]}>
                                    Branch Code: {paymentDetails.branchCode}
                                </ThemedText>
                                <ThemedText style={[styles.detailText, { color: colors.textSecondary }]}>
                                    Reference: {learnerDetails.follow_me_code}
                                </ThemedText>
                            </View>
                        </View>

                        <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
                            Once you've paid, upload proof of payment to activate instantly. or WhatsApp us the proof of payment.
                        </ThemedText>

                        <View style={[styles.trustContainer, { backgroundColor: isDark ? colors.surface : '#f8fafc' }]}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.trustIcon} />
                            <ThemedText style={[styles.trustText, { color: colors.textSecondary }]}>
                                Payments are manually verified and activated within 1 hour.
                            </ThemedText>
                        </View>
                    </View>


                    <View style={styles.buttonsContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.shareButton, { backgroundColor: isDark ? colors.surface : '#64748B' }]}
                            onPress={handleShareBankingDetails}
                        >
                            <Ionicons name="share-outline" size={20} color="#fff" style={styles.buttonIcon} />
                            <ThemedText style={styles.buttonText}>Share Banking Details</ThemedText>
                        </TouchableOpacity>

                        {/* WhatsApp Button */}
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: isDark ? colors.surface : '#25D366' }]}
                            onPress={handleWhatsAppPress}
                        >
                            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                            <ThemedText style={styles.buttonText}>Send Payment Proof</ThemedText>
                        </TouchableOpacity>

                        <PaymentProofUpload />

                        <TouchableOpacity
                            style={[styles.button, styles.secondaryButton, { backgroundColor: isDark ? colors.surface : '#f3f4f6' }]}
                            onPress={onClose}
                        >
                            <ThemedText style={[styles.buttonText, { color: colors.text }]}>Close</ThemedText>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modal: {
        margin: 0,
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        maxHeight: '90%',
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
    },
    content: {
        marginBottom: 24,
    },
    bodyText: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 16,
    },
    referenceCode: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 24,
    },
    referenceCodeText: {
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: 2,
    },
    detailsContainer: {
        marginBottom: 24,
    },
    detailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailsIcon: {
        marginRight: 8,
    },
    detailsTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    details: {
        gap: 8,
    },
    detailText: {
        fontSize: 16,
    },
    footerText: {
        fontSize: 16,
        lineHeight: 24,
    },
    buttonsContainer: {
        gap: 12,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
    },
    primaryButton: {
        backgroundColor: '#4F46E5',
    },
    secondaryButton: {
        backgroundColor: '#f3f4f6',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonIcon: {
        marginRight: 8,
    },
    trustContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
    },
    trustIcon: {
        marginRight: 8,
    },
    trustText: {
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    shareButton: {
        backgroundColor: '#64748B',
    },
}); 