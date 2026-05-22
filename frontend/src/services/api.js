const API_BASE = "/api";

async function fetchJSON(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  health: () => fetchJSON("/health"),
  search: (payload) =>
    fetchJSON("/search/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  filterPapers: (payload) =>
    fetchJSON("/filter/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSubjects: () => fetchJSON("/search/subjects"),
  generateBriefing: (paper_ids, format = "docx", title, sort_by, sort_order) =>
    fetchJSON("/briefings/", {
      method: "POST",
      body: JSON.stringify({ paper_ids, format, title, sort_by, sort_order }),
    }),
  listBriefings: () => fetchJSON("/briefings/"),
  downloadBriefing: (id) => `${API_BASE}/briefings/${id}/download`,
  deleteBriefing: (id) =>
    fetchJSON(`/briefings/${id}`, { method: "DELETE" }),
  listPapers: () => fetchJSON("/history/papers"),
  getSettings: () => fetchJSON("/settings/"),
  updateSettings: (data) =>
    fetchJSON("/settings/", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  listKeywords: () => fetchJSON("/settings/keywords"),
  addKeyword: (data) =>
    fetchJSON("/settings/keywords", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteKeyword: (id) =>
    fetchJSON(`/settings/keywords/${id}`, { method: "DELETE" }),
};
