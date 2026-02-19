import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { TIPOS_DESPESA } from '../../utils/constants';
import { getCurrentDateInput } from '../../utils/formatters';
import Button from '../common/Button';

export default function DespesaForm({ onSubmit, onCancel, initialData = null, loading = false }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData
      ? { ...initialData, dataDespesa: initialData.dataDespesa?.slice(0, 10) }
      : { dataDespesa: getCurrentDateInput(), descricao: '', valor: '', tipo: 'OUTRAS' },
  });

  useEffect(() => {
    if (initialData) {
      reset({ ...initialData, dataDespesa: initialData.dataDespesa?.slice(0, 10) });
    }
  }, [initialData]);

  function onValid(data) {
    onSubmit({ ...data, valor: parseFloat(data.valor) });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Tipo *</label>
          <select className="input" {...register('tipo', { required: true })}>
            {TIPOS_DESPESA.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Data *</label>
          <input
            type="date"
            className="input"
            {...register('dataDespesa', { required: 'Data obrigatória' })}
          />
          {errors.dataDespesa && <p className="text-xs text-red-500 mt-1">{errors.dataDespesa.message}</p>}
        </div>
      </div>

      <div>
        <label className="label">Descrição *</label>
        <input
          type="text"
          className="input"
          {...register('descricao', {
            required: 'Descrição obrigatória',
            minLength: { value: 3, message: 'Mínimo 3 caracteres' },
            maxLength: { value: 500, message: 'Máximo 500 caracteres' },
          })}
        />
        {errors.descricao && <p className="text-xs text-red-500 mt-1">{errors.descricao.message}</p>}
      </div>

      <div>
        <label className="label">Valor (R$) *</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          className="input"
          {...register('valor', {
            required: 'Valor obrigatório',
            min: { value: 0.01, message: 'Deve ser maior que 0' },
          })}
        />
        {errors.valor && <p className="text-xs text-red-500 mt-1">{errors.valor.message}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>
          {initialData ? 'Salvar alterações' : 'Registrar despesa'}
        </Button>
      </div>
    </form>
  );
}
