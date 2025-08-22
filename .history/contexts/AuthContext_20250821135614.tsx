import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthService } from "./AuthService";
import http from "./httpService";

interface User {
  id: number;
  fullname: string;
  username: string;
  email: string;
  role: string;
  profilePhoto?: string | null;
  managerId?: number | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Restore session on app start
  useEffect(() => {
    const initAuth = async () => {
      const { accessToken } = await AuthService.getTokens();
      if (accessToken) {
        try {
          const { data } = await http.get("/users/me"); // ✅ your backend must expose /me
          setUser(data);
        } catch (err) {
          await AuthService.removeUser();
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // 🔹 Login
  const login = async (email: string, password: string) => {
    const { data } = await http.post("/users/login", { email, password });

    // Store tokens securely
    await AuthService.storeTokens(data.token, data.refresh_token);

    // Update user state
    setUser(data.user);
  };

  // 🔹 Logout
  const logout = async () => {
    await AuthService.removeUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
