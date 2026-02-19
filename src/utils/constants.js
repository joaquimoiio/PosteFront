export const API_BASE = 'http://localhost:8080/api';

export const METODOS_PAGAMENTO = [
  { value: 'PIX_JEFF',     label: 'Pix do Jeff' },
  { value: 'PIX_ELETRONS', label: 'Pix Eletrons' },
  { value: 'DINHEIRO',     label: 'Dinheiro' },
  { value: 'CARTAO',       label: 'Cartão' },
  { value: 'CHEQUE',       label: 'Cheque' },
  { value: 'BOLETO',       label: 'Boleto' },
];

export const TIPOS_VENDA = [
  { value: 'V', label: 'Venda Normal' },
  { value: 'E', label: 'Extra' },
  { value: 'L', label: 'Venda Loja' },
];

export const TIPOS_DESPESA = [
  { value: 'FUNCIONARIO', label: 'Funcionário' },
  { value: 'OUTRAS',      label: 'Outras' },
];

export const TIPOS_MOVIMENTO = [
  { value: 'ENTRADA',      label: 'Entrada' },
  { value: 'SAIDA',        label: 'Saída' },
  { value: 'VENDA',        label: 'Venda' },
  { value: 'AJUSTE',       label: 'Ajuste' },
  { value: 'TRANSFERENCIA',label: 'Transferência' },
];

export const TENANTS = {
  VERMELHO:  'vermelho',
  BRANCO:    'branco',
  JEFFERSON: 'jefferson',
};

export const TENANT_COLORS = {
  vermelho:  { bg: 'bg-red-600',   text: 'text-red-600',   light: 'bg-red-50',  border: 'border-red-200' },
  branco:    { bg: 'bg-blue-700',  text: 'text-blue-700',  light: 'bg-blue-50', border: 'border-blue-200' },
  jefferson: { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200' },
};

export const TENANT_LABELS = {
  vermelho:  'Caminhão Vermelho',
  branco:    'Caminhão Branco',
  jefferson: 'Jefferson (Gerente)',
};

// Credenciais hardcoded (igual ao front atual)
export const CREDENTIALS = [
  { username: 'cicero',   password: 'cicero@',   tenant: 'vermelho',  display: 'Cicero' },
  { username: 'gilberto', password: 'gilberto@', tenant: 'branco',    display: 'Gilberto' },
  { username: 'jefferson',password: '12345',      tenant: 'jefferson', display: 'Jefferson' },
];
