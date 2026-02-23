export default defineEventHandler(async (event) => {
  // Access KV from nitro context
  const env = event.context.cloudflare.env;
  
  if (!env || !env.RELAY_AUTH_STORE) {
    throw createError({ statusCode: 500, statusMessage: "KV Store not available" });
  }

  const newUserId = crypto.randomUUID();
  const newToken = crypto.randomUUID().replace(/-/g, '');

  const record = {
    token: newToken,
    createdAt: new Date().toISOString()
  };

  await env.RELAY_AUTH_STORE.put(`user:${newUserId}`, JSON.stringify(record));

  const host = getRequestHeader(event, 'host');
  // Usually the proxy adds x-forwarded-proto, else we assume wss in production
  const protocol = process.dev ? 'ws' : 'wss'; 

  return {
    userId: newUserId,
    token: newToken,
    hostUrl: `${protocol}://${host}/connect/${newUserId}?role=host&token=${newToken}`,
    clientUrl: `${protocol}://${host}/connect/${newUserId}?role=client&token=${newToken}`
  };
});
