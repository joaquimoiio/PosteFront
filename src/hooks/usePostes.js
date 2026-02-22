import { useState, useEffect, useCallback } from 'react';
import { postesApi } from '../api/postes';

export function usePostes() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await postesApi.listar();
      setData(Array.isArray(result) ? result : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Após criar/atualizar/deletar: executa a ação e dispara o refetch em background.
  // O modal fecha imediatamente após a ação principal, sem aguardar o recarregamento da lista.
  const criar = useCallback(async (dto) => {
    const result = await postesApi.criar(dto);
    fetch(); // background — não bloqueia
    return result;
  }, [fetch]);

  const atualizar = useCallback(async (id, dto) => {
    const result = await postesApi.atualizar(id, dto);
    fetch(); // background — não bloqueia
    return result;
  }, [fetch]);

  const deletar = useCallback(async (id) => {
    await postesApi.deletar(id);
    fetch(); // background — não bloqueia
  }, [fetch]);

  return { data, loading, error, refetch: fetch, criar, atualizar, deletar };
}
