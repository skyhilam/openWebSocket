import { ref } from "vue";
import { useToast } from "#imports";

export interface UserRow {
  id: string;
  token: string;
  createdAt: string;
}

export interface InstanceResult {
  userId: string;
  token: string;
  hostUrl: string;
  clientUrl: string;
}

export function useAdminUsers() {
  const loading = ref(false);
  const result = ref<InstanceResult | null>(null);
  const errorMsg = ref("");
  const toast = useToast();

  const loadingUsers = ref(false);
  const deletingId = ref<string | null>(null);
  const usersData = ref<{ totalActive: number; users: UserRow[] } | null>(null);

  const columns = [
    { accessorKey: "id", header: "房間 ID", id: "id" },
    { accessorKey: "token", header: "存取金鑰", id: "token" },
    { accessorKey: "createdAt", header: "建立時間", id: "createdAt" },
    { id: "actions", header: "操作" },
  ];

  async function generateUser() {
    loading.value = true;
    errorMsg.value = "";
    result.value = null;

    try {
      const res = await fetch("/api/users", { method: "POST" });
      if (!res.ok) {
        const details = await res.text();
        errorMsg.value = `狀態碼 (${res.status}): ${details}`;
        return;
      }
      result.value = await res.json();
      toast.add({
        title: "配置成功",
        description: "實體資源已建立並同步至 Cloudflare KV。",
        color: "success",
        icon: "i-lucide-check-circle",
      });
      fetchUsers();
    } catch (err: any) {
      errorMsg.value =
        err.message || "無法連接伺服器，請確認 Wrangler 環境狀態。";
    } finally {
      loading.value = false;
    }
  }

  async function fetchUsers() {
    loadingUsers.value = true;
    try {
      const res = await fetch(`/api/users?t=${Date.now()}`);
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || contentType.includes("text/html")) {
        console.warn("未授權或遇到 Cloudflare Access 攔截，準備重啟頁面驗證...");
        window.location.reload();
        return;
      }
      usersData.value = await res.json();
    } catch (e) {
      console.error("Failed to fetch users", e);
    } finally {
      loadingUsers.value = false;
    }
  }

  async function deleteUser(id: string) {
    if (!confirm(`確定要刪除房間 ${id} 嗎？這將導致使用該金鑰的連線立即失效。`))
      return;

    deletingId.value = id;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());

      toast.add({
        title: "刪除成功",
        description: `房間 ${id} 已被移除。`,
        color: "success",
        icon: "i-lucide-trash-2",
      });

      if (result.value?.userId === id) {
        result.value = null;
      }

      if (usersData.value) {
        usersData.value.users = usersData.value.users.filter((u) => u.id !== id);
        usersData.value.totalActive = usersData.value.users.length;
      }

      await fetchUsers();
    } catch (e: any) {
      toast.add({
        title: "刪除失敗",
        description: e.message,
        color: "error",
        icon: "i-lucide-alert-circle",
      });
    } finally {
      deletingId.value = null;
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.add({
        title: "已複製",
        icon: "i-lucide-clipboard-check",
        color: "success",
      });
    } catch (e) {
      toast.add({
        title: "複製失敗",
        color: "error",
        icon: "i-lucide-alert-circle",
      });
    }
  }

  return {
    loading,
    result,
    errorMsg,
    loadingUsers,
    deletingId,
    usersData,
    columns,
    generateUser,
    fetchUsers,
    deleteUser,
    copyText,
  };
}
