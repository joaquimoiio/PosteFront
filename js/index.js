// Dashboard JavaScript - VERSÃO FINAL COM FORMATO BRASILEIRO
const CONFIG = {
    API_BASE: 'http://localhost:8080/api'
};

// Estado global do dashboard
let dashboardData = {
    resumo: null,
    despesas: [],
    vendas: [],
    postes: [],
    loading: false
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
    
    // Configurar inputs de data (se houver)
    setTimeout(() => {
        const inputs = document.querySelectorAll('input[type="date"]');
        inputs.forEach(input => {
            input.setAttribute('lang', 'pt-BR');
        });
    }, 100);
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

        dashboardData.resumo = resumoBasico;
        dashboardData.despesas = despesas;
        dashboardData.vendas = vendas;
        dashboardData.postes = postes;

        console.log('📊 Dados carregados:', { 
            resumoBasico, 
            despesas: despesas.length, 
            vendas: vendas.length,
            postes: postes.length
        });

        // CALCULAR LUCROS NO FRONTEND
        const lucrosCalculados = calcularLucros(resumoBasico, despesas);

        // Atualizar interface
        updateResumoCards(resumoBasico, lucrosCalculados);
        updateEstatisticas(vendas, postes, despesas);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

// Funções de API
async function apiRequest(endpoint) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}${endpoint}`);
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
    return await apiRequest('/vendas/resumo');
}

async function fetchDespesas() {
    return await apiRequest('/despesas');
}

async function fetchVendas() {
    return await apiRequest('/vendas');
}

async function fetchPostes() {
    return await apiRequest('/postes');
}

// Lógica de cálculo de lucros
function calcularLucros(resumoBasico, despesas) {
    console.log('🔢 Iniciando cálculo de lucros...');
    
    // Extrair dados do resumo com valores padrão
    const {
        totalVendaPostes = 0,      // Custo total dos postes vendidos (tipo V)
        valorTotalVendas = 0,      // Valor total arrecadado das vendas (tipo V)
        valorTotalExtras = 0,      // Valores dos tipos E
        totalFreteEletrons = 0     // Frete do tipo L (Venda Loja)
    } = resumoBasico || {};

    // Separar despesas por tipo
    const despesasFuncionario = despesas
        ? despesas.filter(d => d.tipo === 'FUNCIONARIO')
                 .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0)
        : 0;
        
    const outrasDespesas = despesas
        ? despesas.filter(d => d.tipo === 'OUTRAS')
                 .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0)
        : 0;

    // LÓGICA PRINCIPAL DE CÁLCULO:
    // 1. Lucro das vendas normais (V): Valor vendido - Custo dos postes
    const lucroVendasNormais = parseFloat(valorTotalVendas) - parseFloat(totalVendaPostes);

    // 2. Somar todas as contribuições extras (E + Frete L)
    const totalContribuicoesExtras = parseFloat(valorTotalExtras) + parseFloat(totalFreteEletrons);

    // 3. Lucro bruto = Lucro vendas normais + Contribuições extras - Outras despesas
    const lucroBruto = lucroVendasNormais + totalContribuicoesExtras - outrasDespesas;

    // 4. Divisão inicial: 50% para cada lado
    const metadeCicero = lucroBruto / 2;
    const metadeGuilhermeJefferson = lucroBruto / 2;

    // 5. Da parte do Guilherme e Jefferson, descontar despesas de funcionário
    const parteGuilhermeJeffersonLiquida = metadeGuilhermeJefferson - despesasFuncionario;

    // 6. Dividir entre Guilherme e Jefferson (25% cada do total)
    const parteGuilherme = parteGuilhermeJeffersonLiquida / 2;
    const parteJefferson = parteGuilhermeJeffersonLiquida / 2;

    // 7. Lucro total final considerando todas as despesas
    const lucroTotal = lucroBruto - despesasFuncionario;

    return {
        // Valores base
        totalVendaPostes: parseFloat(totalVendaPostes) || 0,
        valorTotalVendas: parseFloat(valorTotalVendas) || 0,
        totalContribuicoesExtras,
        despesasFuncionario,
        outrasDespesas,
        
        // Lucros calculados
        lucroVendasNormais,
        lucroBruto,
        lucroTotal,
        
        // Distribuição
        parteCicero: metadeCicero,
        parteGuilherme,
        parteJefferson,
        
        // Valores por tipo
        valorTotalExtras: parseFloat(valorTotalExtras) || 0,
        totalFreteEletrons: parseFloat(totalFreteEletrons) || 0
    };
}

// Atualizar cards de resumo
function updateResumoCards(resumoBasico, lucros) {
    console.log('📊 Atualizando cards de resumo...');
    
    // Cards de valores básicos
    const cards = [
        { id: 'total-venda-postes', value: lucros.totalVendaPostes },
        { id: 'valor-total-vendas', value: lucros.valorTotalVendas },
        { id: 'total-contribuicoes-extras', value: lucros.totalContribuicoesExtras },
        { id: 'total-despesas', value: lucros.despesasFuncionario + lucros.outrasDespesas },
        { id: 'lucro-total', value: lucros.lucroTotal },
        { id: 'parte-cicero', value: lucros.parteCicero },
        { id: 'parte-gilberto', value: lucros.parteGuilherme },
        { id: 'parte-jefferson', value: lucros.parteJefferson }
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
    
    // Calcular e mostrar margem de lucro
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
    
    // Usar dados do resumo se estiverem disponíveis
    let vendasE, vendasV, vendasL;
    
    if (dashboardData.resumo) {
        vendasE = dashboardData.resumo.totalVendasE || 0;
        vendasV = dashboardData.resumo.totalVendasV || 0;
        vendasL = dashboardData.resumo.totalVendasL || 0;
    } else {
        // Fallback para cálculo manual
        vendasE = vendas.filter(v => v.tipoVenda === 'E').length;
        vendasV = vendas.filter(v => v.tipoVenda === 'V').length;
        vendasL = vendas.filter(v => v.tipoVenda === 'L').length;
    }
    
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

// Função para mostrar detalhes do cálculo
function mostrarDetalhesCalculo() {
    if (!dashboardData.resumo || !dashboardData.despesas) {
        showAlert('Dados não carregados ainda', 'warning');
        return;
    }

    const lucros = calcularLucros(dashboardData.resumo, dashboardData.despesas);
    
    const detalhes = `
DETALHES DO CÁLCULO DE LUCROS:

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

4. Cálculo Final:
   - Lucro bruto: ${formatCurrency(lucros.lucroBruto)}
   - Parte Cícero (50%): ${formatCurrency(lucros.parteCicero)}
   - Parte G&J (50% - desp. func.): ${formatCurrency(lucros.parteGuilherme + lucros.parteJefferson)}
   - Guilherme (25%): ${formatCurrency(lucros.parteGuilherme)}
   - Jefferson (25%): ${formatCurrency(lucros.parteJefferson)}
   - Lucro total: ${formatCurrency(lucros.lucroTotal)}
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

console.log('✅ Dashboard carregado com formato brasileiro');