
import api from "./api";

const taskService = {
  // Get tasks available to the logged-in user.
  async getAll(params = {}) {
    const response = await api.get("/tasks", { params });
    return response.data;
  },

  // Get a single task by ID.
  async getById(taskId) {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  // Create a task.
  async create(taskData) {
    const response = await api.post("/tasks", taskData);
    return response.data;
  },

  // Update task details.
  async update(taskId, taskData) {
    const response = await api.put(
      `/tasks/${taskId}`,
      taskData
    );
    return response.data;
  },

  // Change task status.
  async updateStatus(taskId, status) {
    const response = await api.patch(
      `/tasks/${taskId}/status`,
      { status }
    );
    return response.data;
  },

  // Assign or reassign a task.
  async assign(taskId, assigneeId) {
    const response = await api.patch(
      `/tasks/${taskId}/assign`,
      { assignee_id: assigneeId }
    );
    return response.data;
  },

  // Delete a task.
  async remove(taskId) {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },

  // Get comments for a task.
  async getComments(taskId) {
    const response = await api.get(
      `/tasks/${taskId}/comments`
    );
    return response.data;
  },

  // Add a comment to a task.
  async addComment(taskId, content) {
    const response = await api.post(
      `/tasks/${taskId}/comments`,
      { content }
    );
    return response.data;
  },

  // Delete a comment.
  async deleteComment(taskId, commentId) {
    const response = await api.delete(
      `/tasks/${taskId}/comments/${commentId}`
    );
    return response.data;
  },
};

export default taskService;
