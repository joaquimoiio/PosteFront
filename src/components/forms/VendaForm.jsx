import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { TIPOS_VENDA, METODOS_PAGAMENTO } from '../../utils/constants';
import { getCurrentDateTimeInput, formatDateTimeInput } from '../../utils/formatters';
import Button from '../common/Button';

export default function VendaForm({ onSubmit, onCancel, postes = [], initialData = null, loading = false }) {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: initialData
      ? {
          dataVenda:       formatDateTimeInput(initialData.dataVenda),
          tipoVenda:       initialData.tipoVenda || 'V',
          posteId:         initialData.posteId || '',
          quantidade:      initialData.quantidade || '',
          valorVenda:      initialData.valorVenda || '',
          freteEletrons:   initialData.freteEletrons || '',
          valorExtra:      initialData.valorExtra || '',
          observacoes:     initialData.observacoes || '',
          metodoPagamento: initialData.metodoPagamento || '',
        }
      : {
          dataVenda:       getCurrentDateTimeInput(),
          tipoVenda:       'V',
          posteId:         '',
          quantidade:      '',
          valorVenda:      '',
          freteEletrons:   '',
          valorExtra:      '',
          observacoes:     '',
          metodoPagamento: '',
        },
  });

  const tipo = watch('tipoVenda');

  useEffect(() => {
    if (initialData) {
      reset({
        dataVenda:       formatDateTimeInput(initialData.dataVenda),
        tipoVenda:       initialData.tipoVenda || 'V',
        posteId:         initialData.posteId || '',
        quantidade:      initialData.quantidade || '',
        valorVenda:      initialData.valorVenda || '',
        freteEletrons:   initialData.freteEletrons || '',
        valorExtra:      initialData.valorExtra || '',
        observacoes:     initialData.observacoes || '',
        metodoPagamento: initialData.metodoPagamento || '',
      });
    }
  }, [initialData]);

  function onValid(data) {
    const payload = {
      dataVenda:       data.dataVenda,
      tipoVenda:       data.tipoVenda,
      observacoes:     data.observacoes || null,
      metodoPagamento: data.metodoPagamento || null,
    };
    if (tipo === 'E') {
      payload.valorExtra = parseFloat(data.valorExtra);
    } else if (tipo === 'V') {
      payload.posteId    = parseInt(data.posteId);
      payload.quantidade = parseInt(data.quantidade);
      payload.valorVenda = parseFloat(data.valorVenda);
    } else if (tipo === 'L') {
      payload.posteId      = parseInt(data.posteId);
      payload.quantidade   = parseInt(data.quantidade);
      payload.freteEletrons = parseFloat(data.freteEletrons);
    }
    onSubmit(payload);
  }

  const postesAtivos = postes.filter(p => p.ativo !== false);

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      {/* Tipo e Data */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Tipo de Venda *</label>
          <select className="input" {...register('tipoVenda', { required: true })}>
            {TIPOS_VENDA.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Data e Hora *</label>
          <input
            type="datetime-local"
            className="input"
            {...register('dataVenda', { required: 'Data obrigatória' })}
          />
          {errors.dataVenda && <p className="text-xs text-red-500 mt-1">{errors.dataVenda.message}</p>}
        </div>
      </div>

      {/* Poste + Quantidade (V e L) */}
      {(tipo === 'V' || tipo === 'L') && (
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      )}

      {/* Valor Venda (V) */}
      {tipo === 'V' && (
        <div>
          <label className="label">Valor da Venda (R$) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="input"
            {...register('valorVenda', { required: 'Valor obrigatório', min: { value: 0.01, message: 'Deve ser maior que 0' } })}
          />
          {errors.valorVenda && <p className="text-xs text-red-500 mt-1">{errors.valorVenda.message}</p>}
        </div>
      )}

      {/* Frete Eletrons (L) */}
      {tipo === 'L' && (
        <div>
          <label className="label">Frete Eletrons (R$) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            {...register('freteEletrons', { required: 'Frete obrigatório', min: { value: 0, message: 'Deve ser maior ou igual a 0' } })}
          />
          {errors.freteEletrons && <p className="text-xs text-red-500 mt-1">{errors.freteEletrons.message}</p>}
        </div>
      )}

      {/* Valor Extra (E) */}
      {tipo === 'E' && (
        <div>
          <label className="label">Valor Extra (R$) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="input"
            {...register('valorExtra', { required: 'Valor obrigatório', min: { value: 0.01, message: 'Deve ser maior que 0' } })}
          />
          {errors.valorExtra && <p className="text-xs text-red-500 mt-1">{errors.valorExtra.message}</p>}
        </div>
      )}

      {/* Método de Pagamento */}
      <div>
        <label className="label">Método de Pagamento *</label>
        <select
          className="input"
          {...register('metodoPagamento', { required: 'Método de pagamento obrigatório' })}
        >
          <option value="">Selecione...</option>
          {METODOS_PAGAMENTO.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {errors.metodoPagamento && (
          <p className="text-xs text-red-500 mt-1">{errors.metodoPagamento.message}</p>
        )}
      </div>

      {/* Observações */}
      <div>
        <label className="label">Observações</label>
        <textarea
          className="input resize-none"
          rows={2}
          {...register('observacoes')}
        />
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>
          {initialData ? 'Salvar alterações' : 'Registrar venda'}
        </Button>
      </div>
    </form>
  );
}
