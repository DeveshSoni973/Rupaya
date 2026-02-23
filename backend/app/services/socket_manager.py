from typing import Dict, List
from fastapi import WebSocket
from uuid import UUID
import json

class ConnectionManager:
    def __init__(self):
        # group_id -> list of active websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, group_id: str):
        await websocket.accept()
        if group_id not in self.active_connections:
            self.active_connections[group_id] = []
        self.active_connections[group_id].append(websocket)

    def disconnect(self, websocket: WebSocket, group_id: str):
        if group_id in self.active_connections:
            self.active_connections[group_id].remove(websocket)
            if not self.active_connections[group_id]:
                del self.active_connections[group_id]

    async def broadcast_to_group(self, group_id: str, message: dict):
        if group_id in self.active_connections:
            # Create a list of dead connections to remove
            dead_connections = []
            for connection in self.active_connections[group_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.append(connection)
            
            # Cleanup dead connections
            for dead in dead_connections:
                self.active_connections[group_id].remove(dead)
            
            if not self.active_connections[group_id]:
                del self.active_connections[group_id]

socket_manager = ConnectionManager()
