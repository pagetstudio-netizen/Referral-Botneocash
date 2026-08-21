import { Feather } from "@expo/vector-icons";
import { useApproveWithdrawal, useListWithdrawals, useRejectWithdrawal } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import colors from "@/constants/colors";

const c = colors.light;

type Status = "pending" | "approved" | "rejected";

function fmt(n: number) {
  return (n ?? 0).toLocaleString("fr-FR");
}

function StatusTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.tab, active && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, { color: active ? c.primary : c.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

function WithdrawalCard({ item, onApprove, onReject }: { item: any; onApprove: (id: number) => void; onReject: (id: number) => void }) {
  const isPending = item.status === "pending";
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {item.firstName} {item.beneficiaryName ? `· ${item.beneficiaryName}` : ""}
          </Text>
          {item.username ? (
            <Text style={[styles.sub, { color: c.mutedForeground }]}>@{item.username}</Text>
          ) : null}
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.infoRow}>
        <InfoItem icon="flag" label={`${item.countryName} · ${item.operator}`} />
        <InfoItem icon="phone" label={item.phone} />
      </View>
      <View style={styles.amountRow}>
        <Text style={[styles.amount, { color: c.text }]}>{fmt(item.amount)} USDT</Text>
        <Text style={[styles.date, { color: c.mutedForeground }]}>
          {new Date(item.createdAt).toLocaleDateString("fr-FR")}
        </Text>
      </View>

      {isPending && (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.approveBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => onApprove(item.id)}
          >
            <Feather name="check" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Valider</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.rejectBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => onReject(item.id)}
          >
            <Feather name="x" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Refuser</Text>
          </Pressable>
        </View>
      )}
      {item.adminNote ? (
        <Text style={[styles.note, { color: c.mutedForeground }]}>Note: {item.adminNote}</Text>
      ) : null}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "#FFFBEB", color: c.warning, label: "En attente" },
    approved: { bg: "#F0FDF4", color: c.success, label: "Validé" },
    rejected: { bg: "#FEF2F2", color: c.destructive, label: "Refusé" },
  };
  const s = map[status] ?? map.pending;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function InfoItem({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.infoItem}>
      <Feather name={icon as any} size={12} color={c.mutedForeground} />
      <Text style={[styles.infoText, { color: c.mutedForeground }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function WithdrawalsScreen() {
  const [status, setStatus] = useState<Status>("pending");
  const [page, setPage] = useState(1);
  const [noteInput, setNoteInput] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useListWithdrawals(
    { status, page, limit: 20 },
    // @ts-ignore queryKey is managed by the generated hook
    { query: { refetchOnWindowFocus: false } }
  );

  const { mutate: approve } = useApproveWithdrawal({
    mutation: {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); refetch(); },
    },
  });

  const { mutate: reject } = useRejectWithdrawal({
    mutation: {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); refetch(); },
    },
  });

  function handleApprove(id: number) {
    Alert.alert("Valider le retrait", "Confirmer la validation de ce retrait ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Valider", onPress: () => approve({ id: String(id), data: {} }) },
    ]);
  }

  function handleReject(id: number) {
    Alert.alert("Refuser le retrait", "Confirmer le refus de ce retrait ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Refuser", style: "destructive", onPress: () => reject({ id: String(id), data: {} }) },
    ]);
  }

  const withdrawals = data?.withdrawals ?? [];

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: c.card, borderBottomColor: c.border, paddingTop: Platform.OS === "web" ? 67 : 0 }]}>
        <StatusTab label="En attente" active={status === "pending"} onPress={() => { setStatus("pending"); setPage(1); }} />
        <StatusTab label="Validés" active={status === "approved"} onPress={() => { setStatus("approved"); setPage(1); }} />
        <StatusTab label="Refusés" active={status === "rejected"} onPress={() => { setStatus("rejected"); setPage(1); }} />
      </View>

      <FlatList
        data={withdrawals}
        keyExtractor={(w) => String(w.id)}
        renderItem={({ item }) => (
          <WithdrawalCard item={item} onApprove={handleApprove} onReject={handleReject} />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 34 + 80 : 80 },
        ]}
        scrollEnabled={!!withdrawals.length}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={c.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={c.primary} />
            </View>
          ) : (
            <View style={styles.center}>
              <Feather name="inbox" size={40} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>Aucun retrait</Text>
            </View>
          )
        }
        ListFooterComponent={
          data && data.total > page * 20 ? (
            <Pressable style={[styles.loadMore, { borderColor: c.border }]} onPress={() => setPage(page + 1)}>
              <Text style={[styles.loadMoreText, { color: c.primary }]}>Charger plus</Text>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 14 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  infoRow: { gap: 4 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10 },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#16A34A",
    paddingVertical: 10,
    borderRadius: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  note: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  loadMore: { margin: 16, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  loadMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
