import React, { createContext, useContext, useState, useEffect } from "react";

export type Role = "SUPER_ADMIN" | "RESTAURANT_OWNER" | "CAJERO" | "PRODUCCION" | "MOZO" | "CUSTOMER" | "MOTORIZADO";

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  restaurantId: number | null;
  restaurantName?: string | null;
  isPlus?: boolean;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("goeats_token"));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("goeats_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("goeats_user");
      }
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("goeats_token", newToken);
    localStorage.setItem("goeats_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("goeats_token");
    localStorage.removeItem("goeats_user");
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
