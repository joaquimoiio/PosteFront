// Dashboard.js - Versão atualizada para novos tipos de venda
let dashboardData = {
    resumo: null,
    loading: false
};

// Inicialização da página
window.initDashboardPage = async function() {
    console.log('🎯 Inicializando Dashboard...');
    
    try {
        await loadDashboardData();
        console.log('✅ Dashboard carregado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        showAlert('Erro ao carregar dados do dashboard', 'error');
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
        { id: 'total-contribuicoes-extras', value: resumo.totalContribuicoesExtras },
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
            } else if (card.id.includes('contribuicoes')) {
                element.style.color = '#f59e0b';
            }
        }
    });
    
    // Calcular e mostrar margem de lucro
    const margemLucro = resumo.valorTotalVendas > 0 ? 
        (resumo.lucro / resumo.valorTotalVendas * 100) : 0;
    const margemElement = document.getElementById('margem-lucro');
    if (margemElement) {
        margemElement.textContent = `${margemLucro.toFixed(1)}%`;
        margemElement.style.color = margemLucro >= 0 ? '#059669' : '#dc2626';
    }
}

// Atualizar estatísticas
function updateEstatisticas(vendas, postes, despesas) {
    // Usar dados do resumo se estiverem disponíveis
    let vendasE, vendasV, vendasL;
    
    if (dashboardData.resumo && dashboardData.resumo.totalVendasE !== undefined) {
        vendasE = dashboardData.resumo.totalVendasE;
        vendasV = dashboardData.resumo.totalVendasV;
        vendasL = dashboardData.resumo.totalVendasL;
    } else {
        // Fallback para cálculo manual se o resumo não tiver os dados
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
                element.textContent = Utils.formatCurrency(value);
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

// Refresh do dashboard
window.refreshDashboard = async function() {
    console.log('🔄 Atualizando dashboard...');
    await initDashboardPage();
    showAlert('Dashboard atualizado!', 'success');
};