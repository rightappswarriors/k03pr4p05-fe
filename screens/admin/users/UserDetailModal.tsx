import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    ActivityIndicator,
} from "react-native";
import { AdminUser } from "@/services/adminUserService";
import { useTheme } from "@/contexts/ThemeContext";
import { ChangePasswordModal } from "./ChangePasswordModal";

interface UserDetailsModalProps {
    visible: boolean;
    user: AdminUser | null;
    onClose: () => void;
    onVerify: (userId: number) => Promise<void>;
    onUnverify: (userId: number) => Promise<void>;
    onBan: (userId: number) => Promise<void>;
    onUnban: (userId: number) => Promise<void>;
    onChangePassword: (userId: number, password: string) => Promise<void>;
}

const ROLE_COLORS: Record<string, string> = {
    ADMIN: "#8B5CF6",
    OWNER: "#F59E0B",
    MANAGER: "#3B82F6",
    CASHIER: "#10B981",
    STAFF: "#6B7280",
};
const getRoleColor = (role: string) => ROLE_COLORS[role] ?? "#6B7280";

const formatDate = (dateStr: string) => {
    try {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    } catch {
        return dateStr;
    }
};

// ─── Info Row ──────────────────────────────────────────────────────────────────
interface InfoRowProps {
    label: string;
    value: string | null | undefined;
    valueColor?: string;
    borderColor: string;
    labelColor: string;
    valueTextColor: string;
}
const InfoRow: React.FC<InfoRowProps> = ({ label, value, valueColor, borderColor, labelColor, valueTextColor }) => (
    <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
        <Text style={[styles.infoLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: valueColor ?? valueTextColor }]}>
            {value ?? "—"}
        </Text>
    </View>
);

// ─── Action Button ─────────────────────────────────────────────────────────────
interface ActionBtnProps {
    icon: string;
    label: string;
    color: string;
    onPress: () => void;
    loading: boolean;
    disabled: boolean;
}
const ActionBtn: React.FC<ActionBtnProps> = ({ icon, label, color, onPress, loading, disabled }) => (
    <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: color + "11", borderColor: color + "33" }]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.75}
    >
        {loading ? (
            <ActivityIndicator size="small" color={color} />
        ) : (
            <>
                <Text style={styles.actionBtnIcon}>{icon}</Text>
                <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
            </>
        )}
    </TouchableOpacity>
);

// ─── Modal ─────────────────────────────────────────────────────────────────────
export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
    visible,
    user,
    onClose,
    onVerify,
    onUnverify,
    onBan,
    onUnban,
    onChangePassword,
}) => {
    const { colors } = useTheme();
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [showChangePassword, setShowChangePassword] = useState(false);

    if (!user) return null;

    const runAction = async (key: string, fn: () => Promise<void>) => {
        setLoadingAction(key);
        try { await fn(); } finally { setLoadingAction(null); }
    };

    const handleChangePassword = async (password: string) => {
        await onChangePassword(user.id, password);
        setShowChangePassword(false);
    };

    return (
        <>
            <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
                <View style={styles.overlay}>
                    <View style={[styles.container, { backgroundColor: colors.surface }]}>

                        {/* ─── Header ───────────────────────────────────────── */}
                        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                            <Image
                                source={user.profilePhoto ? { uri: user.profilePhoto } : undefined}
                                defaultSource={require("@/assets/images/placeholder.png")}
                                style={[styles.avatar, { backgroundColor: colors.border, borderColor: colors.border }]}
                            />
                            <View style={styles.headerInfo}>
                                <Text style={[styles.fullName, { color: colors.text }]}>{user.fullname}</Text>
                                <Text style={[styles.usernameText, { color: colors.textSecondary }]}>@{user.username}</Text>
                                {user.org && (
                                    <View style={[styles.orgBadge, { backgroundColor: colors.primary + "18" }]}>
                                        <Text style={[styles.orgBadgeText, { color: colors.primary }]}>
                                            🏢 {user.org.name}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity
                                style={[styles.closeBtn, { backgroundColor: colors.border }]}
                                onPress={onClose}
                            >
                                <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ─── Body ─────────────────────────────────────────── */}
                        <ScrollView
                            style={styles.body}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >
                            {/* Status Badges */}
                            <View style={styles.badges}>
                                <View style={[styles.badge, { backgroundColor: getRoleColor(user.role) + "22" }]}>
                                    <Text style={[styles.badgeText, { color: getRoleColor(user.role) }]}>{user.role}</Text>
                                </View>
                                <View style={[styles.badge, { backgroundColor: (user.isVerified ? "#10B981" : "#6B7280") + "22" }]}>
                                    <Text style={[styles.badgeText, { color: user.isVerified ? "#10B981" : colors.textSecondary }]}>
                                        {user.isVerified ? "✓ Verified" : "Unverified"}
                                    </Text>
                                </View>
                                <View style={[styles.badge, { backgroundColor: (user.isActive ? "#3B82F6" : "#EF4444") + "22" }]}>
                                    <Text style={[styles.badgeText, { color: user.isActive ? "#3B82F6" : "#EF4444" }]}>
                                        {user.isActive ? "Active" : "Banned"}
                                    </Text>
                                </View>
                            </View>

                            {/* Account Details */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.textSecondary, borderBottomColor: colors.border }]}>
                                    Account Details
                                </Text>
                                <InfoRow label="Email" value={user.email} borderColor={colors.border} labelColor={colors.textSecondary} valueTextColor={colors.text} />
                                <InfoRow label="Contact" value={user.contactNumber} borderColor={colors.border} labelColor={colors.textSecondary} valueTextColor={colors.text} />
                                <InfoRow
                                    label="Location"
                                    value={[user.city, user.country].filter(Boolean).join(", ")}
                                    borderColor={colors.border}
                                    labelColor={colors.textSecondary}
                                    valueTextColor={colors.text}
                                />
                                <InfoRow label="Joined" value={formatDate(user.createdAt)} borderColor={colors.border} labelColor={colors.textSecondary} valueTextColor={colors.text} />
                            </View>

                            {/* Organization */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.textSecondary, borderBottomColor: colors.border }]}>
                                    Organization
                                </Text>
                                <InfoRow label="Organization" value={user.org?.name} valueColor={colors.primary} borderColor={colors.border} labelColor={colors.textSecondary} valueTextColor={colors.text} />
                                <InfoRow label="Department" value={user.department?.label} borderColor={colors.border} labelColor={colors.textSecondary} valueTextColor={colors.text} />
                                <InfoRow label="Position" value={user.position?.name} borderColor={colors.border} labelColor={colors.textSecondary} valueTextColor={colors.text} />
                            </View>

                            {/* Actions */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.textSecondary, borderBottomColor: colors.border }]}>
                                    Actions
                                </Text>
                                <View style={styles.actionsGrid}>
                                    {user.isVerified ? (
                                        <ActionBtn icon="✕" label="Unverify User" color="#F59E0B"
                                            onPress={() => runAction("unverify", () => onUnverify(user.id))}
                                            loading={loadingAction === "unverify"} disabled={!!loadingAction} />
                                    ) : (
                                        <ActionBtn icon="✓" label="Verify User" color="#10B981"
                                            onPress={() => runAction("verify", () => onVerify(user.id))}
                                            loading={loadingAction === "verify"} disabled={!!loadingAction} />
                                    )}
                                    {user.isActive ? (
                                        <ActionBtn icon="🚫" label="Ban User" color="#EF4444"
                                            onPress={() => runAction("ban", () => onBan(user.id))}
                                            loading={loadingAction === "ban"} disabled={!!loadingAction} />
                                    ) : (
                                        <ActionBtn icon="✓" label="Unban User" color="#3B82F6"
                                            onPress={() => runAction("unban", () => onUnban(user.id))}
                                            loading={loadingAction === "unban"} disabled={!!loadingAction} />
                                    )}
                                    <ActionBtn icon="🔑" label="Change Password" color="#A78BFA"
                                        onPress={() => setShowChangePassword(true)}
                                        loading={false} disabled={!!loadingAction} />
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {showChangePassword && (
                <ChangePasswordModal
                    visible={showChangePassword}
                    user={user}
                    onClose={() => setShowChangePassword(false)}
                    onSubmit={handleChangePassword}
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.65)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    container: {
        borderRadius: 20,
        width: "100%",
        maxWidth: 560,
        maxHeight: "90%",
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 20,
        borderBottomWidth: 1,
        gap: 14,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
    },
    headerInfo: { flex: 1 },
    fullName: { fontSize: 17, fontWeight: "700" },
    usernameText: { fontSize: 13, marginTop: 2 },
    orgBadge: {
        marginTop: 6,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
    },
    orgBadgeText: { fontSize: 11, fontWeight: "600" },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    closeBtnText: { fontSize: 14, fontWeight: "600" },
    body: { padding: 20 },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    badgeText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
    section: { marginBottom: 20 },
    sectionTitle: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 10,
        borderBottomWidth: 1,
        paddingBottom: 6,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingVertical: 7,
        borderBottomWidth: 1,
    },
    infoLabel: { fontSize: 13, flex: 1 },
    infoValue: { fontSize: 13, fontWeight: "500", flex: 2, textAlign: "right" },
    actionsGrid: { gap: 10 },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    actionBtnIcon: { fontSize: 16 },
    actionBtnText: { fontSize: 14, fontWeight: "600" },
});

export default UserDetailsModal;