import React, { useEffect, useRef } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Pressable,
    Platform,
} from "react-native";
import { createPortal } from "react-dom";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Types ─────────────────────────────────────────────────────────────────────
type SuccessModalProps = {
    visible: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    onClose: () => void;
};

// ─── Animated Checkmark ────────────────────────────────────────────────────────
const AnimatedCheck: React.FC = () => {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const ringScale = useRef(new Animated.Value(0.4)).current;
    const ringOpacity = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        scale.setValue(0);
        opacity.setValue(0);
        ringScale.setValue(0.4);
        ringOpacity.setValue(0.8);

        Animated.sequence([
            Animated.delay(80),
            Animated.parallel([
                Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 8 }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.sequence([
                    Animated.timing(ringScale, { toValue: 1.5, duration: 500, useNativeDriver: true }),
                    Animated.timing(ringScale, { toValue: 1, duration: 200, useNativeDriver: true }),
                ]),
                Animated.timing(ringOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]),
        ]).start();
    }, []);

    return (
        <View style={checkStyles.wrapper}>
            <Animated.View style={[checkStyles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
            <Animated.View style={[checkStyles.circle, { transform: [{ scale }], opacity }]}>
                <Text style={checkStyles.checkmark}>✓</Text>
            </Animated.View>
        </View>
    );
};

const checkStyles = StyleSheet.create({
    wrapper: { width: 80, height: 80, alignItems: "center", justifyContent: "center", marginBottom: 20 },
    ring: {
        position: "absolute",
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: "#10B981",
        opacity: 0.5,
    },
    circle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: "#10B98118",
        borderWidth: 2,
        borderColor: "#10B981",
        alignItems: "center",
        justifyContent: "center",
    },
    checkmark: { fontSize: 30, color: "#10B981", fontWeight: "700", lineHeight: 36 },
});

// ─── Modal ─────────────────────────────────────────────────────────────────────
export function SuccessModal({
    visible,
    title = "Success",
    message,
    confirmLabel = "Got it",
    onClose,
}: SuccessModalProps) {
    const { colors } = useTheme();
    const slideY = useRef(new Animated.Value(40)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            slideY.setValue(40);
            fadeIn.setValue(0);
            Animated.parallel([
                Animated.timing(fadeIn, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 160, friction: 10 }),
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    if (__DEV__) {
        console.log("[SuccessModal] visible=", visible, "message=", message);
    }

    const content = (
        <Pressable style={styles.backdrop} onPress={onClose}>
            <Pressable onPress={() => {}} style={styles.pressBlocker}>
                <Animated.View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.surface,
                            borderColor: "#10B98122",
                            opacity: fadeIn,
                            transform: [{ translateY: slideY }],
                        },
                    ]}
                >
                    <AnimatedCheck />
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
                    <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={styles.btnText}>{confirmLabel}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Pressable>
        </Pressable>
    );

    if (Platform.OS === "web" && typeof document !== "undefined") {
        return createPortal(content, document.body);
    }

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
            {content}
        </Modal>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        ...(Platform.OS === "web" ? ({
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647,
        } as any) : {}),
    },
    pressBlocker: { width: "100%", maxWidth: 360 },
    card: {
        borderRadius: 24,
        paddingHorizontal: 28,
        paddingTop: 36,
        paddingBottom: 28,
        alignItems: "center",
        width: "100%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 16,
        borderWidth: 1,
    },
    title: { fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
    message: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 28, paddingHorizontal: 8 },
    btn: {
        backgroundColor: "#10B981",
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 48,
        alignItems: "center",
        width: "100%",
    },
    btnText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
});

export default SuccessModal;