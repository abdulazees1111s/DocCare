const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function assetUrl(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export { API_URL };
