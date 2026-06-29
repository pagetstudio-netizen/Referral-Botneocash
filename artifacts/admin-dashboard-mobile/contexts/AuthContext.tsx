import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "moon_crypto_token";

interface AuthContextValue {
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then((t) => setToken(t))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (newToken: string) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
