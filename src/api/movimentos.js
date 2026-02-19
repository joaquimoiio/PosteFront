import { apiRequest } from './client';

export const movimentosApi = {
  listar: (params = {}) => {
    const query = new URLSearchParams();
    if (params.dataInicio)    query.set('dataInicio',    params.dataInicio);
    if (params.dataFim)       query.set('dataFim',       params.dataFim);
    if (params.posteId)       query.set('posteId',       params.posteId);
    if (params.tipoMovimento) query.set('tipoMovimento', params.tipoMovimento);
    return apiRequest(`/movimento-estoque${query.toString() ? '?' + query : ''}`);
  },

  listarPorPoste: (posteId) => apiRequest(`/movimento-estoque/poste/${posteId}`),

  consolidado: (params = {}) => {
    const query = new URLSearchParams();
    if (params.dataInicio) query.set('dataInicio', params.dataInicio);
    if (params.dataFim)    query.set('dataFim',    params.dataFim);
    if (params.limite)     query.set('limite',     params.limite);
    return apiRequest(`/movimento-estoque/consolidado${query.toString() ? '?' + query : ''}`);
  },

  estatisticas: (params = {}) => {
    const query = new URLSearchParams();
    if (params.dataInicio) query.set('dataInicio', params.dataInicio);
    if (params.dataFim)    query.set('dataFim',    params.dataFim);
    return apiRequest(`/movimento-estoque/estatisticas${query.toString() ? '?' + query : ''}`);
  },

  registrarManual: (data) => apiRequest('/movimento-estoque/manual', {
    method: 'POST', body: JSON.stringify(data),
  }),
};
