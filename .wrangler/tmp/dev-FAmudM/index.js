var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-suimlj/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-suimlj/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/RelayHub.ts
import { DurableObject } from "cloudflare:workers";
var RelayHub = class extends DurableObject {
  hostSession = null;
  clientSessions = /* @__PURE__ */ new Set();
  constructor(ctx, env) {
    super(ctx, env);
  }
  async fetch(request) {
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
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
      webSocket: clientToken
    });
  }
  handleHostConnection(ws) {
    ws.accept();
    if (this.hostSession) {
      try {
        this.hostSession.close(1e3, "New host connected");
      } catch (err) {
      }
    }
    this.hostSession = ws;
    ws.addEventListener("message", (msg) => {
      for (const client of this.clientSessions) {
        try {
          client.send(msg.data);
        } catch (err) {
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
  handleClientConnection(ws) {
    ws.accept();
    this.clientSessions.add(ws);
    ws.addEventListener("message", (msg) => {
      if (this.hostSession) {
        try {
          this.hostSession.send(msg.data);
        } catch (err) {
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
};
__name(RelayHub, "RelayHub");

// src/index.ts
var adminHtml = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebSocket Relay \u7BA1\u7406\u5F8C\u53F0</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #f3f4f6; padding: 2rem; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { font-size: 1.5rem; color: #111827; margin-bottom: 1.5rem; }
        .btn { background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 1rem; }
        .btn:hover { background: #2563eb; }
        pre { background: #1f2937; color: #10b981; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.875rem; }
        .status { margin-top: 1rem; color: #4b5563; }
        .tips { margin-top: 2rem; font-size: 0.875rem; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>WebSocket Relay \u4F7F\u7528\u8005\u7BA1\u7406</h1>
        <p>\u9EDE\u64CA\u4E0B\u65B9\u6309\u9215\u8A3B\u518A\u4E00\u500B\u65B0\u7684\u4F7F\u7528\u8005 (\u6703\u81EA\u52D5\u7522\u751F User ID \u8207\u5B89\u5168\u7684\u9023\u7DDA Token)</p>
        <button class="btn" onclick="createUser()">\u5EFA\u7ACB\u65B0\u4F7F\u7528\u8005</button>
        
        <div class="status" id="status"></div>
        <div id="result" style="display:none; margin-top: 1rem;">
            <p><strong>\u9023\u7DDA\u8CC7\u8A0A\uFF1A\u8ACB\u59A5\u5584\u4FDD\u5B58\uFF01</strong></p>
            <pre id="output"></pre>
        </div>

        <div class="tips">
            <p><strong>Note:</strong> \u76EE\u524D\u6B64\u4ECB\u9762\u7121\u9632\u8B77\uFF0C\u8ACB\u52D9\u5FC5\u5728 Cloudflare \u5100\u8868\u677F\u4F7F\u7528 <strong>Zero Trust (Access)</strong> \u5C07\u6B64\u7DB2\u57DF\u4FDD\u8B77\u8D77\u4F86\uFF0C\u9650\u5236\u50C5\u6709\u60A8\u7684 Email \u624D\u80FD\u5B58\u53D6\u3002</p>
        </div>
    </div>

    <script>
        async function createUser() {
            const btn = document.querySelector('.btn');
            const status = document.getElementById('status');
            const result = document.getElementById('result');
            const output = document.getElementById('output');
            
            btn.disabled = true;
            status.textContent = "\u5EFA\u7ACB\u4E2D...";
            result.style.display = "none";

            try {
                const res = await fetch('/api/users', { method: 'POST' });
                if (!res.ok) throw new Error("\u4F3A\u670D\u5668\u932F\u8AA4: " + res.status);
                const data = await res.json();
                
                output.textContent = JSON.stringify(data, null, 2);
                result.style.display = "block";
                status.textContent = "\u2705 \u6210\u529F\u5EFA\u7ACB\uFF01";
            } catch (err) {
                status.textContent = "\u274C \u5EFA\u7ACB\u5931\u6557: " + err.message;
            } finally {
                btn.disabled = false;
            }
        }
    <\/script>
</body>
</html>
`;
function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
__name(generateToken, "generateToken");
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    if (parts.length === 3 && parts[1] === "connect" && parts[2]) {
      const userId = parts[2];
      const token = url.searchParams.get("token") || request.headers.get("Authorization")?.replace("Bearer ", "");
      if (!token) {
        return new Response("Missing token", { status: 401 });
      }
      const userRecordStr = await env.RELAY_AUTH_STORE.get("user:" + userId);
      if (!userRecordStr) {
        return new Response("User not found", { status: 404 });
      }
      const userRecord = JSON.parse(userRecordStr);
      if (userRecord.token !== token) {
        return new Response("Invalid token", { status: 403 });
      }
      const id = env.RELAY_HUB.idFromName(userId);
      const stub = env.RELAY_HUB.get(id);
      return stub.fetch(request);
    }
    if (url.pathname === "/admin") {
      return new Response(adminHtml, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (url.pathname === "/api/users" && request.method === "POST") {
      const newUserId = crypto.randomUUID();
      const newToken = generateToken();
      const record = {
        token: newToken,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await env.RELAY_AUTH_STORE.put("user:" + newUserId, JSON.stringify(record));
      return new Response(JSON.stringify({
        userId: newUserId,
        token: newToken,
        hostUrl: "wss://" + url.host + "/connect/" + newUserId + "?role=host&token=" + newToken,
        clientUrl: "wss://" + url.host + "/connect/" + newUserId + "?role=client&token=" + newToken
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/health") {
      return new Response("WebSocket Relay is OK", { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-suimlj/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-suimlj/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  RelayHub,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
