// Dashboard JavaScript - VERSÃO COM FILTROS DE PERÍODO
const CONFIG = {
    API_BASE: 'http://localhost:8080/api'
};

// Estado global do dashboard
let dashboardData = {
    resumo: null,
    despesas: [],
    vendas: [],
    postes: [],
    loading: false,
    filters: {
        dataInicio: null,
        dataFim: null
    }
};

// FUNÇÃO DE FORMATAÇÃO DE DATA BRASILEIRA (SEM HORA)
function formatDateBR(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString + 'T00:00:00'); // Evitar problemas de timezone
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDate(dateString) {
    return formatDateBR(dateString);
}

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Dashboard...');
    
    // Configurar localização brasileira
    configurarLocaleBrasileiro();
    
    // Configurar filtros
    setupPeriodFilters();
    
    try {
        await loadDashboardData();
        console.log('✅ Dashboard carregado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        showAlert('Erro ao carregar dados do dashboard', 'error');
    }
});

// Configurar localização brasileira
function configurarLocaleBrasileiro() {
    document.documentElement.lang = 'pt-BR';
    
    // Configurar inputs de data
    setTimeout(() => {
        const inputs = document.querySelectorAll('input[type="date"]');
        inputs.forEach(input => {
            input.setAttribute('lang', 'pt-BR');
        });
    }, 100);
}

// Configurar filtros de período
function setupPeriodFilters() {
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    if (filtroDataInicio && filtroDataFim) {
        // Definir período padrão (último mês)
        setPresetPeriod('month');
        
        // Event listeners para mudanças manuais
        filtroDataInicio.addEventListener('change', updatePeriodIndicator);
        filtroDataFim.addEventListener('change', updatePeriodIndicator);
    }
}

// Definir períodos pré-definidos
function setPresetPeriod(period) {
    const hoje = new Date();
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    let dataInicio, dataFim;
    
    switch (period) {
        case 'today':
            dataInicio = dataFim = hoje;
            break;
            
        case 'week':
            const inicioSemana = new Date(hoje);
            inicioSemana.setDate(hoje.getDate() - hoje.getDay());
            dataInicio = inicioSemana;
            dataFim = hoje;
            break;
            
        case 'month':
            const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            dataInicio = inicioMes;
            dataFim = hoje;
            break;
            
        case 'all':
        default:
            dataInicio = null;
            dataFim = null;
            break;
    }
    
    // Atualizar inputs
    if (filtroDataInicio && filtroDataFim) {
        filtroDataInicio.value = dataInicio ? dateToInputValue(dataInicio) : '';
        filtroDataFim.value = dataFim ? dateToInputValue(dataFim) : '';
    }
    
    // Atualizar estado
    dashboardData.filters.dataInicio = dataInicio;
    dashboardData.filters.dataFim = dataFim;
    
    // Atualizar indicador
    updatePeriodIndicator();
    
    // Aplicar filtro automaticamente
    applyPeriodFilter();
}

// Aplicar filtro de período
async function applyPeriodFilter() {
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    if (filtroDataInicio && filtroDataFim) {
        dashboardData.filters.dataInicio = filtroDataInicio.value ? new Date(filtroDataInicio.value) : null;
        dashboardData.filters.dataFim = filtroDataFim.value ? new Date(filtroDataFim.value) : null;
    }
    
    updatePeriodIndicator();
    await loadDashboardData();
}

// Limpar filtro de período
function clearPeriodFilter() {
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    if (filtroDataInicio && filtroDataFim) {
        filtroDataInicio.value = '';
        filtroDataFim.value = '';
    }
    
    dashboardData.filters.dataInicio = null;
    dashboardData.filters.dataFim = null;
    
    updatePeriodIndicator();
    applyPeriodFilter();
}

// Atualizar indicador de período
function updatePeriodIndicator() {
    const periodText = document.getElementById('current-period-text');
    if (!periodText) return;
    
    const { dataInicio, dataFim } = dashboardData.filters;
    
    if (!dataInicio && !dataFim) {
        periodText.textContent = 'Todos os dados';
    } else if (dataInicio && dataFim) {
        if (isSameDay(dataInicio, dataFim)) {
            periodText.textContent = `${formatDateBR(dateToInputValue(dataInicio))}`;
        } else {
            periodText.textContent = `${formatDateBR(dateToInputValue(dataInicio))} até ${formatDateBR(dateToInputValue(dataFim))}`;
        }
    } else if (dataInicio) {
        periodText.textContent = `A partir de ${formatDateBR(dateToInputValue(dataInicio))}`;
    } else if (dataFim) {
        periodText.textContent = `Até ${formatDateBR(dateToInputValue(dataFim))}`;
    }
}

// Verificar se duas datas são do mesmo dia
function isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
}

// Filtrar dados por período
function filterDataByPeriod(data, dateField = 'dataVenda') {
    if (!dashboardData.filters.dataInicio && !dashboardData.filters.dataFim) {
        return data;
    }
    
    return data.filter(item => {
        const itemDate = new Date(item[dateField]);
        
        if (dashboardData.filters.dataInicio && itemDate < dashboardData.filters.dataInicio) {
            return false;
        }
        
        if (dashboardData.filters.dataFim) {
            const endOfDay = new Date(dashboardData.filters.dataFim);
            endOfDay.setHours(23, 59, 59, 999);
            if (itemDate > endOfDay) {
                return false;
            }
        }
        
        return true;
    });
}

// Carregar todos os dados do dashboard
async function loadDashboardData() {
    try {
        showLoading(true);
        console.log('📡 Carregando dados do dashboard...');
        
        const [resumoBasico, despesas, vendas, postes] = await Promise.all([
            fetchResumoVendas().catch(err => {
                console.warn('Erro ao carregar resumo:', err);
                return {};
            }),
            fetchDespesas().catch(err => {
                console.warn('Erro ao carregar despesas:', err);
                return [];
            }),
            fetchVendas().catch(err => {
                console.warn('Erro ao carregar vendas:', err);
                return [];
            }),
            fetchPostes().catch(err => {
                console.warn('Erro ao carregar postes:', err);
                return [];
            })
        ]);

        // Aplicar filtros de período aos dados
        const vendasFiltradas = filterDataByPeriod(vendas, 'dataVenda');
        const despesasFiltradas = filterDataByPeriod(despesas, 'dataDespesa');

        dashboardData.resumo = resumoBasico;
        dashboardData.despesas = despesasFiltradas;
        dashboardData.vendas = vendasFiltradas;
        dashboardData.postes = postes;

        console.log('📊 Dados carregados (filtrados):', { 
            resumoBasico, 
            despesas: despesasFiltradas.length, 
            vendas: vendasFiltradas.length,
            postes: postes.length
        });

        // CALCULAR LUCROS NO FRONTEND COM DADOS FILTRADOS
        const lucrosCalculados = calcularLucrosComDadosFiltrados(vendasFiltradas, despesasFiltradas);

        // Atualizar interface
        updateResumoCards(lucrosCalculados);
        updateEstatisticas(vendasFiltradas, postes, despesasFiltradas);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

// Calcular lucros com dados filtrados
function calcularLucrosComDadosFiltrados(vendas, despesas) {
    console.log('🔢 Calculando lucros com dados filtrados...');
    
    // Separar vendas por tipo
    const vendasE = vendas.filter(v => v.tipoVenda === 'E');
    const vendasV = vendas.filter(v => v.tipoVenda === 'V');
    const vendasL = vendas.filter(v => v.tipoVenda === 'L');

    // Calcular valores básicos
    const valorTotalVendas = vendasV.reduce((sum, v) => sum + (parseFloat(v.valorTotalInformado) || 0), 0);
    const valorTotalExtras = vendasE.reduce((sum, v) => sum + (parseFloat(v.valorExtra) || 0), 0);
    const totalFreteEletrons = vendasL.reduce((sum, v) => sum + (parseFloat(v.freteEletrons) || 0), 0);

    // Calcular custo dos postes (baseado nos itens das vendas V)
    let totalVendaPostes = 0;
    vendasV.forEach(venda => {
        if (venda.itens && venda.itens.length > 0) {
            totalVendaPostes += venda.itens.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
        }
    });

    // Separar despesas por tipo
    const despesasFuncionario = despesas
        .filter(d => d.tipo === 'FUNCIONARIO')
        .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);
        
    const outrasDespesas = despesas
        .filter(d => d.tipo === 'OUTRAS')
        .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);

    // LÓGICA PRINCIPAL DE CÁLCULO - CORRIGIDA:
    
    // 1. Lucro das vendas normais (V): Valor vendido - Custo dos postes
    const lucroVendasNormais = valorTotalVendas - totalVendaPostes;

    // 2. Somar todas as contribuições extras (E + Frete L)
    const totalContribuicoesExtras = valorTotalExtras + totalFreteEletrons;

    // 3. LUCRO TOTAL = Lucro vendas normais + Contribuições extras - APENAS OUTRAS DESPESAS
    const lucroTotal = lucroVendasNormais + totalContribuicoesExtras - outrasDespesas;

    // 4. Divisão inicial: 50% para cada lado (SEM descontar funcionário ainda)
    const metadeCicero = lucroTotal / 2;
    const metadeGilbertoJefferson = lucroTotal / 2;

    // 5. Da parte do Gilberto e Jefferson, descontar despesas de funcionário
    const parteGilbertoJeffersonLiquida = metadeGilbertoJefferson - despesasFuncionario;

    // 6. Dividir entre Gilberto e Jefferson (25% cada do total)
    const parteGilberto = parteGilbertoJeffersonLiquida / 2;
    const parteJefferson = parteGilbertoJeffersonLiquida / 2;

    return {
        // Valores base
        totalVendaPostes,
        valorTotalVendas,
        totalContribuicoesExtras,
        despesasFuncionario,
        outrasDespesas,
        
        // Lucros calculados
        lucroVendasNormais,
        lucroTotal, // APENAS com outras despesas descontadas
        
        // Distribuição
        parteCicero: metadeCicero,
        parteGilberto,
        parteJefferson,
        
        // Valores por tipo
        valorTotalExtras,
        totalFreteEletrons,
        
        // Estatísticas
        totalVendasE: vendasE.length,
        totalVendasV: vendasV.length,
        totalVendasL: vendasL.length,
        totalVendas: vendas.length
    };
}

// Funções de API com filtros
async function apiRequest(endpoint, params = {}) {
    try {
        const url = new URL(`${CONFIG.API_BASE}${endpoint}`);
        
        // Adicionar parâmetros de filtro se existirem
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro na requisição ${endpoint}:`, error);
        throw error;
    }
}

async function fetchResumoVendas() {
    const params = {};
    
    if (dashboardData.filters.dataInicio) {
        params.dataInicio = dashboardData.filters.dataInicio.toISOString();
    }
    
    if (dashboardData.filters.dataFim) {
        // Adicionar horário de fim do dia
        const fimDia = new Date(dashboardData.filters.dataFim);
        fimDia.setHours(23, 59, 59, 999);
        params.dataFim = fimDia.toISOString();
    }
    
    return await apiRequest('/vendas/resumo', params);
}

async function fetchDespesas() {
    const params = {};
    
    if (dashboardData.filters.dataInicio) {
        params.dataInicio = dashboardData.filters.dataInicio.toISOString();
    }
    
    if (dashboardData.filters.dataFim) {
        const fimDia = new Date(dashboardData.filters.dataFim);
        fimDia.setHours(23, 59, 59, 999);
        params.dataFim = fimDia.toISOString();
    }
    
    return await apiRequest('/despesas', params);
}

async function fetchVendas() {
    const params = {};
    
    if (dashboardData.filters.dataInicio) {
        params.dataInicio = dashboardData.filters.dataInicio.toISOString();
    }
    
    if (dashboardData.filters.dataFim) {
        const fimDia = new Date(dashboardData.filters.dataFim);
        fimDia.setHours(23, 59, 59, 999);
        params.dataFim = fimDia.toISOString();
    }
    
    return await apiRequest('/vendas', params);
}

async function fetchPostes() {
    // Postes não precisam de filtro de data
    return await apiRequest('/postes');
}

// Atualizar cards de resumo - ATUALIZADO
function updateResumoCards(lucros) {
    console.log('📊 Atualizando cards de resumo...');
    
    // Cards de valores básicos
    const cards = [
        { id: 'total-venda-postes', value: lucros.totalVendaPostes },
        { id: 'valor-total-vendas', value: lucros.valorTotalVendas },
        { id: 'total-contribuicoes-extras', value: lucros.totalContribuicoesExtras },
        { id: 'total-despesas', value: lucros.outrasDespesas }, // APENAS outras despesas
        { id: 'lucro-total', value: lucros.lucroTotal },
        { id: 'parte-cicero', value: lucros.parteCicero },
        { id: 'parte-gilberto', value: lucros.parteGilberto },
        { id: 'parte-jefferson', value: lucros.parteJefferson }
    ];

    // Cards de despesas detalhadas
    const despesasCards = [
        { id: 'total-outras-despesas-detalhado', value: lucros.outrasDespesas },
        { id: 'total-despesas-funcionario-detalhado', value: lucros.despesasFuncionario },
        { id: 'total-geral-despesas', value: lucros.outrasDespesas + lucros.despesasFuncionario }
    ];

    cards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            element.textContent = formatCurrency(card.value || 0);
            
            // Adicionar cor para valores
            if (card.value < 0) {
                element.style.color = '#dc2626';
            } else if (card.id.includes('lucro') || card.id.includes('parte')) {
                element.style.color = '#059669';
            } else if (card.id.includes('contribuicoes')) {
                element.style.color = '#f59e0b';
            }
        }
    });

    // Atualizar cards de despesas detalhadas
    despesasCards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            element.textContent = formatCurrency(card.value || 0);
            
            // Colorir despesas funcionário diferente
            if (card.id.includes('funcionario')) {
                element.style.color = '#f59e0b';
            } else if (card.id.includes('outras') || card.id.includes('geral')) {
                element.style.color = '#dc2626';
            }
        }
    });

    // Cards específicos por tipo de venda
    const tipoCards = [
        { id: 'total-extras-e', value: lucros.valorTotalExtras },
        { id: 'total-frete-loja', value: lucros.totalFreteEletrons }
    ];

    tipoCards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            element.textContent = formatCurrency(card.value || 0);
        }
    });
    
    // Calcular e mostrar margem de lucro (baseada no lucro total)
    const margemLucro = lucros.valorTotalVendas > 0 ? 
        (lucros.lucroTotal / lucros.valorTotalVendas * 100) : 0;
    const margemElement = document.getElementById('margem-lucro');
    if (margemElement) {
        margemElement.textContent = `${margemLucro.toFixed(1)}%`;
        margemElement.style.color = margemLucro >= 0 ? '#059669' : '#dc2626';
    }
}

// Atualizar estatísticas
function updateEstatisticas(vendas, postes, despesas) {
    console.log('📈 Atualizando estatísticas...');
    
    // Estatísticas por tipo de venda
    const vendasE = vendas.filter(v => v.tipoVenda === 'E').length;
    const vendasV = vendas.filter(v => v.tipoVenda === 'V').length;
    const vendasL = vendas.filter(v => v.tipoVenda === 'L').length;
    
    // Calcular ticket médio baseado em vendas do tipo V
    const vendasVList = vendas.filter(v => v.tipoVenda === 'V');
    const ticketMedio = vendasVList.length > 0 ? 
        vendasVList.reduce((sum, v) => sum + (v.valorTotalInformado || 0), 0) / vendasVList.length : 0;
    
    const stats = {
        'total-vendas': vendas.length,
        'total-postes': postes.filter(p => p.ativo).length,
        'total-despesas-count': despesas.length,
        'ticket-medio': ticketMedio
    };

    Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (id === 'ticket-medio') {
                element.textContent = formatCurrency(value);
            } else {
                element.textContent = value.toString();
            }
        }
    });
    
    // Atualizar estatísticas específicas por tipo
    const estatisticasTipo = {
        'vendas-tipo-e': vendasE,
        'vendas-tipo-v': vendasV,
        'vendas-tipo-l': vendasL
    };
    
    Object.entries(estatisticasTipo).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value.toString();
        }
    });
}

// Função para mostrar detalhes do cálculo - ATUALIZADA
function mostrarDetalhesCalculo() {
    if (!dashboardData.vendas || !dashboardData.despesas) {
        showAlert('Dados não carregados ainda', 'warning');
        return;
    }

    const lucros = calcularLucrosComDadosFiltrados(dashboardData.vendas, dashboardData.despesas);
    
    const { dataInicio, dataFim } = dashboardData.filters;
    let periodoTexto = '';
    
    if (dataInicio && dataFim) {
        if (isSameDay(dataInicio, dataFim)) {
            periodoTexto = `\nPeríodo: ${formatDateBR(dateToInputValue(dataInicio))}\n`;
        } else {
            periodoTexto = `\nPeríodo: ${formatDateBR(dateToInputValue(dataInicio))} até ${formatDateBR(dateToInputValue(dataFim))}\n`;
        }
    } else if (dataInicio) {
        periodoTexto = `\nPeríodo: A partir de ${formatDateBR(dateToInputValue(dataInicio))}\n`;
    } else if (dataFim) {
        periodoTexto = `\nPeríodo: Até ${formatDateBR(dateToInputValue(dataFim))}\n`;
    } else {
        periodoTexto = '\nPeríodo: Todos os dados\n';
    }
    
    const detalhes = `
DETALHES DO CÁLCULO DE LUCROS:${periodoTexto}
1. Vendas Normais (Tipo V):
   - Custo dos postes: ${formatCurrency(lucros.totalVendaPostes)}
   - Valor arrecadado: ${formatCurrency(lucros.valorTotalVendas)}
   - Lucro vendas normais: ${formatCurrency(lucros.lucroVendasNormais)}

2. Contribuições Extras:
   - Tipo E (Extras): ${formatCurrency(lucros.valorTotalExtras)}
   - Tipo L (Frete Loja): ${formatCurrency(lucros.totalFreteEletrons)}
   - Total contribuições: ${formatCurrency(lucros.totalContribuicoesExtras)}

3. Despesas:
   - Outras despesas: ${formatCurrency(lucros.outrasDespesas)}
   - Despesas funcionário: ${formatCurrency(lucros.despesasFuncionario)}

4. Cálculo do Lucro Total:
   - Fórmula: (Lucro V + Contribuições E+L) - APENAS Outras Despesas
   - Lucro total: ${formatCurrency(lucros.lucroTotal)}

5. Distribuição:
   - Parte Cícero (50%): ${formatCurrency(lucros.parteCicero)}
   - Parte G&J antes funcionário: ${formatCurrency(lucros.lucroTotal / 2)}
   - Desconto funcionário: ${formatCurrency(lucros.despesasFuncionario)}
   - Gilberto (25%): ${formatCurrency(lucros.parteGilberto)}
   - Jefferson (25%): ${formatCurrency(lucros.parteJefferson)}

6. Estatísticas do Período:
   - Vendas E: ${lucros.totalVendasE}
   - Vendas V: ${lucros.totalVendasV}
   - Vendas L: ${lucros.totalVendasL}
   - Total vendas: ${lucros.totalVendas}

OBSERVAÇÃO: Despesas de funcionário só afetam a divisão G&J, não o lucro total.
    `;

    alert(detalhes);
}

// Refresh do dashboard
async function refreshDashboard() {
    console.log('🔄 Atualizando dashboard...');
    
    try {
        await loadDashboardData();
        showAlert('Dashboard atualizado!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        showAlert('Erro ao atualizar dashboard', 'error');
    }
}

// Utilitários - FORMATAÇÃO BRASILEIRA
function formatCurrency(value) {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function dateToInputValue(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

function showAlert(message, type = 'success', duration = 5000) {
    const alertContainer = document.getElementById('alert-container');
    
    if (!alertContainer) {
        console.warn('Container de alertas não encontrado');
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.appendChild(alert);
    
    // Auto-remover após o tempo especificado
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, duration);
    
    console.log(`📢 Alerta: ${message} (${type})`);
}

console.log('✅ Dashboard carregado com filtros de período e formato brasileiro');