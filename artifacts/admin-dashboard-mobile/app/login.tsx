import { Feather } from "@expo/vector-icons";
import { useAdminLogin } from "@workspace/api-client-react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { mutate: doLogin, isPending } = useAdminLogin({
    mutation: {
      onSuccess: async (data: any) => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await login(data.token);
        router.replace("/(tabs)");
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err?.response?.data?.error ?? "Identifiants incorrects");
      },
    },
  });

  function handleLogin() {
    setError("");
    if (!email.trim() || !password) {
      setError("Email et mot de passe requis");
      return;
    }
    doLogin({ data: { email: email.trim(), password } });
  }

  const c = colors.light;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
            paddingBottom: insets.bottom + 32,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: c.primary }]}>
            <Feather name="moon" size={32} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: c.text }]}>Moon Crypto</Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            Panneau d'administration
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Connexion</Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={14} color={c.destructive} />
              <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Email</Text>
            <View style={[styles.inputRow, { borderColor: c.border, backgroundColor: c.background }]}>
              <Feather name="mail" size={16} color={c.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder="admin@example.com"
                placeholderTextColor={c.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                testID="email-input"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Mot de passe</Text>
            <View style={[styles.inputRow, { borderColor: c.border, backgroundColor: c.background }]}>
              <Feather name="lock" size={16} color={c.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder="••••••••"
                placeholderTextColor={c.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                testID="password-input"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={c.mutedForeground} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleLogin}
            disabled={isPending}
            testID="login-btn"
          >
            {isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="log-in" size={16} color="#fff" />
                <Text style={styles.loginBtnText}>Se connecter</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, flexGrow: 1, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  appName: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 4 },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
    marginTop: 4,
  },
  loginBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
