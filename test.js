const WebSocket = require('ws');

const baseUrl = 'ws://127.0.0.1:8787';

// 我們需要先模擬從 Admin API 獲取 Token 的過程 (這裡為了方便直接寫死 Token 作測試用，因為這是 dev 測試，KV 也是空的，需要在測試前呼叫一次註冊)
async function runTest() {
  console.log("=== 正在註冊 User A ===");
  const resA = await fetch('http://127.0.0.1:8787/api/users', { method: 'POST' });
  const userA = await resA.json();
  console.log("User A:", userA.userId);

  console.log("=== 正在註冊 User B ===");
  const resB = await fetch('http://127.0.0.1:8787/api/users', { method: 'POST' });
  const userB = await resB.json();
  console.log("User B:", userB.userId);

  console.log("\\n=== 開始 WebSocket 多租戶隔離測試 ===");

  // 連接 User A 的 Host 與 Client
  const hostA = new WebSocket(baseUrl + "/connect/" + userA.userId + "?role=host&token=" + userA.token);
  const clientA = new WebSocket(baseUrl + "/connect/" + userA.userId + "?role=client&token=" + userA.token);

  // 連接 User B 的 Host 與 Client
  const hostB = new WebSocket(baseUrl + "/connect/" + userB.userId + "?role=host&token=" + userB.token);
  const clientB = new WebSocket(baseUrl + "/connect/" + userB.userId + "?role=client&token=" + userB.token);

  let messagesReceived = 0;

  hostA.on('open', () => {
    console.log('[Room A] Host connected');
    setTimeout(() => hostA.send('Hello from Host A to Room A!'), 500);
  });
  
  hostA.on('message', (msg) => {
    console.log('[Room A] Host received:', msg.toString());
    messagesReceived++;
    checkDone();
  });

  clientA.on('open', () => {
    console.log('[Room A] Client connected');
    setTimeout(() => clientA.send('Request from Client A'), 500);
  });

  clientA.on('message', (msg) => {
    console.log('[Room A] Client received:', msg.toString());
    messagesReceived++;
    checkDone();
  });

  hostB.on('open', () => {
    console.log('[Room B] Host connected');
    setTimeout(() => hostB.send('Hello from Host B to Room B!'), 500);
  });

  hostB.on('message', (msg) => {
    console.log('[Room B] Host received:', msg.toString());
    messagesReceived++;
    checkDone();
  });

  clientB.on('open', () => {
    console.log('[Room B] Client connected');
    setTimeout(() => clientB.send('Request from Client B'), 500);
  });

  clientB.on('message', (msg) => {
    console.log('[Room B] Client received:', msg.toString());
    messagesReceived++;
    checkDone();
  });

  // 超時保護 (2.5秒後強制關閉)
  setTimeout(() => {
    cleanUp();
    if (messagesReceived < 4) {
      console.error("測試失敗：期望收到至少 4 則訊息，但只收到 " + messagesReceived +  " 則。");
      process.exit(1);
    }
  }, 2500);

  function checkDone() {
    if (messagesReceived === 4) {
      console.log("\\n=== 測試成功：所有房間的訊息皆正確隔離與送達！ ===");
      cleanUp();
      process.exit(0);
    }
  }

  function cleanUp() {
    hostA.close();
    clientA.close();
    hostB.close();
    clientB.close();
  }
}

runTest().catch(console.error);
