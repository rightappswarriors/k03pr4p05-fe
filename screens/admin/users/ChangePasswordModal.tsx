import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { AdminUser } from "@/services/adminUserService";
import { useTheme } from "@/contexts/ThemeContext";

interface ChangePasswordModalProps {
    visible: boolean;
    user: AdminUser;
    onClose: () => void;
    onSubmit: (password: string) => Promise<void>;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
    visible,
    user,
    onClose,
    onSubmit,
}) => {
    const { colors } = useTheme();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

    const validate = (): boolean => {
        const newErrors: { password?: string; confirm?: string } = {};
        if (password.length < 8) newErrors.password = "Password must be at least 8 characters.";
        if (password !== confirmPassword) newErrors.confirm = "Passwords do not match.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            await onSubmit(password);
            setPassword("");
            setConfirmPassword("");
            setErrors({});
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setPassword("");
        setConfirmPassword("");
        setErrors({});
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={[styles.container, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.title, { color: colors.text }]}>Change Password</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Set a new password for{" "}
                        <Text style={[styles.username, { color: colors.primary }]}>{user.fullname}</Text>
                    </Text>

                    {/* New Password */}
                    <Text style={[styles.label, { color: colors.textSecondary }]}>New Password</Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: colors.background,
                                borderColor: errors.password ? colors.error : colors.border,
                                color: colors.text,
                            },
                        ]}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="Min. 8 characters"
                        placeholderTextColor={colors.textSecondary}
                        autoFocus
                        editable={!loading}
                    />
                    {errors.password ? (
                        <Text style={[styles.errorText, { color: colors.error }]}>{errors.password}</Text>
                    ) : null}

                    {/* Confirm Password */}
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: colors.background,
                                borderColor: errors.confirm ? colors.error : colors.border,
                                color: colors.text,
                            },
                        ]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        placeholder="Re-enter password"
                        placeholderTextColor={colors.textSecondary}
                        editable={!loading}
                        onSubmitEditing={handleSubmit}
                        returnKeyType="done"
                    />
                    {errors.confirm ? (
                        <Text style={[styles.errorText, { color: colors.error }]}>{errors.confirm}</Text>
                    ) : null}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: colors.border }]}
                            onPress={handleClose}
                            disabled={loading}
                        >
                            <Text style={[styles.btnCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnSubmit, loading && styles.btnDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.btnSubmitText}>Update Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    container: {
        borderRadius: 16,
        padding: 24,
        width: "100%",
        maxWidth: 420,
    },
    title: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
    subtitle: { fontSize: 13, marginBottom: 20 },
    username: { fontWeight: "600" },
    label: {
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        marginBottom: 6,
    },
    errorText: { fontSize: 12, marginBottom: 12 },
    actions: { flexDirection: "row", gap: 10, marginTop: 20 },
    btn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    btnCancelText: { fontWeight: "600", fontSize: 14 },
    btnSubmit: { backgroundColor: "#3B82F6" },
    btnSubmitText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    btnDisabled: { opacity: 0.6 },
});

export default ChangePasswordModal;