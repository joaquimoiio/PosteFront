// Dashboard.js - Versão Refatorada e Simplificada
let dashboardData = {
    resumo: null,
    loading: false
};

// Inicialização da página
window.initDashboardPage = async function() {
    console.log('🎯 Inicializando Dashboard...');
    
    try {
        showLoading(true);
        await loadDashboardData();
        console.log('✅ Dashboard carregado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        showError('Erro ao carregar dados do dashboard');
    } finally {
        showLoading(false);
    }
};

// Carregar todos os dados do dashboard
async function loadDashboardData() {
    try {
        // Buscar dados em paralelo
        const [resumo, vendas, postes, despesas] = await Promise.all([
            VendaService.getResumo(),
            VendaService.getAll().catch(() => []),
            PosteService.getAll().catch(() => []),
            DespesaService.getAll().catch(() => [])
        ]);

        dashboardData.resumo = resumo;

        // Atualizar interface
        updateResumoCards(resumo);
        updateEstatisticas(vendas, postes, despesas);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    }
}

// Atualizar cards de resumo
function updateResumoCards(resumo) {
    const cards = [
        { id: 'total-venda-postes', value: resumo.totalVendaPostes },
        { id: 'total-frete', value: resumo.totalFreteEletrons },
        { id: 'valor-total-vendas', value: resumo.valorTotalVendas },
        { id: 'total-valor-extra', value: resumo.totalValorExtra },
        { id: 'despesas-funcionario', value: resumo.despesasFuncionario },
        { id: 'outras-despesas', value: resumo.outrasDespesas },
        { id: 'total-despesas', value: resumo.totalDespesas },
        { id: 'lucro-total', value: resumo.lucro },
        { id: 'parte-cicero', value: resumo.parteCicero },
        { id: 'parte-guilherme', value: resumo.parteGuilherme },
        { id: 'parte-jefferson', value: resumo.parteJefferson }
    ];

    cards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            element.textContent = Utils.formatCurrency(card.value || 0);
            
            // Adicionar cor para valores negativos
            if (card.value < 0) {
                element.style.color = '#dc2626';
            } else if (card.id.includes('lucro') || card.id.includes('parte')) {
                element.style.color = '#059669';
            }
        }
    });
}

// Atualizar estatísticas
function updateEstatisticas(vendas, postes, despesas) {
    const stats = {
        'total-vendas': vendas.length,
        'total-postes': postes.filter(p => p.ativo).length,
        'total-despesas': despesas.length,
        'ticket-medio': vendas.length > 0 ? 
            vendas.reduce((sum, v) => sum + (v.valorTotalInformado || 0), 0) / vendas.length : 0
    };

    Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (id === 'ticket-medio') {
                element.textContent = Utils.formatCurrency(value);
            } else {
                element.textContent = value.toString();
            }
        }
    });
}

// Mostrar loading
function showLoading(show) {
    const loadingElement = document.getElementById('dashboard-loading');
    const contentElement = document.getElementById('dashboard-content');
    
    if (loadingElement && contentElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
        contentElement.style.display = show ? 'none' : 'block';
    }
}

// Mostrar erro
function showError(message) {
    const errorElement = document.getElementById('dashboard-error');
    if (errorElement) {
        errorElement.style.display = 'block';
        errorElement.querySelector('.error-message').textContent = message;
    }
}

// Refresh do dashboard
window.refreshDashboard = async function() {
    console.log('🔄 Atualizando dashboard...');
    await initDashboardPage();
    showAlert('Dashboard atualizado!', 'success');
};

// Exportar relatório
window.exportarRelatorio = function() {
    if (!dashboardData.resumo) {
        showAlert('Dados não carregados', 'warning');
        return;
    }

    const resumo = dashboardData.resumo;
    const relatorio = [
        {
            'Métrica': 'Total Venda Postes',
            'Valor': resumo.totalVendaPostes || 0
        },
        {
            'Métrica': 'Total Frete Eletrons',
            'Valor': resumo.totalFreteEletrons || 0
        },
        {
            'Métrica': 'Valor Total Vendas',
            'Valor': resumo.valorTotalVendas || 0
        },
        {
            'Métrica': 'Total Despesas',
            'Valor': resumo.totalDespesas || 0
        },
        {
            'Métrica': 'Lucro Total',
            'Valor': resumo.lucro || 0
        },
        {
            'Métrica': 'Parte Cícero',
            'Valor': resumo.parteCicero || 0
        },
        {
            'Métrica': 'Parte Guilherme',
            'Valor': resumo.parteGuilherme || 0
        },
        {
            'Métrica': 'Parte Jefferson',
            'Valor': resumo.parteJefferson || 0
        }
    ];

    Utils.exportToCSV(relatorio, `relatorio_${new Date().toISOString().split('T')[0]}`);
};