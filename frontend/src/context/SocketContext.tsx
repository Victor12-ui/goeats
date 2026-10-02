import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.restaurantId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = "http://localhost:5000";
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    const joinRestaurantRoom = () => {
      if (user?.restaurantId) {
        newSocket.emit("join-restaurant", user.restaurantId.toString());
        console.log(`[Socket] Joined restaurant room: restaurant-${user.restaurantId}`);
      }
    };

    newSocket.on("connect", () => {
      console.log("[Socket] Connected to server:", newSocket.id);
      setIsConnected(true);
      joinRestaurantRoom();
    });

    if (newSocket.connected) {
      setIsConnected(true);
      joinRestaurantRoom();
    }

    newSocket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected from server:", reason);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.restaurantId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
