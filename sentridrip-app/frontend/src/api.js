import axios from "axios";
const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + "/api"
  : "/api";
const api = axios.create({ baseURL: BASE_URL });

export const priceApi = {
  getSol: () => api.get("/price/sol"),
  getHistory: (limit = 60) => api.get("/price/history?limit=" + limit),
};

export const strategiesApi = {
  list: () => api.get("/strategies"),
  get: (id) => api.get("/strategies/" + id),
  create: (data) => api.post("/strategies", data),
  pause: (id) => api.patch("/strategies/" + id + "/pause"),
  resume: (id) => api.patch("/strategies/" + id + "/resume"),
  delete: (id) => api.delete("/strategies/" + id),
  policyStatus: (id) => api.get("/strategies/" + id + "/policy-status"),
};

export const walletApi = {
  list: () => api.get("/wallet/list"),
  create: (name, passphrase) => api.post("/wallet/create", { name, passphrase }),
  portfolio: (wallet) => api.get("/wallet/portfolio/" + wallet),
  positions: (wallet) => api.get("/wallet/positions/" + wallet),
  info: (wallet) => api.get("/wallet/info/" + wallet),
  send: (data) => api.post("/wallet/send", data),
};
