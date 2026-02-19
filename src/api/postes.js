import { apiRequest } from './client';

export const postesApi = {
  listar: () => apiRequest('/postes'),
  buscar: (id) => apiRequest(`/postes/${id}`),
  criar:  (data) => apiRequest('/postes', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id, data) => apiRequest(`/postes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletar: (id) => apiRequest(`/postes/${id}`, { method: 'DELETE' }),
};
