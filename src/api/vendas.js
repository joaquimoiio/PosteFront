import { apiRequest } from './client';

export const vendasApi = {
  listar: (params = {}) => {
    const query = new URLSearchParams();
    if (params.dataInicio) query.set('dataInicio', params.dataInicio);
    if (params.dataFim)    query.set('dataFim',    params.dataFim);
    return apiRequest(`/vendas${query.toString() ? '?' + query : ''}`);
  },

  buscar: (id) => apiRequest(`/vendas/${id}`),

  resumo: (params = {}) => {
    const query = new URLSearchParams();
    if (params.dataInicio) query.set('dataInicio', params.dataInicio);
    if (params.dataFim)    query.set('dataFim',    params.dataFim);
    return apiRequest(`/vendas/resumo${query.toString() ? '?' + query : ''}`);
  },

  criar: (data) => apiRequest('/vendas', { method: 'POST', body: JSON.stringify(data) }),

  atualizar: (id, data) => apiRequest(`/vendas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deletar: (id) => apiRequest(`/vendas/${id}`, { method: 'DELETE' }),
};
