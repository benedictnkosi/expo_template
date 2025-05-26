import React from 'react';
import Modal from 'react-native-modal';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';

interface AskParentModalProps {
    isVisible: boolean;
    onClose: () => void;
    parentMessage: string;
    onShare: () => void;
    isDark: boolean;
    colors: any;
}

export function AskParentModal({ isVisible, onClose, parentMessage, onShare, isDark, colors }: AskParentModalProps) {
    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            backdropOpacity={0.8}
            style={{ margin: 0, justifyContent: 'center', alignItems: 'center' }}
        >
            <View style={{ width: '100%', maxHeight: '80%', borderRadius: 20, padding: 24, backgroundColor: isDark ? colors.card : '#fff' }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                    <ThemedText style={{ fontSize: 24, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: colors.text }}>
                        Ask a Parent
                    </ThemedText>
                    <ThemedText style={{ fontSize: 16, lineHeight: 24, marginBottom: 24, textAlign: 'center', color: colors.textSecondary }}>
                        {parentMessage}
                    </ThemedText>
                    <View style={{ gap: 12 }}>
                        <TouchableOpacity
                            style={{ width: '100%', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: isDark ? colors.primary : '#4F46E5', alignItems: 'center' }}
                            onPress={onShare}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Ionicons name="share-outline" size={20} color="#fff" />
                                <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Share with Parent</ThemedText>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ width: '100%', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: isDark ? colors.surface : '#64748B', alignItems: 'center' }}
                            onPress={onClose}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Ionicons name="close-outline" size={20} color="#fff" />
                                <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Close</ThemedText>
                            </View>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
} 