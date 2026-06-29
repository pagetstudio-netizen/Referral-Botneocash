import { Feather } from "@expo/vector-icons";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import colors from "@/constants/colors";

const c = colors.light;

function FieldRow({ label, value, onChange, keyboardType = "default", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboardType?: any; placeholder?: string;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={c.mutedForeground}
      />
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={[styles.fieldLabel, { color: c.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: c.border, true: c.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { data, isLoading, error, refetch } = useGetSettings();
  const { mutate: save, isPending } = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Succès", "Paramètres sauvegardés");
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Erreur", err?.response?.data?.error ?? "Erreur lors de la sauvegarde");
      },
    },
  });

  const [form, setForm] = useState({
    referralBonus: "",
    dailyBonus: "",
    minWithdraw: "",
    requiredChannel: "",
    requiredGroup: "",
    supportLink: "",
    supportMessage: "",
    maintenanceMode: false,
    botName: "",
    withdrawalChannel: "",
    adminGroupId: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        referralBonus: String(data.referralBonus ?? ""),
        dailyBonus: String(data.dailyBonus ?? ""),
        minWithdraw: String(data.minWithdraw ?? ""),
        requiredChannel: data.requiredChannel ?? "",
        requiredGroup: data.requiredGroup ?? "",
        supportLink: data.supportLink ?? "",
        supportMessage: data.supportMessage ?? "",
        maintenanceMode: data.maintenanceMode ?? false,
        botName: data.botName ?? "",
        withdrawalChannel: data.withdrawalChannel ?? "",
        adminGroupId: data.adminGroupId ?? "",
      });
    }
  }, [data]);

  function set(key: string) {
    return (v: string | boolean) => setForm((f) => ({ ...f, [key]: v }));
  }

  function handleSave() {
    save({
      data: {
        referralBonus: Number(form.referralBonus) || 0,
        dailyBonus: Number(form.dailyBonus) || 0,
        minWithdraw: Number(form.minWithdraw) || 0,
        requiredChannel: form.requiredChannel,
        requiredGroup: form.requiredGroup,
        supportLink: form.supportLink,
        supportMessage: form.supportMessage,
        maintenanceMode: form.maintenanceMode,
        botName: form.botName,
        withdrawalChannel: form.withdrawalChannel,
        adminGroupId: form.adminGroupId,
      },
    });
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Feather name="alert-circle" size={32} color={c.destructive} />
        <Text style={[styles.errorText, { color: c.destructive }]}>Erreur de chargement</Text>
        <Pressable style={[styles.retryBtn, { backgroundColor: c.primary }]} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

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
      {/* Bot Info */}
      <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>INFORMATIONS DU BOT</Text>
      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <FieldRow label="Nom du bot" value={form.botName} onChange={set("botName")} placeholder="Moon Crypto Bot" />
      </View>

      {/* Bonuses */}
      <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>BONUS</Text>
      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <FieldRow label="Bonus parrainage (USDT)" value={form.referralBonus} onChange={set("referralBonus")} keyboardType="numeric" />
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <FieldRow label="Bonus quotidien (USDT)" value={form.dailyBonus} onChange={set("dailyBonus")} keyboardType="numeric" />
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <FieldRow label="Retrait minimum (USDT)" value={form.minWithdraw} onChange={set("minWithdraw")} keyboardType="numeric" />
      </View>

      {/* Channels */}
      <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>CANAUX TELEGRAM</Text>
      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <FieldRow label="Canal requis" value={form.requiredChannel} onChange={set("requiredChannel")} placeholder="@channel" />
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <FieldRow label="Groupe requis" value={form.requiredGroup} onChange={set("requiredGroup")} placeholder="@group" />
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <FieldRow label="Canal retraits" value={form.withdrawalChannel} onChange={set("withdrawalChannel")} placeholder="@withdrawals" />
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <FieldRow label="ID groupe admin" value={form.adminGroupId} onChange={set("adminGroupId")} placeholder="-100..." />
      </View>

      {/* Support */}
      <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>SUPPORT</Text>
      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <FieldRow label="Lien support" value={form.supportLink} onChange={set("supportLink")} placeholder="https://t.me/..." />
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <FieldRow label="Message support" value={form.supportMessage} onChange={set("supportMessage")} />
      </View>

      {/* Mode maintenance */}
      <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>SYSTÈME</Text>
      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <ToggleRow label="Mode maintenance" value={form.maintenanceMode} onChange={set("maintenanceMode") as any} />
      </View>

      <Pressable
        style={({ pressed }) => [styles.saveBtn, { backgroundColor: c.primary, opacity: pressed || isPending ? 0.85 : 1 }]}
        onPress={handleSave}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Feather name="save" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>Sauvegarder</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  fieldRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fieldInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: { height: 1, marginHorizontal: 16 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
    marginTop: 12,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
});
