
import api from "./api";

const projectService = {
  // Get all projects accessible to the logged-in user.
  async getAll(params = {}) {
    const response = await api.get("/projects", { params });
    return response.data;
  },

  // Get one project by ID.
  async getById(projectId) {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  // Create a new project.
  async create(projectData) {
    const response = await api.post("/projects", projectData);
    return response.data;
  },

  // Update project details.
  async update(projectId, projectData) {
    const response = await api.put(
      `/projects/${projectId}`,
      projectData
    );
    return response.data;
  },

  // Delete a project.
  async remove(projectId) {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },

  // Get tasks belonging to a project.
  async getTasks(projectId, params = {}) {
    const response = await api.get(
      `/projects/${projectId}/tasks`,
      { params }
    );
    return response.data;
  },

  // Get project members.
  async getMembers(projectId) {
    const response = await api.get(
      `/projects/${projectId}/members`
    );
    return response.data;
  },

  // Add a member to a project.
  async addMember(projectId, memberData) {
    const response = await api.post(
      `/projects/${projectId}/members`,
      memberData
    );
    return response.data;
  },

  // Remove a member from a project.
  async removeMember(projectId, userId) {
    const response = await api.delete(
      `/projects/${projectId}/members/${userId}`
    );
    return response.data;
  },
};

export default projectService;
