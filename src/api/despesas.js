import { apiRequest } from './client';

export const despesasApi = {
  listar: (params = {}) => {
    const query = new URLSearchParams();
    if (params.dataInicio) query.set('dataInicio', params.dataInicio);
    if (params.dataFim)    query.set('dataFim',    params.dataFim);
    return apiRequest(`/despesas${query.toString() ? '?' + query : ''}`);
  },
  criar:     (data) => apiRequest('/despesas', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id, data) => apiRequest(`/despesas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletar:   (id) => apiRequest(`/despesas/${id}`, { method: 'DELETE' }),
};
