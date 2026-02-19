import { useState, useEffect, useCallback } from 'react';
import { vendasApi } from '../api/vendas';

export function useVendas(params = {}) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await vendasApi.listar(params);
      const sorted = Array.isArray(result)
        ? result.sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda))
        : [];
      setData(sorted);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [params.dataInicio, params.dataFim]);

  useEffect(() => { fetch(); }, [fetch]);

  const criar = useCallback(async (dto) => {
    const result = await vendasApi.criar(dto);
    await fetch();
    return result;
  }, [fetch]);

  const atualizar = useCallback(async (id, dto) => {
    const result = await vendasApi.atualizar(id, dto);
    await fetch();
    return result;
  }, [fetch]);

  const deletar = useCallback(async (id) => {
    await vendasApi.deletar(id);
    await fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch, criar, atualizar, deletar };
}

export function useResumoVendas(params = {}) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await vendasApi.resumo(params);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [params.dataInicio, params.dataFim]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
