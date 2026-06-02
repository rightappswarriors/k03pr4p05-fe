


import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "./AuthContext";

const WebSocketContext = createContext<WebSocket | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const { user } = useAuth()

    useEffect(() => {
        if (!user) return;

        const wsUrl =
            Platform.OS === "web"
                ? process.env.EXPO_PUBLIC_WS_URL
                : process.env.EXPO_PUBLIC_WS_URL_ANDROID_EMULATOR || process.env.EXPO_PUBLIC_WS_URL;

        if (!wsUrl) {
            console.warn("Missing websocket URL environment variable");
            return;
        }

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            if (process.env.NODE_ENV === "development") console.log("WS connected");

            ws.send(
                JSON.stringify({
                    type: "AUTH",
                    userId: user.id,
                    role: user.role,
                }),
            );
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, [user]);

    return (
        <WebSocketContext.Provider value={socket}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    return useContext(WebSocketContext);
}
