import json
import logging
from typing import Dict, List, Any
from fastapi import WebSocket

logger = logging.getLogger("websocket.manager")

class ConnectionManager:
    def __init__(self):
        # Maps user ID to a list of active websocket connections
        # Use "broadcast" as key for public broadcast connections if necessary
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user {user_id}. Total connections for user: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if len(self.active_connections[user_id]) == 0:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error sending WebSocket message to user {user_id}: {e}")

    async def broadcast(self, message: str):
        """Send a message to all connected clients."""
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting WebSocket message to user {user_id}: {e}")

    async def emit_blockchain_event(self, event_type: str, data: Dict[str, Any], user_id: str = None):
        """
        Emits a structured blockchain event.
        If user_id is provided, sends only to that user. Otherwise broadcasts.
        """
        payload = json.dumps({
            "type": "BLOCKCHAIN_EVENT",
            "event": event_type,
            "data": data
        })
        
        if user_id:
            await self.send_personal_message(payload, user_id)
        else:
            await self.broadcast(payload)

manager = ConnectionManager()
