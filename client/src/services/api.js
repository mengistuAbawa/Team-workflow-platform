import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("teamflow_token") ||
      localStorage.getItem("teamflow_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized, clean up token to prevent endless looping
      const hadToken = sessionStorage.getItem("teamflow_token");
      if (hadToken && !window.location.pathname.includes("/login")) {
        sessionStorage.removeItem("teamflow_token");
        delete api.defaults.headers.common.Authorization;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
