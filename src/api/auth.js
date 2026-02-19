import { API_BASE } from '../utils/constants';

export async function loginApi(tenantId, senha) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, senha }),
  });

  if (response.status === 401) throw new Error('Senha incorreta');
  if (!response.ok) throw new Error('Erro ao conectar com o servidor');

  return response.json(); // { tenantId, displayName }
}
