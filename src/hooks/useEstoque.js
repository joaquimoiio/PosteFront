import { useState, useEffect, useCallback } from 'react';
import { estoqueApi } from '../api/estoque';

export function useEstoque({ consolidated = false } = {}) {
  const [data, setData]       = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = consolidated
        ? await estoqueApi.listar()
        : await estoqueApi.listar();
      setData(Array.isArray(list) ? list : []);

      if (consolidated) {
        const s = await estoqueApi.consolidado().catch(() => null);
        setStats(s);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [consolidated]);

  useEffect(() => { fetch(); }, [fetch]);

  const adicionar = useCallback(async (dto) => {
    const result = await estoqueApi.adicionar(dto);
    await fetch();
    return result;
  }, [fetch]);

  const remover = useCallback(async (dto) => {
    const result = await estoqueApi.remover(dto);
    await fetch();
    return result;
  }, [fetch]);

  return { data, stats, loading, error, refetch: fetch, adicionar, remover };
}
