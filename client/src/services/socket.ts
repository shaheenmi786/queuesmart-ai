import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:5000';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private statusListeners: Set<(connected: boolean) => void> = new Set();

  public connect(): void {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.notifyStatusListeners(true);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.notifyStatusListeners(false);
    });

    this.socket.on('connect_error', () => {
      this.isConnected = false;
      this.notifyStatusListeners(false);
    });

    // Universal message distributor
    const events = ['queue_updated', 'doctor_status_changed', 'notification_created', 'counter_allocated', 'triage_updated'];
    events.forEach((event) => {
      this.socket?.on(event, (data) => {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          callbacks.forEach((cb) => cb(data));
        }
      });
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.notifyStatusListeners(false);
    }
  }

  public subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public onStatusChange(callback: (connected: boolean) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.isConnected);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  public joinQueue(departmentId: number): void {
    if (this.socket?.connected) {
      this.socket.emit('join_queue', { department_id: departmentId });
    }
  }

  public leaveQueue(departmentId: number): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_queue', { department_id: departmentId });
    }
  }

  private notifyStatusListeners(status: boolean): void {
    this.statusListeners.forEach((cb) => cb(status));
  }
}

export const socketService = new SocketService();
