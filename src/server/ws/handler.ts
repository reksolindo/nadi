import { WebSocket } from 'ws';
import { WebSocketMessage } from '../types.js';

// ==========================================
// Fastify WebSocket Handler & Registry
// ==========================================

export class WebSocketHandler {
  private static clients: Set<WebSocket> = new Set();
  private static latestMessage: WebSocketMessage | null = null;

  /**
   * Register a new client socket
   */
  static registerClient(socket: WebSocket): void {
    this.clients.add(socket);
    // console.log(`[WS] Client connected. Total active clients: ${this.clients.size}`);

    // If we have a cached snapshot, send it immediately
    if (this.latestMessage && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(this.latestMessage));
      } catch (err) {
        // Socket might have closed
      }
    }

    socket.on('close', () => {
      this.clients.delete(socket);
      // console.log(`[WS] Client disconnected. Total active clients: ${this.clients.size}`);
    });

    socket.on('error', (err: Error) => {
      console.error(`[WS] Client socket error:`, err);
      this.clients.delete(socket);
    });
  }

  /**
   * Broadcast message to all active WebSocket clients
   */
  static broadcast(message: WebSocketMessage): void {
    this.latestMessage = message;
    const payload = JSON.stringify(message);

    for (const socket of this.clients) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(payload);
        } catch (err) {
          this.clients.delete(socket);
        }
      } else if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
        this.clients.delete(socket);
      }
    }
  }

  /**
   * Total active connection count
   */
  static getClientCount(): number {
    return this.clients.size;
  }
}
