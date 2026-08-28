import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Animated,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ScrollView,
    RefreshControl,
    Image,
    useWindowDimensions,
    ActivityIndicator,
    Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import adminUserService, {
    AdminUser,
    AdminUsersResult,
    DisplayMode,
    SortDirection,
    VerifiedFilter,
    ActiveFilter,
} from "@/services/adminUserService";
import { useUserManagementStats } from "@/hooks/useUserManagementStat";
import { UserDetailsModal } from "./UserDetailModal";
import { ErrorModal } from "@/components/ErrorModal";
import { SuccessModal } from "@/components/SuccessModal";
import { StandaloneAgentManagement } from './StandaloneAgentManagement';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (d: string) => {
    try {
        return new Date(d).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return d;
    }
};

const formatRate = (rate: number) => `${rate.toFixed(1)}%`;

const ROLE_COLORS: Record<string, string> = {
    ADMIN: "#8B5CF6",
    OWNER: "#F59E0B",
    MANAGER: "#3B82F6",
    CASHIER: "#10B981",
    STAFF: "#6B7280",
};
const getRoleColor = (role: string) => ROLE_COLORS[role] ?? "#6B7280";

const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];
const DEBOUNCE_MS = 350;

// ─── Responsive grid columns ───────────────────────────────────────────────────
const getGridColumns = (width: number): number => {
    if (width >= 1280) return 5;
    if (width >= 1024) return 4;
    if (width >= 768) return 3;
    if (width >= 500) return 2;
    return 1;
};

// ─── Skeleton pulse ────────────────────────────────────────────────────────────
const usePulse = () => {
    const anim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return anim;
};

// ─── KPI Skeleton Card ─────────────────────────────────────────────────────────
const KpiSkeleton: React.FC = () => {
    const { colors } = useTheme();
    const opacity = usePulse();
    return (
        <Animated.View style={[kpiStyles.card, { opacity, borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={[kpiStyles.skeletonIcon, { backgroundColor: colors.border }]} />
            <View style={[kpiStyles.skeletonValue, { backgroundColor: colors.border }]} />
            <View style={[kpiStyles.skeletonLabel, { backgroundColor: colors.border }]} />
        </Animated.View>
    );
};

// ─── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
    icon: string;
    label: string;
    value: string | number;
    accent: string;
    sub?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, accent, sub }) => {
    const { colors } = useTheme();
    return (
        <View style={[kpiStyles.card, { borderColor: accent + "33", backgroundColor: colors.surface }]}>
            <View style={[kpiStyles.iconWrap, { backgroundColor: accent + "18" }]}>
                <Text style={kpiStyles.icon}>{icon}</Text>
            </View>
            <Text style={[kpiStyles.value, { color: accent }]}>{value}</Text>
            <Text style={[kpiStyles.label, { color: colors.textSecondary }]}>{label}</Text>
            {sub ? <Text style={[kpiStyles.sub, { color: colors.textSecondary }]}>{sub}</Text> : null}
        </View>
    );
};

const kpiStyles = StyleSheet.create({
    row: {
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        overflow: "visible",
    },
    scrollContent: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 10,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 14,
        minWidth: 130,
        flex: 1,
        alignItems: "flex-start",
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    icon: { fontSize: 18 },
    value: {
        fontSize: 22,
        fontWeight: "800",
        letterSpacing: -0.5,
        marginBottom: 2,
    },
    label: {
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    sub: { fontSize: 10, marginTop: 3 },
    skeletonIcon: { width: 36, height: 36, borderRadius: 10, marginBottom: 10 },
    skeletonValue: { width: 60, height: 22, borderRadius: 6, marginBottom: 6 },
    skeletonLabel: { width: 80, height: 10, borderRadius: 4 },
    errorRow: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    errorText: { fontSize: 12, flex: 1 },
    retryBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    retryText: { fontSize: 12, fontWeight: "600" },
});

// ─── KPI Section ───────────────────────────────────────────────────────────────
const KpiSection: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => {
    const { colors } = useTheme();
    const { stats, loading, error, refresh } = useUserManagementStats();

    const handleRefresh = () => {
        refresh();
        onRefresh?.();
    };

    if (error) {
        return (
            <View style={[kpiStyles.errorRow, { backgroundColor: colors.error + "1A", borderBottomWidth: 1, borderBottomColor: colors.error + "33" }]}>
                <Text style={[kpiStyles.errorText, { color: colors.error }]}>⚠ Failed to load statistics</Text>
                <TouchableOpacity style={[kpiStyles.retryBtn, { backgroundColor: colors.error + "22" }]} onPress={handleRefresh}>
                    <Text style={[kpiStyles.retryText, { color: colors.error }]}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[kpiStyles.row, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <View style={kpiStyles.scrollContent}>
                {loading || !stats ? (
                    Array.from({ length: 7 }).map((_, i) => <KpiSkeleton key={i} />)
                ) : (
                    <>
                        <KpiCard icon="👥" label="Total Users" value={stats.totalUsers.toLocaleString()} accent="#60A5FA" />
                        <KpiCard icon="✅" label="Active Users" value={stats.activeUsers.toLocaleString()} accent="#10B981" sub={`${formatRate(stats.activeRate)} of total`} />
                        <KpiCard icon="🚫" label="Inactive" value={stats.inactiveUsers.toLocaleString()} accent="#EF4444" />
                        <KpiCard icon="🔰" label="Verified" value={stats.verifiedUsers.toLocaleString()} accent="#8B5CF6" sub={`${formatRate(stats.verificationRate)} of total`} />
                        <KpiCard icon="⏳" label="Unverified" value={stats.unverifiedUsers.toLocaleString()} accent="#F59E0B" />
                        <KpiCard icon="🆕" label="New Today" value={stats.newUsersToday.toLocaleString()} accent="#34D399" />
                        <KpiCard icon="📅" label="This Month" value={stats.newUsersThisMonth.toLocaleString()} accent="#A78BFA" />
                    </>
                )}
            </View>
        </View>
    );
};

// ─── Avatar ────────────────────────────────────────────────────────────────────
const UserAvatar: React.FC<{ uri: string | null; size?: number }> = ({ uri, size = 36 }) => {
    const { colors } = useTheme();
    return (
        <Image
            source={uri ? { uri } : undefined}
            defaultSource={require("@/assets/images/placeholder.png")}
            style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.border }}
        />
    );
};

// ─── Status Badge ──────────────────────────────────────────────────────────────
const Badge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
    <View style={{ backgroundColor: color + "22", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
        <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
);

// ─── Card (Grid Mode) ──────────────────────────────────────────────────────────
const UserGridCard: React.FC<{ user: AdminUser; onPress: () => void }> = ({ user, onPress }) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <UserAvatar uri={user.profilePhoto} size={44} />
            <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={1}>{user.fullname}</Text>
            {/* Always render username + org lines so all cards share the same layout height */}
            <Text style={[styles.gridUsername, { color: colors.textSecondary }]} numberOfLines={1}>
                @{user.username}
            </Text>
            <Text
                style={[styles.gridOrg, { color: user.org ? "#60A5FA" : "transparent" }]}
                numberOfLines={1}
            >
                {user.org ? user.org.name : " "}
            </Text>
            {/* Badges pushed to bottom via flex spacer */}
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
                <Badge label={user.role} color={getRoleColor(user.role)} />
                {!user.isActive && <Badge label="Banned" color="#EF4444" />}
                {user.isVerified
                    ? <Badge label="Verified" color="#10B981" />
                    : <Badge label="Unverified" color="#6B7280" />}
            </View>
        </TouchableOpacity>
    );
};

// ─── Table Row ─────────────────────────────────────────────────────────────────
const TableRow: React.FC<{ user: AdminUser; onPress: () => void }> = ({ user, onPress }) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.tableRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <View style={[styles.tableCell, styles.tableCellAvatar]}>
                <UserAvatar uri={user.profilePhoto} size={32} />
            </View>
            <View style={[styles.tableCell, { flex: 2 }]}>
                <Text style={[styles.tableCellTextPrimary, { color: colors.text }]} numberOfLines={1}>{user.fullname}</Text>
                {user.org && <Text style={[styles.tableCellTextSub]} numberOfLines={1}>{user.org.name}</Text>}
            </View>
            <View style={[styles.tableCell, { flex: 1.5 }]}>
                <Text style={[styles.tableCellText, { color: colors.textSecondary }]} numberOfLines={1}>@{user.username}</Text>
            </View>
            <View style={[styles.tableCell, { flex: 2 }]}>
                <Text style={[styles.tableCellText, { color: colors.textSecondary }]} numberOfLines={1}>{user.email}</Text>
            </View>
            <View style={[styles.tableCell, { flex: 1 }]}>
                <Badge label={user.role} color={getRoleColor(user.role)} />
            </View>
            <View style={[styles.tableCell, { flex: 1 }]}>
                <Badge
                    label={user.isVerified ? "✓ Verified" : "—"}
                    color={user.isVerified ? "#10B981" : "#6B7280"}
                />
            </View>
            <View style={[styles.tableCell, { flex: 1 }]}>
                <Badge
                    label={user.isActive ? "Active" : "Banned"}
                    color={user.isActive ? "#3B82F6" : "#EF4444"}
                />
            </View>
            <View style={[styles.tableCell, { flex: 1.2 }]}>
                <Text style={[styles.tableCellText, { color: colors.textSecondary }]}>{formatDate(user.createdAt)}</Text>
            </View>
        </TouchableOpacity>
    );
};

// ─── Filter Chip ───────────────────────────────────────────────────────────────
const FilterChip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[
                styles.filterChip,
                { backgroundColor: active ? colors.primary : colors.border },
            ]}
            onPress={onPress}
        >
            <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.textSecondary }]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
const OrganizationUserManagementScreen: React.FC = () => {
    const { user: currentUser } = useAuth();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    // Auto-compute grid columns based on screen width
    const gridColumns = getGridColumns(width);

    // ─── Settings (persisted) ────────────────────────────────────────
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [pageSize, setPageSize] = useState(30);
    const [page, setPage] = useState(1);
    const [sortDirection, setSortDirection] = useState<SortDirection>("DESC");
    const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>("all");
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
    // Only "table" | "grid" — no card mode
    const [displayMode, setDisplayMode] = useState<"table" | "grid">("table");

    // ─── Search ──────────────────────────────────────────────────────
    const [searchText, setSearchText] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Data ────────────────────────────────────────────────────────
    const [result, setResult] = useState<AdminUsersResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // ─── Modals ──────────────────────────────────────────────────────
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [errorModal, setErrorModal] = useState<{ visible: boolean; title?: string; text: string }>({ visible: false, text: "" });
    const [successModal, setSuccessModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: "" });

    const showError = (text: string, title?: string) => setErrorModal({ visible: true, title, text });
    const showSuccess = (message: string) => setSuccessModal({ visible: true, message });

    // ─── Permission Guard ─────────────────────────────────────────────
    // ─── Load Settings ────────────────────────────────────────────────
    useEffect(() => {
        adminUserService.loadSettings().then((s) => {
            setPage(s.page);
            setPageSize(s.pageSize);
            setSortDirection(s.sortDirection);
            setVerifiedFilter(s.verifiedFilter);
            setActiveFilter(s.activeFilter);
            // Only accept table/grid — ignore "card" from saved settings
            setDisplayMode(s.displayMode === "grid" ? "grid" : "table");
            setSettingsLoaded(true);
        });
    }, []);

    // ─── Search Debounce ──────────────────────────────────────────────
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedSearch(searchText);
            setPage(1);
        }, DEBOUNCE_MS);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [searchText]);

    // ─── Fetch Users ──────────────────────────────────────────────────
    const fetchUsers = useCallback(
        async (opts: { isRefresh?: boolean } = {}) => {
            if (!settingsLoaded) return;
            if (opts.isRefresh) setRefreshing(true);
            else setLoading(true);

            try {
                const verifiedArg = verifiedFilter === "verified" ? true : verifiedFilter === "unverified" ? false : undefined;
                const activeArg = activeFilter === "active" ? true : activeFilter === "banned" ? false : undefined;

                const res = await adminUserService.getUsers({
                    search: debouncedSearch || undefined,
                    page,
                    pageSize,
                    sortDirection,
                    verified: verifiedArg,
                    active: activeArg,
                });
                setResult(res);
            } catch (err: any) {
                showError(err?.message ?? "Failed to load users.", "Load Error");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [settingsLoaded, page, pageSize, sortDirection, verifiedFilter, activeFilter, debouncedSearch]
    );

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // ─── Persist settings ─────────────────────────────────────────────
    useEffect(() => {
        if (!settingsLoaded) return;
        adminUserService.saveSettings({ page, pageSize, sortDirection, verifiedFilter, activeFilter, displayMode, gridColumns });
    }, [settingsLoaded, page, pageSize, sortDirection, verifiedFilter, activeFilter, displayMode, gridColumns]);

    // ─── Mutation Handlers ────────────────────────────────────────────
    const updateUserInList = (updated: AdminUser) => {
        setResult((prev) => prev ? { ...prev, items: prev.items.map((u) => (u.id === updated.id ? updated : u)) } : prev);
        setSelectedUser(updated);
    };

    const handleVerify = async (userId: number) => {
        try { const u = await adminUserService.verifyUser(userId); updateUserInList(u); showSuccess("User verified."); }
        catch (err: any) { showError(err?.message ?? "Failed.", "Verify Failed"); throw err; }
    };
    const handleUnverify = async (userId: number) => {
        try { const u = await adminUserService.unverifyUser(userId); updateUserInList(u); showSuccess("Verification removed."); }
        catch (err: any) { showError(err?.message ?? "Failed.", "Unverify Failed"); throw err; }
    };
    const handleBan = async (userId: number) => {
        try { const u = await adminUserService.banUser(userId); updateUserInList(u); showSuccess("User banned."); }
        catch (err: any) { showError(err?.message ?? "Failed.", "Ban Failed"); throw err; }
    };
    const handleUnban = async (userId: number) => {
        try { const u = await adminUserService.unbanUser(userId); updateUserInList(u); showSuccess("User unbanned."); }
        catch (err: any) { showError(err?.message ?? "Failed.", "Unban Failed"); throw err; }
    };
    const handleChangePassword = async (userId: number, password: string) => {
        try { await adminUserService.changePassword(userId, password); showSuccess("Password updated."); }
        catch (err: any) { showError(err?.message ?? "Failed.", "Password Error"); throw err; }
    };

    // ─── Pagination ───────────────────────────────────────────────────
    const totalPages = result ? Math.ceil(result.total / pageSize) : 1;
    const users = result?.items ?? [];

    // ─── Table min width (fixed columns, not flex) ────────────────────
    // avatar(52) + name(180) + username(150) + email(220) + role(110) + verified(100) + status(100) + created(120) + padding
    const TABLE_MIN_WIDTH = 52 + 180 + 150 + 220 + 110 + 100 + 100 + 120 + 8 * 16; // ~1160

    if (currentUser?.role !== "ADMIN") {
        return <View style={[styles.centered, { backgroundColor: colors.background }]}><Text style={[styles.errorText, { color: colors.error }]}>Access denied.</Text></View>;
    }

    return (
        <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            {/* ─── Toolbar ─────────────────────────────────────────────── */}
            <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Text style={[styles.toolbarTitle, { color: colors.text }]}>User Management</Text>
                {result && <Text style={[styles.toolbarCount, { color: colors.textSecondary }]}>{result.total.toLocaleString()} users</Text>}
            </View>

            {/* ─── KPI Stats ───────────────────────────────────────────── */}
            <KpiSection onRefresh={() => fetchUsers({ isRefresh: true })} />

            {/* ─── Search ──────────────────────────────────────────────── */}
            <View style={[styles.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <View style={[styles.searchInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search by name, username, email..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText("")}>
                            <Text style={{ color: colors.textSecondary, paddingRight: 10 }}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ─── Filters ─────────────────────────────────────────────── */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[styles.filtersScroll, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
                contentContainerStyle={styles.filtersContent}
            >
                {/* Verified filter */}
                <FilterChip label="All" active={verifiedFilter === "all"} onPress={() => { setVerifiedFilter("all"); setPage(1); }} />
                <FilterChip label="✓ Verified" active={verifiedFilter === "verified"} onPress={() => { setVerifiedFilter("verified"); setPage(1); }} />
                <FilterChip label="Unverified" active={verifiedFilter === "unverified"} onPress={() => { setVerifiedFilter("unverified"); setPage(1); }} />

                <View style={[styles.filterSep, { backgroundColor: colors.border }]} />

                {/* Active filter */}
                <FilterChip label="Active" active={activeFilter === "active"} onPress={() => { setActiveFilter("active"); setPage(1); }} />
                <FilterChip label="Banned" active={activeFilter === "banned"} onPress={() => { setActiveFilter("banned"); setPage(1); }} />
                <FilterChip label="All Users" active={activeFilter === "all"} onPress={() => { setActiveFilter("all"); setPage(1); }} />

                <View style={[styles.filterSep, { backgroundColor: colors.border }]} />

                {/* Sort */}
                <FilterChip label="Newest" active={sortDirection === "DESC"} onPress={() => { setSortDirection("DESC"); setPage(1); }} />
                <FilterChip label="Oldest" active={sortDirection === "ASC"} onPress={() => { setSortDirection("ASC"); setPage(1); }} />

                <View style={[styles.filterSep, { backgroundColor: colors.border }]} />

                {/* Display mode — table or grid only */}
                <FilterChip label="⊞ Table" active={displayMode === "table"} onPress={() => setDisplayMode("table")} />
                <FilterChip label="▦ Grid" active={displayMode === "grid"} onPress={() => setDisplayMode("grid")} />
            </ScrollView>

            {/* ─── Content ─────────────────────────────────────────────── */}
            {loading && !refreshing ? (
                <View style={[styles.centered, { backgroundColor: colors.background }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading users…</Text>
                </View>
            ) : users.length === 0 ? (
                <View style={[styles.centered, { backgroundColor: colors.background }]}>
                    <Text style={styles.emptyIcon}>👥</Text>
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No users found</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Try adjusting your search or filters.</Text>
                </View>
            ) : displayMode === "table" ? (
                /*
                 * TABLE LAYOUT STRATEGY
                 * ─────────────────────
                 * We need BOTH horizontal and vertical scrolling.
                 * React Native doesn't support nested ScrollViews in the same direction,
                 * but we can do:
                 *   • Outer vertical ScrollView  → scrolls rows up/down
                 *   • Inner horizontal ScrollView (stickyHeader trick via a single ScrollView)
                 *
                 * The cleanest approach that actually works:
                 *   • One ScrollView with horizontal + vertical inside a flex:1 container
                 *     using `nestedScrollEnabled` — but that only helps Android same-axis.
                 *
                 * Best working pattern for RN tables:
                 *   • Outer: horizontal ScrollView (flex:1) — drives left/right pan
                 *   • Inner: vertical ScrollView — drives up/down scroll
                 *   • Both header and rows are inside the horizontal ScrollView at TABLE_MIN_WIDTH
                 */
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator
                    style={{ flex: 1 }}
                    contentContainerStyle={{ minWidth: TABLE_MIN_WIDTH, flexGrow: 1 }}
                    bounces={false}
                >
                    {/* This View stretches to at least TABLE_MIN_WIDTH and fills vertically */}
                    <View style={{ minWidth: TABLE_MIN_WIDTH, flex: 1 }}>
                        {/* Sticky header row */}
                        <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                            <View style={[styles.tableCell, styles.tableCellAvatar]} />
                            <View style={[styles.tableCell, { flex: 2 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Full Name</Text></View>
                            <View style={[styles.tableCell, { flex: 1.5 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Username</Text></View>
                            <View style={[styles.tableCell, { flex: 2 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Email</Text></View>
                            <View style={[styles.tableCell, { flex: 1 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Role</Text></View>
                            <View style={[styles.tableCell, { flex: 1 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Verified</Text></View>
                            <View style={[styles.tableCell, { flex: 1 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Status</Text></View>
                            <View style={[styles.tableCell, { flex: 1.2 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>Created</Text></View>
                        </View>
                        {/* Body rows — vertical scroll */}
                        <ScrollView
                            style={{ flex: 1 }}
                            showsVerticalScrollIndicator
                            nestedScrollEnabled
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={() => fetchUsers({ isRefresh: true })} />
                            }
                            contentContainerStyle={{ paddingBottom: 80 }}
                        >
                            {users.map((item) => (
                                <TableRow key={String(item.id)} user={item} onPress={() => setSelectedUser(item)} />
                            ))}
                        </ScrollView>
                    </View>
                </ScrollView>
            ) : (
                /* ── GRID: auto columns based on screen width ── */
                <FlatList
                    key={`grid-${gridColumns}`}
                    data={users}
                    keyExtractor={(u) => String(u.id)}
                    numColumns={gridColumns}
                    renderItem={({ item }) => (
                        <View style={{ flex: 1, padding: 5, alignSelf: "stretch" }}>
                            <UserGridCard user={item} onPress={() => setSelectedUser(item)} />
                        </View>
                    )}
                    contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => fetchUsers({ isRefresh: true })} />
                    }
                />
            )}

            {/* ─── Pagination ──────────────────────────────────────────── */}
            {result && result.total > 0 && (
                <View style={[styles.pagination, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.pageBtn, { backgroundColor: colors.border }, page === 1 && styles.pageBtnDisabled]}
                        onPress={() => setPage(1)} disabled={page === 1}
                    >
                        <Text style={[styles.pageBtnText, { color: colors.text }]}>«</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.pageBtn, { backgroundColor: colors.border }, page === 1 && styles.pageBtnDisabled]}
                        onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    >
                        <Text style={[styles.pageBtnText, { color: colors.text }]}>‹</Text>
                    </TouchableOpacity>

                    <Text style={[styles.pageInfo, { color: colors.textSecondary }]}>{page} / {totalPages}</Text>

                    <TouchableOpacity
                        style={[styles.pageBtn, { backgroundColor: colors.border }, page >= totalPages && styles.pageBtnDisabled]}
                        onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    >
                        <Text style={[styles.pageBtnText, { color: colors.text }]}>›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.pageBtn, { backgroundColor: colors.border }, page >= totalPages && styles.pageBtnDisabled]}
                        onPress={() => setPage(totalPages)} disabled={page >= totalPages}
                    >
                        <Text style={[styles.pageBtnText, { color: colors.text }]}>»</Text>
                    </TouchableOpacity>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 8 }}>
                        <View style={styles.pageSizeRow}>
                            {PAGE_SIZE_OPTIONS.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.pageSizeBtn, { backgroundColor: pageSize === s ? colors.primary : colors.border }]}
                                    onPress={() => { setPageSize(s); setPage(1); }}
                                >
                                    <Text style={[styles.pageSizeBtnText, { color: pageSize === s ? "#fff" : colors.textSecondary }]}>
                                        {s}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* ─── Modals ───────────────────────────────────────────────── */}
            <UserDetailsModal
                visible={!!selectedUser}
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
                onVerify={handleVerify}
                onUnverify={handleUnverify}
                onBan={handleBan}
                onUnban={handleUnban}
                onChangePassword={handleChangePassword}
            />
            <SuccessModal
                visible={successModal.visible}
                message={successModal.message}
                onClose={() => setSuccessModal({ visible: false, message: "" })}
            />
            <ErrorModal
                visible={errorModal.visible}
                title={errorModal.title}
                text={errorModal.text}
                onClose={() => setErrorModal((prev) => ({ ...prev, visible: false }))}
            />
        </View>
    );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: { flex: 1, overflow: "hidden" },
    toolbar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    toolbarTitle: { fontSize: 18, fontWeight: "700" },
    toolbarCount: { fontSize: 13 },
    searchRow: { paddingHorizontal: 12, paddingVertical: 10 },
    searchInputWrap: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    searchIcon: { fontSize: 14, marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, paddingVertical: 11 },
    filtersScroll: {
        borderBottomWidth: 1,
        maxHeight: 52,
    },
    filtersContent: { paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", gap: 6 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    filterChipText: { fontSize: 12, fontWeight: "600" },
    filterSep: { width: 1, height: 20, marginHorizontal: 4 },
    // ── Table ──
    tableHeader: { borderBottomWidth: 2 },
    tableHeaderText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
    tableRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    tableCell: { paddingHorizontal: 8, justifyContent: "center" },
    tableCellAvatar: { width: 52 },
    tableCellText: { fontSize: 13 },
    tableCellTextPrimary: { fontSize: 13, fontWeight: "600" },
    tableCellTextSub: { fontSize: 11, color: "#60A5FA", marginTop: 1 },
    // ── Grid ──
    gridItem: {
        flex: 1,
        alignSelf: "stretch",
        borderRadius: 14,
        padding: 14,
        alignItems: "center",
        borderWidth: 1,
    },
    gridName: { fontSize: 13, fontWeight: "700", marginTop: 8, textAlign: "center" },
    gridUsername: { fontSize: 11, marginTop: 2, textAlign: "center" },
    gridOrg: { fontSize: 11, marginTop: 2, textAlign: "center" },
    // ── Pagination ──
    pagination: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderTopWidth: 1,
    },
    pageBtn: {
        width: 34, height: 34, borderRadius: 8,
        alignItems: "center", justifyContent: "center",
        marginHorizontal: 2,
    },
    pageBtnDisabled: { opacity: 0.35 },
    pageBtnText: { fontWeight: "700", fontSize: 16 },
    pageInfo: { fontSize: 13, fontWeight: "600", marginHorizontal: 10 },
    pageSizeRow: { flexDirection: "row", gap: 4, alignItems: "center" },
    pageSizeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    pageSizeBtnText: { fontSize: 12, fontWeight: "600" },
    // ── Misc ──
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    loadingText: { fontSize: 14 },
    emptyIcon: { fontSize: 40 },
    emptyTitle: { fontSize: 16, fontWeight: "700" },
    emptySubtitle: { fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
    errorText: { fontSize: 16, fontWeight: "600" },
});

export const UserManagementScreen: React.FC = () => {
    const { colors } = useTheme();
    const [scope, setScope] = useState<'users' | 'agents'>('users');
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <TouchableOpacity onPress={() => setScope('users')} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: scope === 'users' ? colors.primary : colors.border }}><Text style={{ color: scope === 'users' ? '#fff' : colors.textSecondary, fontWeight: '700' }}>All Users</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setScope('agents')} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: scope === 'agents' ? colors.primary : colors.border }}><Text style={{ color: scope === 'agents' ? '#fff' : colors.textSecondary, fontWeight: '700' }}>Standalone Agents</Text></TouchableOpacity>
            </View>
            {scope === 'agents' ? <StandaloneAgentManagement /> : <OrganizationUserManagementScreen />}
        </View>
    );
};

export default UserManagementScreen;
