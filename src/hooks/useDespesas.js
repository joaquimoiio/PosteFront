import { useState, useEffect, useCallback } from 'react';
import { despesasApi } from '../api/despesas';

export function useDespesas(params = {}) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await despesasApi.listar(params);
      setData(Array.isArray(result) ? result : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [params.dataInicio, params.dataFim]);

  useEffect(() => { fetch(); }, [fetch]);

  const criar = useCallback(async (dto) => {
    const result = await despesasApi.criar(dto);
    await fetch();
    return result;
  }, [fetch]);

  const atualizar = useCallback(async (id, dto) => {
    const result = await despesasApi.atualizar(id, dto);
    await fetch();
    return result;
  }, [fetch]);

  const deletar = useCallback(async (id) => {
    await despesasApi.deletar(id);
    await fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch, criar, atualizar, deletar };
}
