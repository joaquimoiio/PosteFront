import { apiRequest } from './client';

export const estoqueApi = {
  listar:          () => apiRequest('/estoque'),
  listarComQtd:    () => apiRequest('/estoque/com-quantidade'),
  consolidado:     () => apiRequest('/estoque/consolidado'),

  adicionar: (data) => apiRequest('/estoque/adicionar', { method: 'POST', body: JSON.stringify(data) }),
  remover:   (data) => apiRequest('/estoque/remover',   { method: 'POST', body: JSON.stringify(data) }),
};
