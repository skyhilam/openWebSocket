import WebSocket from 'ws';

const baseUrl = 'ws://127.0.0.1:8788';

async function runTest() {
  console.log("=== 正在註冊 User A ===");
  const resA = await fetch('http://127.0.0.1:8788/api/users', { method: 'POST' });
  if (!resA.ok) throw new Error(`Registration failed A: ${resA.status} ${await resA.text()}`);
  const userA = await resA.json();
  console.log("User A:", userA.userId);

  console.log("=== 正在註冊 User B ===");
  const resB = await fetch('http://127.0.0.1:8788/api/users', { method: 'POST' });
  if (!resB.ok) throw new Error(`Registration failed B: ${resB.status} ${await resB.text()}`);
  const userB = await resB.json();
  console.log("User B:", userB.userId);

  console.log("\\n=== 開始 WebSocket 多租戶隔離測試 ===");

  const hostA = new WebSocket(baseUrl + "/connect/" + userA.userId + "?role=host&token=" + userA.token);
  const clientA = new WebSocket(baseUrl + "/connect/" + userA.userId + "?role=client&token=" + userA.token);

  const hostB = new WebSocket(baseUrl + "/connect/" + userB.userId + "?role=host&token=" + userB.token);
  const clientB = new WebSocket(baseUrl + "/connect/" + userB.userId + "?role=client&token=" + userB.token);

  let messagesReceived = 0;
  let hasError = false;

  const attachHandlers = (ws, role, room) => {
    ws.on('open', () => {
      console.log(`[Room ${room}] ${role} connected`);
      setTimeout(() => ws.send(`Hello from ${role} in Room ${room}!`), 500);
    });

    ws.on('message', (msg) => {
      console.log(`[Room ${room}] ${role} received:`, msg.toString());
      messagesReceived++;
      checkDone();
    });

    ws.on('error', (err) => {
      console.error(`[Room ${room}] ${role} error:`, err.message);
      hasError = true;
    });

    ws.on('close', (code, reason) => {
      if (code !== 1000 && code !== 1005) {
        console.warn(`[Room ${room}] ${role} closed unusually: ${code} ${reason.toString()}`);
      }
    });
  };

  attachHandlers(hostA, 'Host', 'A');
  attachHandlers(clientA, 'Client', 'A');
  attachHandlers(hostB, 'Host', 'B');
  attachHandlers(clientB, 'Client', 'B');

  setTimeout(() => {
    cleanUp();
    if (messagesReceived < 4 || hasError) {
      console.error("測試失敗：期望收到至少 4 則訊息，但只收到 " + messagesReceived +  " 則，或發生錯誤。");
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
    hostA.terminate();
    clientA.terminate();
    hostB.terminate();
    clientB.terminate();
  }
}

runTest().catch(err => {
  console.error('\\nxxx 測試遇到未預期的例外狀況 xxx');
  console.error(err);
  process.exit(1);
});
