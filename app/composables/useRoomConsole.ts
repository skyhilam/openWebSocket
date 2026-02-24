import { ref, onBeforeUnmount } from 'vue';

export interface ConsoleMessage {
  id: number;
  time: string;
  clientId: string;
  direction: 'in' | 'out' | 'system';
  content: string;
}

/**
 * 管理單一房間的 Host WebSocket 連線。
 * 負責：連線/斷線、解析 JSON Envelope、維護線上 Client 清單與訊息紀錄。
 */
export function useRoomConsole() {
  const ws = ref<WebSocket | null>(null);
  const connected = ref(false);
  const connecting = ref(false);
  const messages = ref<ConsoleMessage[]>([]);
  const onlineClients = ref<string[]>([]);

  let msgSeq = 0;
  const MAX_MESSAGES = 200;

  function pushMessage(
    direction: ConsoleMessage['direction'],
    clientId: string,
    content: string,
  ) {
    messages.value.push({
      id: ++msgSeq,
      time: new Date().toLocaleTimeString('zh-HK', { hour12: false }),
      clientId,
      direction,
      content,
    });
    // 超過上限時裁剪舊訊息
    if (messages.value.length > MAX_MESSAGES) {
      messages.value = messages.value.slice(-MAX_MESSAGES);
    }
  }

  function connect(userId: string, token: string) {
    if (ws.value) return;
    connecting.value = true;

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${location.host}/connect/${userId}?role=host&token=${token}`;

    const socket = new WebSocket(url);
    ws.value = socket;

    socket.addEventListener('open', () => {
      connected.value = true;
      connecting.value = false;
      pushMessage('system', '', '已連線（Host 角色）');
    });

    socket.addEventListener('message', (event) => {
      const raw = typeof event.data === 'string' ? event.data : '';
      handleIncoming(raw);
    });

    socket.addEventListener('close', (event) => {
      connected.value = false;
      connecting.value = false;
      ws.value = null;
      onlineClients.value = [];
      pushMessage(
        'system',
        '',
        `連線關閉 (code=${event.code})`,
      );
    });

    socket.addEventListener('error', () => {
      connected.value = false;
      connecting.value = false;
      ws.value = null;
      pushMessage('system', '', '連線發生錯誤');
    });
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close(1000, 'Admin disconnect');
      ws.value = null;
    }
    connected.value = false;
    onlineClients.value = [];
  }

  function handleIncoming(raw: string) {
    let parsed: {
      type?: string;
      clientId?: string;
      data?: string;
      messages?: Array<{
        ts: string;
        clientId: string;
        direction: 'in' | 'out' | 'system';
        content: string;
      }>;
    } | null = null;

    try {
      parsed = JSON.parse(raw);
    } catch {
      // 非 JSON，當作純文字
      pushMessage('in', '?', raw);
      return;
    }

    if (!parsed) return;

    switch (parsed.type) {
      case 'history': {
        // 批次載入歷史訊息
        if (Array.isArray(parsed.messages)) {
          for (const m of parsed.messages) {
            const time = new Date(m.ts)
              .toLocaleTimeString('zh-HK', { hour12: false });
            messages.value.push({
              id: ++msgSeq,
              time,
              clientId: m.clientId,
              direction: m.direction,
              content: m.content,
            });
          }
          // 裁剪
          if (messages.value.length > MAX_MESSAGES) {
            messages.value = messages.value.slice(-MAX_MESSAGES);
          }
        }
        break;
      }
      case 'client_message':
        pushMessage('in', parsed.clientId ?? '?', parsed.data ?? '');
        break;
      case 'client_join': {
        const cid = parsed.clientId ?? '?';
        if (!onlineClients.value.includes(cid)) {
          onlineClients.value = [...onlineClients.value, cid];
        }
        pushMessage('system', cid, '上線');
        break;
      }
      case 'client_leave': {
        const cid = parsed.clientId ?? '?';
        onlineClients.value = onlineClients.value.filter((id) => id !== cid);
        pushMessage('system', cid, '離線');
        break;
      }
      default:
        pushMessage('in', '?', raw);
    }
  }

  /**
   * 傳送訊息：
   *  - 有 targetClientId → 定向發送 (JSON envelope)
   *  - 無 targetClientId → 廣播 (純文字)
   */
  function sendMessage(content: string, targetClientId?: string) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return;

    if (targetClientId) {
      ws.value.send(JSON.stringify({
        type: 'send_to_client',
        clientId: targetClientId,
        data: content,
      }));
      pushMessage('out', targetClientId, content);
    } else {
      ws.value.send(content);
      pushMessage('out', '全部', content);
    }
  }

  function clearMessages() {
    messages.value = [];
  }

  onBeforeUnmount(() => {
    disconnect();
  });

  return {
    connected,
    connecting,
    messages,
    onlineClients,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
  };
}
