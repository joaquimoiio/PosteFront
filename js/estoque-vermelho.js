// Estado local para estoque individual (vermelho ou branco) - ATUALIZADO
let estoqueData = {
    estoque: [],
    postes: [],
    filters: { status: '', codigo: '' }
};

// Determinar qual caminhão com base no arquivo atual
const CAMINHAO_ATUAL = window.location.pathname.includes('vermelho') ? 'vermelho' : 'branco';

// Verificar autenticação (vermelho, branco ou jefferson)
document.addEventListener('DOMContentLoaded', () => {
    const userType = localStorage.getItem('poste-system-user-type');
    
    // Verificar se o usuário pode acessar este caminhão
    if (userType !== 'jefferson' && userType !== CAMINHAO_ATUAL) {
        window.location.href = 'index.html';
        return;
    }

    if (!window.AppUtils) {
        console.error('AppUtils não carregado! Verifique se utils.js foi incluído.');
        return;
    }

    initEstoqueIndividual();
});

async function initEstoqueIndividual() {
    console.log(`🎯 Inicializando Estoque Caminhão ${CAMINHAO_ATUAL.toUpperCase()}...`);

    try {
        setupEventListeners();
        await loadAllData();
        console.log(`✅ Estoque Caminhão ${CAMINHAO_ATUAL.toUpperCase()} carregado`);
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        window.AppUtils.showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

function setupEventListeners() {
    // Form principal
    const estoqueForm = document.getElementById('estoque-form');
    if (estoqueForm) {
        estoqueForm.addEventListener('submit', handleEstoqueSubmit);
        estoqueForm.addEventListener('reset', resetForm);
    }

    // Filtros
    const filtros = ['filtro-status', 'filtro-codigo'];
    filtros.forEach(filtroId => {
        const elemento = document.getElementById(filtroId);
        if (elemento) {
            elemento.addEventListener('change', aplicarFiltros);
            elemento.addEventListener('input', aplicarFiltros);
        }
    });
}

async function loadAllData() {
    try {
        window.AppUtils.showLoading(true);

        console.log(`📊 Carregando dados do Caminhão ${CAMINHAO_ATUAL.toUpperCase()}...`);

        // Para estoque individual, carregamos tanto o estoque específico quanto os postes
        const [estoque, postes] = await Promise.all([
            fetchEstoqueIndividual(),
            fetchPostesCaminhao(CAMINHAO_ATUAL)
        ]);

        estoqueData.estoque = estoque || [];
        estoqueData.postes = postes || [];

        populatePosteSelect();
        updateResumo();
        aplicarFiltros();

        console.log(`✅ Dados do Caminhão ${CAMINHAO_ATUAL.toUpperCase()} carregados`);

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        window.AppUtils.showLoading(false);
    }
}

// Função para buscar estoque individual (mostra apenas postes deste caminhão mas com quantidade consolidada)
async function fetchEstoqueIndividual() {
    try {
        console.log(`📦 Buscando estoque para caminhão ${CAMINHAO_ATUAL}...`);
        
        const response = await fetch(`https://posteback.onrender.com/api/estoque`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': CAMINHAO_ATUAL // Usar tenant específico
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const estoque = await response.json();
        console.log(`✅ Estoque carregado: ${estoque.length} itens para ${CAMINHAO_ATUAL}`);
        
        return estoque;
    } catch (error) {
        console.error(`❌ Erro ao buscar estoque do ${CAMINHAO_ATUAL}:`, error);
        return [];
    }
}

async function fetchPostesCaminhao(caminhao) {
    try {
        const response = await fetch(`https://posteback.onrender.com/api/postes?caminhao=${caminhao}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': caminhao
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const postes = await response.json();
        return (postes || []).filter(p => p.ativo);
    } catch (error) {
        console.error(`Erro ao buscar postes do ${caminhao}:`, error);
        return [];
    }
}

function populatePosteSelect() {
    const posteSelect = document.getElementById('estoque-poste');
    if (!posteSelect) return;

    // Limpar opções existentes exceto a primeira
    while (posteSelect.children.length > 1) {
        posteSelect.removeChild(posteSelect.lastChild);
    }

    estoqueData.postes.forEach(poste => {
        const option = document.createElement('option');
        option.value = poste.id;
        option.textContent = `${poste.codigo} - ${poste.descricao} (${window.AppUtils.formatCurrency(poste.preco)})`;
        posteSelect.appendChild(option);
    });
}

async function handleEstoqueSubmit(e) {
    e.preventDefault();

    try {
        const formData = buildFormData();

        if (!validateFormData(formData)) {
            return;
        }

        window.AppUtils.showLoading(true);

        // Fazer requisição para o caminhão atual
        const response = await fetch('https://posteback.onrender.com/api/estoque/adicionar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': CAMINHAO_ATUAL
            },
            body: JSON.stringify({
                posteId: formData.posteId,
                quantidade: formData.quantidade
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        window.AppUtils.showAlert('Estoque adicionado com sucesso!', 'success');
        resetForm();

        await loadAllData();

    } catch (error) {
        console.error('Erro ao adicionar estoque:', error);
        window.AppUtils.showAlert('Erro ao adicionar estoque: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

function buildFormData() {
    return {
        posteId: parseInt(document.getElementById('estoque-poste').value),
        quantidade: parseInt(document.getElementById('estoque-quantidade').value),
        observacao: document.getElementById('estoque-observacao').value.trim() || null
    };
}

function validateFormData(data) {
    if (!window.AppUtils.validateRequired(data.posteId, 'Poste')) {
        return false;
    }

    return window.AppUtils.validateNumber(data.quantidade, 'Quantidade', 0);
}

function updateResumo() {
    const total = estoqueData.estoque.length;
    const positivo = estoqueData.estoque.filter(item => (item.quantidadeAtual || 0) > 0).length;
    const zero = estoqueData.estoque.filter(item => (item.quantidadeAtual || 0) === 0).length;
    const negativo = estoqueData.estoque.filter(item => (item.quantidadeAtual || 0) < 0).length;

    window.AppUtils.updateElement('total-tipos', total);
    window.AppUtils.updateElement('estoque-positivo', positivo);
    window.AppUtils.updateElement('estoque-negativo', negativo);
    window.AppUtils.updateElement('estoque-zero', zero);
}

function aplicarFiltros() {
    const status = document.getElementById('filtro-status').value;
    const codigo = document.getElementById('filtro-codigo').value.toLowerCase();

    let filtrados = [...estoqueData.estoque];

    // Filtrar por status
    if (status) {
        filtrados = filtrados.filter(item => {
            const qtd = item.quantidadeAtual || 0;
            switch (status) {
                case 'positivo': return qtd > 0;
                case 'zero': return qtd === 0;
                case 'negativo': return qtd < 0;
                case 'baixo': return qtd > 0 && qtd <= 5;
                default: return true;
            }
        });
    }

    // Filtrar por código
    if (codigo) {
        filtrados = filtrados.filter(item =>
            item.codigoPoste.toLowerCase().includes(codigo) ||
            item.descricaoPoste.toLowerCase().includes(codigo)
        );
    }

    displayEstoque(filtrados);
}

function displayEstoque(estoque) {
    const container = document.getElementById('estoque-list');
    if (!container) return;

    if (!estoque || estoque.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h3>Nenhum item encontrado</h3>
                <p>Ajuste os filtros para ver mais itens ou adicione estoque.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    estoque.forEach(item => {
        const element = createEstoqueItem(item);
        container.appendChild(element);
    });
}

function createEstoqueItem(item) {
    const element = document.createElement('div');
    const quantidade = item.quantidadeAtual || 0;
    const statusClass = getStatusClass(quantidade);

    element.className = `mobile-list-item ${statusClass}`;

    // Para estoque individual, mostrar que é quantidade consolidada
    const caminhaoIcon = CAMINHAO_ATUAL === 'vermelho' ? '🚛' : '🚚';
    const caminhaoNome = CAMINHAO_ATUAL === 'vermelho' ? 'Vermelho' : 'Branco';

    element.innerHTML = `
        <div class="item-header">
            <span class="item-status ${statusClass}">
                ${getStatusText(quantidade)}
            </span>
            <span class="item-code">${item.codigoPoste}</span>
        </div>
        
        <div class="item-content">
            <div class="item-quantidade ${statusClass}">${quantidade}</div>
            <div class="item-title">${item.descricaoPoste}</div>
            <div class="item-details">
                <small style="color: var(--text-secondary);">${caminhaoIcon} Caminhão ${caminhaoNome} - Estoque Consolidado</small>
            </div>
            <div class="item-details">Preço: ${window.AppUtils.formatCurrency(item.precoPoste || 0)}</div>
            ${item.dataAtualizacao ? `<div class="item-details"><small>Atualizado: ${window.AppUtils.formatDateBR(item.dataAtualizacao, true)}</small></div>` : ''}
        </div>
    `;

    return element;
}

function getStatusClass(quantidade) {
    if (quantidade > 5) return 'positivo';
    if (quantidade > 0) return 'baixo';
    if (quantidade === 0) return 'zero';
    return 'negativo';
}

function getStatusText(quantidade) {
    if (quantidade > 5) return '✅ Disponível';
    if (quantidade > 0) return '⚠️ Baixo';
    if (quantidade === 0) return '📦 Esgotado';
    return '🔻 Negativo';
}

function resetForm() {
    document.getElementById('estoque-form').reset();
}

function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    aplicarFiltros();
    window.AppUtils.showAlert('Filtros limpos', 'success');
}

async function atualizarEstoque() {
    try {
        await loadAllData();
        window.AppUtils.showAlert('Estoque atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        window.AppUtils.showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

function exportarEstoque() {
    if (!estoqueData.estoque || estoqueData.estoque.length === 0) {
        window.AppUtils.showAlert('Nenhum estoque para exportar', 'warning');
        return;
    }

    const caminhaoNome = CAMINHAO_ATUAL === 'vermelho' ? 'Vermelho' : 'Branco';

    const dadosExportar = estoqueData.estoque.map(item => ({
        'Código': item.codigoPoste,
        'Descrição': item.descricaoPoste,
        'Preço': item.precoPoste || 0,
        'Quantidade': item.quantidadeAtual || 0,
        'Status': getStatusText(item.quantidadeAtual || 0),
        'Valor Total': ((item.quantidadeAtual || 0) * (item.precoPoste || 0)).toFixed(2),
        'Caminhão': caminhaoNome,
        'Observação': 'Estoque Consolidado'
    }));

    window.AppUtils.exportToCSV(dadosExportar, `estoque_${CAMINHAO_ATUAL}_${new Date().toISOString().split('T')[0]}`);
}

// Disponibilizar funções globalmente
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.atualizarEstoque = atualizarEstoque;
window.exportarEstoque = exportarEstoque;

console.log(`✅ Estoque Caminhão ${CAMINHAO_ATUAL.toUpperCase()} ATUALIZADO carregado`);