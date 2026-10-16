
import api from "./api";

const authService = {
  async register(payload) {
    const response = await api.post("/auth/register", payload);
    return response.data.data;
  },

  async login(payload) {
    const response = await api.post("/auth/login", payload);
    return response.data.data;
  },

  async getMe(token) {
    const response = await api.get("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data.data.user;
  }
};

export default authService;
