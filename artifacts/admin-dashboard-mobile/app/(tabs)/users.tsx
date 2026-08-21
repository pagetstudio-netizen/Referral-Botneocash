import { Feather } from "@expo/vector-icons";
import { useListUsers } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import colors from "@/constants/colors";

const c = colors.light;

function fmt(n: number) {
  return (n ?? 0).toLocaleString("fr-FR");
}

type BanFilter = "" | "false" | "true";

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.chip, active && { backgroundColor: c.primary, borderColor: c.primary }]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, { color: active ? "#fff" : c.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

function UserCard({ user }: { user: any }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.85 : 1 }]}
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/user/${user.telegramId}`);
      }}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.firstName?.[0] ?? "?").toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.userName, { color: c.text }]} numberOfLines={1}>
            {user.firstName} {user.lastName ?? ""}
          </Text>
          {user.username ? (
            <Text style={[styles.userSub, { color: c.mutedForeground }]} numberOfLines={1}>
              @{user.username}
            </Text>
          ) : (
            <Text style={[styles.userSub, { color: c.mutedForeground }]}>ID: {user.telegramId}</Text>
          )}
        </View>
        {user.banned ? (
          <View style={[styles.badge, { backgroundColor: "#FEF2F2" }]}>
            <Text style={[styles.badgeText, { color: c.destructive }]}>Banni</Text>
          </View>
        ) : null}
        <Feather name="chevron-right" size={16} color={c.mutedForeground} />
      </View>
      <View style={[styles.cardDivider, { backgroundColor: c.border }]} />
      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Feather name="dollar-sign" size={12} color={c.success} />
          <Text style={[styles.statVal, { color: c.text }]}>{fmt(user.balance)} USDT</Text>
        </View>
        <View style={styles.stat}>
          <Feather name="users" size={12} color={c.primary} />
          <Text style={[styles.statVal, { color: c.text }]}>{fmt(user.referralCount)} refs</Text>
        </View>
        <View style={styles.stat}>
          <Feather name="download" size={12} color={c.warning} />
          <Text style={[styles.statVal, { color: c.text }]}>{fmt(user.totalWithdrawn)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function UsersScreen() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BanFilter>("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isFetching, refetch } = useListUsers(
    { search: query || undefined, page, limit, banned: filter || undefined },
    // @ts-ignore queryKey is managed by the generated hook
    { query: { refetchOnWindowFocus: false } }
  );

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  function doSearch() {
    setQuery(search);
    setPage(1);
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: c.card, borderBottomColor: c.border, paddingTop: Platform.OS === "web" ? 67 : 0 }]}>
        <View style={[styles.searchRow, { backgroundColor: c.background, borderColor: c.border }]}>
          <Feather name="search" size={16} color={c.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="ID, username ou prénom..."
            placeholderTextColor={c.mutedForeground}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={doSearch}
            returnKeyType="search"
          />
          {search ? (
            <Pressable onPress={() => { setSearch(""); setQuery(""); setPage(1); }}>
              <Feather name="x" size={16} color={c.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.filters}>
          <FilterChip label="Tous" active={filter === ""} onPress={() => { setFilter(""); setPage(1); }} />
          <FilterChip label="Actifs" active={filter === "false"} onPress={() => { setFilter("false"); setPage(1); }} />
          <FilterChip label="Bannis" active={filter === "true"} onPress={() => { setFilter("true"); setPage(1); }} />
          {total > 0 && (
            <Text style={[styles.totalText, { color: c.mutedForeground }]}>
              {fmt(total)} résultats
            </Text>
          )}
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => String(u.telegramId)}
        renderItem={({ item }) => <UserCard user={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 34 + 80 : 80 },
        ]}
        scrollEnabled={!!users.length}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={c.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={c.primary} />
            </View>
          ) : (
            <View style={styles.center}>
              <Feather name="users" size={40} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>Aucun utilisateur trouvé</Text>
            </View>
          )
        }
        ListFooterComponent={
          total > page * limit ? (
            <Pressable
              style={[styles.loadMore, { borderColor: c.border }]}
              onPress={() => setPage(page + 1)}
            >
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
  searchBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginTop: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  filters: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  totalText: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#2563EB" },
  cardInfo: { flex: 1 },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  userSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardDivider: { height: 1, marginVertical: 10 },
  cardStats: { flexDirection: "row", gap: 16 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statVal: { fontSize: 12, fontFamily: "Inter_500Medium" },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  loadMore: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  loadMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
