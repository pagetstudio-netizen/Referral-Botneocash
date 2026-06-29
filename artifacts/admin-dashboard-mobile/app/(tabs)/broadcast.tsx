import { Feather } from "@expo/vector-icons";
import { useSendBroadcast } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import colors from "@/constants/colors";

const c = colors.light;

export default function BroadcastScreen() {
  const [message, setMessage] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [lastResult, setLastResult] = useState<string | null>(null);

  const { mutate: send, isPending } = useSendBroadcast({
    mutation: {
      onSuccess: (data: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLastResult(data?.message ?? "Broadcast envoyé avec succès");
        setMessage("");
        setButtonLabel("");
        setButtonUrl("");
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Erreur", err?.response?.data?.error ?? "Erreur lors de l'envoi");
      },
    },
  });

  function handleSend() {
    if (!message.trim()) {
      Alert.alert("Message requis", "Veuillez saisir un message avant d'envoyer");
      return;
    }
    Alert.alert(
      "Envoyer le broadcast",
      "Vous allez envoyer ce message à tous les utilisateurs. Confirmer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Envoyer",
          onPress: () => send({
            data: {
              message: message.trim(),
              buttonLabel: buttonLabel.trim() || undefined,
              buttonUrl: buttonUrl.trim() || undefined,
            },
          }),
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Platform.OS === "web" ? 67 + 16 : 16, paddingBottom: Platform.OS === "web" ? 34 + 80 : 100 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Success banner */}
        {lastResult && (
          <View style={[styles.successBanner, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <Feather name="check-circle" size={16} color={c.success} />
            <Text style={[styles.successText, { color: c.success }]}>{lastResult}</Text>
          </View>
        )}

        {/* Message */}
        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>MESSAGE</Text>
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <TextInput
            style={[styles.messageInput, { color: c.text }]}
            placeholder="Rédigez votre message ici..."
            placeholderTextColor={c.mutedForeground}
            value={message}
            onChangeText={(v) => { setMessage(v); setLastResult(null); }}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <View style={[styles.charRow, { borderTopColor: c.border }]}>
            <Text style={[styles.charCount, { color: c.mutedForeground }]}>
              {message.length} caractères
            </Text>
          </View>
        </View>

        {/* Optional button */}
        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>BOUTON (optionnel)</Text>
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Libellé du bouton</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
              placeholder="Ex: Rejoindre le canal"
              placeholderTextColor={c.mutedForeground}
              value={buttonLabel}
              onChangeText={setButtonLabel}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>URL du bouton</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
              placeholder="https://t.me/..."
              placeholderTextColor={c.mutedForeground}
              value={buttonUrl}
              onChangeText={setButtonUrl}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
          <Feather name="info" size={14} color={c.primary} />
          <Text style={[styles.infoText, { color: c.primary }]}>
            Le message sera envoyé à tous les utilisateurs enregistrés dans la base de données.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: c.primary, opacity: pressed || isPending || !message.trim() ? 0.7 : 1 },
          ]}
          onPress={handleSend}
          disabled={isPending || !message.trim()}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="send" size={16} color="#fff" />
              <Text style={styles.sendBtnText}>Envoyer le broadcast</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 8 },
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
  messageInput: {
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 140,
  },
  charRow: { borderTopWidth: 1, padding: 10, alignItems: "flex-end" },
  charCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
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
  divider: { height: 1, marginHorizontal: 16 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 12,
    marginTop: 8,
  },
  sendBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  successText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
});
