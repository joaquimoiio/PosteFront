import { METODOS_PAGAMENTO, TIPOS_VENDA, TIPOS_DESPESA, TIPOS_MOVIMENTO } from './constants';

export function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export function formatDate(dateString, includeTime = false) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
    return date.toLocaleString('pt-BR', options);
  } catch { return '-'; }
}

export function formatDateInput(dateString) {
  if (!dateString) return '';
  try {
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
    return new Date(dateString).toISOString().split('T')[0];
  } catch { return ''; }
}

export function formatDateTimeInput(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  } catch { return ''; }
}

export function getCurrentDateInput() {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentDateTimeInput() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function getMetodoPagamentoLabel(value) {
  if (!value) return 'Não informado';
  const found = METODOS_PAGAMENTO.find(m => m.value === value);
  return found ? found.label : value;
}

export function getTipoVendaLabel(value) {
  const found = TIPOS_VENDA.find(t => t.value === value);
  return found ? found.label : value;
}

export function getTipoDespesaLabel(value) {
  const found = TIPOS_DESPESA.find(t => t.value === value);
  return found ? found.label : value;
}

export function getTipoMovimentoLabel(value) {
  const found = TIPOS_MOVIMENTO.find(t => t.value === value);
  return found ? found.label : value;
}
