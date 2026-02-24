/// <reference types="@cloudflare/workers-types" />

export interface Env {
  RELAY_AUTH_STORE: KVNamespace;
  RELAY_HUB: DurableObjectNamespace;
}

interface StoredMessage {
  ts: string;
  clientId: string;
  direction: 'in' | 'out' | 'system';
  content: string;
}

const MAX_HISTORY = 200;
const STORAGE_KEY = 'messageLog';
const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * JSON Envelope 協議：
 *
 * Host 收到：
 *   { type: 'history',        messages: StoredMessage[] }   ← 連線時回放
 *   { type: 'client_message', clientId: string, data: string }
 *   { type: 'client_join',    clientId: string }
 *   { type: 'client_leave',   clientId: string }
 *
 * Host 發送：
 *   { type: 'send_to_client', clientId: string, data: string } → 定向
 *   純文字 → 廣播給所有 Client
 */
export class RelayHub {
  state: DurableObjectState;
  env: Env;
  clientSessions: Map<string, WebSocket>;
  hostSession: WebSocket | null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.clientSessions = new Map();
    this.hostSession = null;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const role = url.searchParams.get('role');

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    // @ts-ignore - Cloudflare Workers feature
    const { 0: clientToken, 1: serverToken } = new WebSocketPair();

    if (role === 'host') {
      // 同步建立連線，異步回放歷史（不阻塞 101 Response）
      this.setupHostConnection(serverToken);
    } else if (role === 'client') {
      const clientId = url.searchParams.get('clientId')
        || crypto.randomUUID().substring(0, 8);
      this.handleClientConnection(serverToken, clientId);
    } else {
      return new Response(
        "Invalid role query parameter. Must be 'host' or 'client'.",
        { status: 400 },
      );
    }

    return new Response(null, {
      status: 101,
      webSocket: clientToken,
    });
  }

  /**
   * 同步初始化 Host 連線，異步回放歷史。
   * 不能 await，否則會阻塞 101 Response 導致歷史訊息無法送達瀏覽器。
   */
  private setupHostConnection(ws: WebSocket) {
    // @ts-ignore
    ws.accept();

    // 踢掉舊 Host
    if (this.hostSession) {
      try {
        this.hostSession.close(1000, 'New host connected');
      } catch (err) {}
    }

    this.hostSession = ws;

    // 異步回放歷史 + 同步在線 Client 清單（fire-and-forget）
    this.replayHistoryToHost(ws);

    ws.addEventListener('message', (msg) => {
      const raw = typeof msg.data === 'string' ? msg.data : '';
      this.handleHostMessage(raw);
    });

    ws.addEventListener('close', () => {
      if (this.hostSession === ws) {
        this.hostSession = null;
      }
    });

    ws.addEventListener('error', () => {
      if (this.hostSession === ws) {
        this.hostSession = null;
      }
    });
  }

  /**
   * 異步回放歷史訊息和線上 Client 清單。
   */
  private async replayHistoryToHost(ws: WebSocket) {
    try {
      const history = await this.loadHistory();
      if (history.length > 0) {
        ws.send(JSON.stringify({ type: 'history', messages: history }));
      }
    } catch (err) {}

    // 同步目前已在線的 Client 清單
    for (const cid of this.clientSessions.keys()) {
      try {
        ws.send(JSON.stringify({ type: 'client_join', clientId: cid }));
      } catch (err) {}
    }
  }

  /**
   * 解析 Host 發送的訊息：
   *  - JSON { type: 'send_to_client', clientId, data } → 定向發送
   *  - 其他純文字 → 廣播給所有 Client
   */
  private handleHostMessage(raw: string) {
    let parsed: { type?: string; clientId?: string; data?: string } | null = null;

    try {
      parsed = JSON.parse(raw);
    } catch {
      // 非 JSON，視為廣播
    }

    if (parsed?.type === 'send_to_client' && parsed.clientId) {
      // 定向發送 + 記錄
      const target = this.clientSessions.get(parsed.clientId);
      if (target) {
        try {
          target.send(parsed.data ?? '');
        } catch (err) {}
      }
      this.appendHistory({
        ts: new Date().toISOString(),
        clientId: parsed.clientId,
        direction: 'out',
        content: parsed.data ?? '',
      });
    } else {
      // 廣播給所有 Client + 記錄
      for (const client of this.clientSessions.values()) {
        try {
          client.send(raw);
        } catch (err) {}
      }
      this.appendHistory({
        ts: new Date().toISOString(),
        clientId: '全部',
        direction: 'out',
        content: raw,
      });
    }
  }

  private handleClientConnection(ws: WebSocket, clientId: string) {
    // @ts-ignore
    ws.accept();
    this.clientSessions.set(clientId, ws);

    // 通知 Host + 記錄
    this.sendToHost(JSON.stringify({ type: 'client_join', clientId }));
    this.appendHistory({
      ts: new Date().toISOString(),
      clientId,
      direction: 'system',
      content: '上線',
    });

    ws.addEventListener('message', (msg) => {
      const data = typeof msg.data === 'string' ? msg.data : '';
      // 轉發給 Host + 記錄
      this.sendToHost(JSON.stringify({
        type: 'client_message',
        clientId,
        data,
      }));
      this.appendHistory({
        ts: new Date().toISOString(),
        clientId,
        direction: 'in',
        content: data,
      });
    });

    ws.addEventListener('close', () => {
      this.clientSessions.delete(clientId);
      this.sendToHost(JSON.stringify({ type: 'client_leave', clientId }));
      this.appendHistory({
        ts: new Date().toISOString(),
        clientId,
        direction: 'system',
        content: '離線',
      });
    });

    ws.addEventListener('error', () => {
      this.clientSessions.delete(clientId);
      this.sendToHost(JSON.stringify({ type: 'client_leave', clientId }));
      this.appendHistory({
        ts: new Date().toISOString(),
        clientId,
        direction: 'system',
        content: '連線錯誤',
      });
    });
  }

  private sendToHost(message: string) {
    if (this.hostSession) {
      try {
        this.hostSession.send(message);
      } catch (err) {}
    }
  }

  // ── 持久化層（24 小時 TTL）──

  private async loadHistory(): Promise<StoredMessage[]> {
    const data = await this.state.storage.get<StoredMessage[]>(STORAGE_KEY);
    if (!data) return [];
    const cutoff = Date.now() - TTL_MS;
    return data.filter((m) => new Date(m.ts).getTime() > cutoff);
  }

  private async appendHistory(msg: StoredMessage) {
    const cutoff = Date.now() - TTL_MS;
    const history = await this.loadHistory();
    history.push(msg);
    // 同時清理過期 + 超量紀錄
    const trimmed = history
      .filter((m) => new Date(m.ts).getTime() > cutoff)
      .slice(-MAX_HISTORY);
    await this.state.storage.put(STORAGE_KEY, trimmed);
  }
}
