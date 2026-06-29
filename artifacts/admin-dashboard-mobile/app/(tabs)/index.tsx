import { Feather } from "@expo/vector-icons";
import { useGetAdminStats } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";

const c = colors.light;

function fmt(n: number) {
  return (n ?? 0).toLocaleString("fr-FR");
}

function fmtUsdt(n: number) {
  return `${fmt(n)} USDT`;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  iconColor?: string;
  bgColor?: string;
}

function StatCard({ title, value, icon, iconColor = c.primary, bgColor = "#EFF6FF" }: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
        <Feather name={icon as any} size={16} color={iconColor} />
      </View>
      <Text style={[styles.statValue, { color: c.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statTitle, { color: c.mutedForeground }]} numberOfLines={1}>{title}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading, error, refetch } = useGetAdminStats();

  const topPad = Platform.OS === "web" ? 67 : 0;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: topPad }]}>
        <Feather name="alert-circle" size={40} color={c.destructive} />
        <Text style={[styles.errorText, { color: c.destructive }]}>Erreur de chargement</Text>
        <Pressable style={[styles.retryBtn, { backgroundColor: c.primary }]} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const u = stats?.users;
  const w = stats?.withdrawals;
  const b = stats?.bonuses;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.background }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Platform.OS === "web" ? 67 + 16 : 16, paddingBottom: Platform.OS === "web" ? 34 + 80 : 80 },
      ]}
    >
      {/* Users */}
      <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>UTILISATEURS</Text>
      <View style={styles.grid2}>
        <StatCard title="Total" value={fmt(u?.total ?? 0)} icon="users" iconColor={c.primary} bgColor="#EFF6FF" />
        <StatCard title="Aujourd'hui" value={fmt(u?.today ?? 0)} icon="user-plus" iconColor={c.success} bgColor="#F0FDF4" />
        <StatCard title="Cette semaine" value={fmt(u?.week ?? 0)} icon="trending-up" iconColor="#7C3AED" bgColor="#F5F3FF" />
        <StatCard title="Ce mois" value={fmt(u?.month ?? 0)} icon="calendar" iconColor="#0891B2" bgColor="#ECFEFF" />
        <StatCard title="Actifs (7j)" value={fmt(u?.active ?? 0)} icon="activity" iconColor={c.warning} bgColor="#FFFBEB" />
        <StatCard title="Bannis" value={fmt(u?.banned ?? 0)} icon="slash" iconColor={c.destructive} bgColor="#FEF2F2" />
      </View>

      {/* Withdrawals */}
      <Text style={[styles.sectionLabel, { color: c.mutedForeground, marginTop: 20 }]}>RETRAITS</Text>
      <View style={styles.grid2}>
        <StatCard title="Total" value={fmt(w?.total ?? 0)} icon="credit-card" iconColor={c.primary} bgColor="#EFF6FF" />
        <StatCard title="En attente" value={fmt(w?.pending ?? 0)} icon="clock" iconColor={c.warning} bgColor="#FFFBEB" />
        <StatCard title="Validés" value={fmt(w?.approved ?? 0)} icon="check-circle" iconColor={c.success} bgColor="#F0FDF4" />
        <StatCard title="Refusés" value={fmt(w?.rejected ?? 0)} icon="x-circle" iconColor={c.destructive} bgColor="#FEF2F2" />
      </View>

      {/* Bonus + Amount */}
      <Text style={[styles.sectionLabel, { color: c.mutedForeground, marginTop: 20 }]}>FINANCES</Text>
      <View style={styles.grid1}>
        <View style={[styles.bigCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.bigCardRow}>
            <View>
              <Text style={[styles.bigCardLabel, { color: c.mutedForeground }]}>Montant approuvé total</Text>
              <Text style={[styles.bigCardValue, { color: c.success }]}>{fmtUsdt(w?.totalApprovedAmount ?? 0)}</Text>
            </View>
            <View style={[styles.statIcon, { backgroundColor: "#F0FDF4" }]}>
              <Feather name="dollar-sign" size={20} color={c.success} />
            </View>
          </View>
        </View>
        <View style={[styles.bigCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.bigCardRow}>
            <View>
              <Text style={[styles.bigCardLabel, { color: c.mutedForeground }]}>Total bonus distribués</Text>
              <Text style={[styles.bigCardValue, { color: "#7C3AED" }]}>{fmtUsdt(b?.total ?? 0)}</Text>
            </View>
            <View style={[styles.statIcon, { backgroundColor: "#F5F3FF" }]}>
              <Feather name="gift" size={20} color="#7C3AED" />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8 },
  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  grid1: { gap: 10 },
  statCard: {
    width: "47%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statTitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bigCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bigCardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bigCardLabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  bigCardValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  errorText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
});
