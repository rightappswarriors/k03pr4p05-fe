import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    Platform,
} from "react-native";
import { createPortal } from "react-dom";

type ErrorModalProps = {
    visible: boolean;
    title?: string;
    text: string;
    onClose: () => void;
};

export function ErrorModal({
    visible,
    title = "Error",
    text,
    onClose,
}: ErrorModalProps) {
    const { colors } = useTheme();

    if (__DEV__) {
        console.log('[ErrorModal] render, visible=', visible, 'text=', text);
    }
    if (!visible) return null;

    const content = (
        <Pressable style={styles.backdrop} onPress={onClose}>
            <Pressable style={[styles.modal, { backgroundColor: colors.background }]} onPress={() => { }}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
                </TouchableOpacity>

                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>{text}</Text>

                <TouchableOpacity style={styles.actionButton} onPress={onClose}>
                    <Text style={[styles.actionText, { color: colors.text }]}>OK</Text>
                </TouchableOpacity>
            </Pressable>
        </Pressable>
    );

    if (Platform.OS === "web" && typeof document !== "undefined") {
        return createPortal(content, document.body);
    }

    return content;
}

const styles = StyleSheet.create({
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        zIndex: 2147483647,
        ...(Platform.OS === "web" ? { position: "fixed" as any } : {}),
    },
    modal: {
        width: "100%",
        maxWidth: 420,
        borderRadius: 16,
        padding: 20,
        elevation: 10,
    },
    closeButton: {
        position: "absolute",
        right: 12,
        top: 12,
        zIndex: 10,
        padding: 4,
    },
    closeText: {
        fontSize: 20,
        fontWeight: "600",
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 12,
        paddingRight: 30,
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 20,
    },
    actionButton: {
        alignSelf: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    actionText: {
        fontSize: 16,
        fontWeight: "600",
    },
});