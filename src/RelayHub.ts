import { DurableObject } from "cloudflare:workers";

export interface Env {
  RELAY_HUB: DurableObjectNamespace;
  RELAY_AUTH_STORE: KVNamespace;
}

export class RelayHub extends DurableObject<Env> {
  private hostSession: WebSocket | null = null;
  private clientSessions: Set<WebSocket> = new Set();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const role = url.searchParams.get("role"); // 'host' or 'client'

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const { 0: clientToken, 1: serverToken } = new WebSocketPair();

    if (role === "host") {
      this.handleHostConnection(serverToken);
    } else if (role === "client") {
      this.handleClientConnection(serverToken);
    } else {
      return new Response("Invalid role query parameter. Must be 'host' or 'client'.", { status: 400 });
    }

    return new Response(null, {
      status: 101,
      webSocket: clientToken,
    });
  }

  private handleHostConnection(ws: WebSocket) {
    ws.accept();
    
    // 清除舊的連線，確保單點更新。
    if (this.hostSession) {
      try {
        this.hostSession.close(1000, "New host connected");
      } catch (err) {
        // 忽略可能已關閉的錯誤
      }
    }
    
    this.hostSession = ws;

    ws.addEventListener("message", (msg) => {
      // 收到 host 來的訊息，廣播給所有 clients
      for (const client of this.clientSessions) {
        try {
          client.send(msg.data);
        } catch (err) {
          // 網路等問題，依賴接下來的 close / error 清除
        }
      }
    });

    ws.addEventListener("close", () => {
      if (this.hostSession === ws) {
        this.hostSession = null;
      }
    });

    ws.addEventListener("error", () => {
      if (this.hostSession === ws) {
        this.hostSession = null;
      }
    });
  }

  private handleClientConnection(ws: WebSocket) {
    ws.accept();
    this.clientSessions.add(ws);

    ws.addEventListener("message", (msg) => {
      // 收到 client 來的訊息，轉發給 host
      if (this.hostSession) {
        try {
          this.hostSession.send(msg.data);
        } catch (err) {
          // 忽略
        }
      }
    });

    ws.addEventListener("close", () => {
      this.clientSessions.delete(ws);
    });

    ws.addEventListener("error", () => {
      this.clientSessions.delete(ws);
    });
  }
}
