/// <reference types="@cloudflare/workers-types" />

export interface Env {
  RELAY_AUTH_STORE: KVNamespace;
  RELAY_HUB: DurableObjectNamespace;
}

export class RelayHub {
  state: DurableObjectState;
  env: Env;
  clientSessions: Set<WebSocket>;
  hostSession: WebSocket | null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.clientSessions = new Set();
    this.hostSession = null;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const role = url.searchParams.get("role");

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    // @ts-ignore - Cloudflare Workers feature
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
    // @ts-ignore
    ws.accept();
    
    if (this.hostSession) {
      try {
        this.hostSession.close(1000, "New host connected");
      } catch (err) {}
    }
    
    this.hostSession = ws;

    ws.addEventListener("message", (msg) => {
      for (const client of this.clientSessions) {
        try {
          client.send(msg.data);
        } catch (err) {}
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
    // @ts-ignore
    ws.accept();
    this.clientSessions.add(ws);

    ws.addEventListener("message", (msg) => {
      if (this.hostSession) {
        try {
          this.hostSession.send(msg.data);
        } catch (err) {}
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
