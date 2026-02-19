import { useForm } from 'react-hook-form';
import { getCurrentDateInput } from '../../utils/formatters';
import Button from '../common/Button';

export default function EstoqueForm({ onSubmit, onCancel, postes = [], mode = 'adicionar', loading = false }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      posteId:      '',
      quantidade:   '',
      dataEstoque:  getCurrentDateInput(),
      observacao:   '',
    },
  });

  function onValid(data) {
    onSubmit({ ...data, quantidade: parseInt(data.quantidade), posteId: parseInt(data.posteId) });
  }

  const postesAtivos = postes.filter(p => p.ativo !== false);
  const isAdd = mode === 'adicionar';

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <div>
        <label className="label">Poste *</label>
        <select className="input" {...register('posteId', { required: 'Poste obrigatório' })}>
          <option value="">Selecione...</option>
          {postesAtivos.map(p => (
            <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>
          ))}
        </select>
        {errors.posteId && <p className="text-xs text-red-500 mt-1">{errors.posteId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Quantidade *</label>
          <input
            type="number"
            min="1"
            className="input"
            {...register('quantidade', { required: 'Quantidade obrigatória', min: { value: 1, message: 'Mínimo 1' } })}
          />
          {errors.quantidade && <p className="text-xs text-red-500 mt-1">{errors.quantidade.message}</p>}
        </div>
        <div>
          <label className="label">Data *</label>
          <input
            type="date"
            className="input"
            {...register('dataEstoque', { required: 'Data obrigatória' })}
          />
          {errors.dataEstoque && <p className="text-xs text-red-500 mt-1">{errors.dataEstoque.message}</p>}
        </div>
      </div>

      <div>
        <label className="label">Observação</label>
        <input type="text" className="input" {...register('observacao')} placeholder="ex: Compra, Devolução..." />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant={isAdd ? 'success' : 'danger'} loading={loading}>
          {isAdd ? 'Adicionar ao estoque' : 'Remover do estoque'}
        </Button>
      </div>
    </form>
  );
}
