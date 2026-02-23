"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/http';
import { useToast } from '../ui/Toast';

interface WebSocketContextType {
    subscribe: (groupId: string, callback: (message: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const sockets = useRef<Map<string, WebSocket>>(new Map());
    const subscribers = useRef<Map<string, Set<(message: any) => void>>>(new Map());

    const subscribe = useCallback((groupId: string, callback: (message: any) => void) => {
        if (!subscribers.current.has(groupId)) {
            subscribers.current.set(groupId, new Set());
        }
        subscribers.current.get(groupId)!.add(callback);

        if (!sockets.current.has(groupId)) {
            const token = localStorage.getItem('token');
            if (!token) return () => { };

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Extract domain and port from API_BASE_URL. 
            // We assume the WS endpoint is at the root /ws/ regardless of API prefix.
            const url = new URL(API_BASE_URL);
            const wsUrl = `${protocol}//${url.host}/ws/${groupId}?token=${token}`;

            const socket = new WebSocket(wsUrl);

            socket.onmessage = (event) => {
                const message = JSON.parse(event.data);

                // Show toast for certain events
                if (message.type === 'NEW_BILL') {
                    toast(`${message.created_by_name} added a new bill: ${message.description}`, 'success');
                } else if (message.type === 'UPDATE_BILL') {
                    toast(`Bill updated: ${message.description}`, 'info');
                }

                // Notify all subscribers for this group
                subscribers.current.get(groupId)?.forEach((cb) => cb(message));
            };

            socket.onclose = () => {
                console.log(`WS Connection closed for group ${groupId}`);
                sockets.current.delete(groupId);
                // We could implement auto-reconnect here if needed
            };

            socket.onerror = (err) => {
                // WebSocket errors are often generic. Only log if the socket isn't purposefully closing.
                if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
                    console.warn(`WebSocket transient error for group ${groupId}. This is normal during hot-reloads or network switches.`);
                }
            };

            sockets.current.set(groupId, socket);
        }

        return () => {
            const groupSubscribers = subscribers.current.get(groupId);
            if (groupSubscribers) {
                groupSubscribers.delete(callback);
                if (groupSubscribers.size === 0) {
                    sockets.current.get(groupId)?.close();
                    sockets.current.delete(groupId);
                    subscribers.current.delete(groupId);
                }
            }
        };
    }, [toast]);

    return (
        <WebSocketContext.Provider value={{ subscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
}
