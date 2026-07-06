import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API, headers: { "Content-Type": "application/json" } });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("pinkas_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function crud(path) {
  return {
    list: async () => (await http.get(`/${path}`)).data,
    get: async (id) => (await http.get(`/${path}/${id}`)).data,
    create: async (data) => (await http.post(`/${path}`, data)).data,
    update: async (id, data) => (await http.patch(`/${path}/${id}`, data)).data,
    remove: async (id) => (await http.delete(`/${path}/${id}`)).data,
  };
}

export const api = {
  customers: crud("customers"),
  products: crud("products"),
  sales: crud("sales"),
  payments: crud("payments"),
  extras: crud("extra_charges"),
  snapshot: async () => (await http.get("/snapshot")).data,
  seed: async () => (await http.post("/seed")).data,
  wipe: async () => (await http.post("/wipe")).data,
};

export default api;
