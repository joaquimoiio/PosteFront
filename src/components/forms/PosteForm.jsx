import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../common/Button';

export default function PosteForm({ onSubmit, onCancel, initialData = null, loading = false }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData || { codigo: '', descricao: '', preco: '', ativo: true },
  });

  useEffect(() => {
    if (initialData) reset(initialData);
  }, [initialData]);

  function onValid(data) {
    onSubmit({ ...data, preco: parseFloat(data.preco) });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Código *</label>
          <input
            type="text"
            className="input"
            placeholder="ex: 4199, 4199-B"
            {...register('codigo', {
              required: 'Código obrigatório',
              maxLength: { value: 50, message: 'Máximo 50 caracteres' },
            })}
          />
          {errors.codigo && <p className="text-xs text-red-500 mt-1">{errors.codigo.message}</p>}
        </div>
        <div>
          <label className="label">Preço (R$) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="input"
            {...register('preco', {
              required: 'Preço obrigatório',
              min: { value: 0.01, message: 'Deve ser maior que 0' },
            })}
          />
          {errors.preco && <p className="text-xs text-red-500 mt-1">{errors.preco.message}</p>}
        </div>
      </div>

      <div>
        <label className="label">Descrição *</label>
        <input
          type="text"
          className="input"
          {...register('descricao', {
            required: 'Descrição obrigatória',
            maxLength: { value: 500, message: 'Máximo 500 caracteres' },
          })}
        />
        {errors.descricao && <p className="text-xs text-red-500 mt-1">{errors.descricao.message}</p>}
      </div>

      {initialData && (
        <div className="flex items-center gap-2">
          <input type="checkbox" id="ativo" {...register('ativo')} className="w-4 h-4 rounded" />
          <label htmlFor="ativo" className="text-sm text-gray-700 dark:text-gray-200">Ativo</label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>
          {initialData ? 'Salvar alterações' : 'Cadastrar poste'}
        </Button>
      </div>
    </form>
  );
}
