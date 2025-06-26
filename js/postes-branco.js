// Estado local específico para o Caminhão Branco
let postesData = {
    postes: [],
    currentEditId: null,
    filters: { status: '', codigo: '', descricao: '' }
};

// Verificar autenticação específica do Caminhão Branco
document.addEventListener('DOMContentLoaded', () => {
    const userType = localStorage.getItem('poste-system-user-type');
    if (userType !== 'branco') {
        window.location.href = 'index.html';
        return;
    }

    if (!window.AppUtils) {
        console.error('AppUtils não carregado! Verifique se utils.js foi incluído.');
        return;
    }

    initPostes();
});

async function initPostes() {
    console.log('🎯 Inicializando Postes Caminhão Branco...');

    try {
        setupEventListeners();
        await loadData();
        console.log('✅ Postes Caminhão Branco carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        window.AppUtils.showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

function setupEventListeners() {
    const posteForm = document.getElementById('poste-form');
    if (posteForm) {
        posteForm.addEventListener('submit', handlePosteSubmit);
        posteForm.addEventListener('reset', resetForm);
    }

    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }

    window.AppUtils.setupFilters({
        'filtro-status': 'status',
        'filtro-codigo': 'codigo',
        'filtro-descricao': 'descricao'
    }, applyFilters);
}

async function loadData() {
    try {
        window.AppUtils.showLoading(true);

        const postes = await fetchPostes();
        postesData.postes = postes || [];

        updateResumo();
        applyFilters();

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        window.AppUtils.showLoading(false);
    }
}

async function fetchPostes() {
    return await window.AppUtils.apiRequest('/postes');
}

async function handlePosteSubmit(e) {
    e.preventDefault();

    try {
        const formData = buildFormData();

        if (!validateFormData(formData)) {
            return;
        }

        window.AppUtils.showLoading(true);

        await window.AppUtils.apiRequest('/postes', {
            method: 'POST',
            body: JSON.stringify(formData),
            skipCache: true
        });

        window.AppUtils.showAlert('Poste criado com sucesso!', 'success');
        resetForm();

        window.AppUtils.clearCache();
        await loadData();

    } catch (error) {
        console.error('Erro ao criar poste:', error);
        window.AppUtils.showAlert('Erro ao criar poste: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

function buildFormData() {
    return {
        codigo: document.getElementById('poste-codigo').value.trim(),
        descricao: document.getElementById('poste-descricao').value.trim(),
        preco: parseFloat(document.getElementById('poste-preco').value),
        ativo: true
    };
}

function validateFormData(data) {
    if (!window.AppUtils.validateRequired(data.codigo, 'Código') ||
        !window.AppUtils.validateRequired(data.descricao, 'Descrição')) {
        return false;
    }

    if (data.descricao.length < 3) {
        window.AppUtils.showAlert('Descrição deve ter pelo menos 3 caracteres', 'warning');
        return false;
    }

    if (!window.AppUtils.validateNumber(data.preco, 'Preço', 0)) {
        return false;
    }

    const codigoExistente = postesData.postes.find(p =>
        p.codigo.toLowerCase() === data.codigo.toLowerCase() &&
        (!postesData.currentEditId || p.id !== postesData.currentEditId)
    );

    if (codigoExistente) {
        window.AppUtils.showAlert('Código já existe', 'warning');
        return false;
    }

    return true;
}

function displayPostes(postes) {
    const container = document.getElementById('postes-list');
    if (!container) return;

    if (!postes || postes.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">⚡</div>
                        <h3>Nenhum poste encontrado</h3>
                        <p>Comece cadastrando seu primeiro poste do Caminhão Branco.</p>
                        <button class="btn btn-primary" onclick="scrollToForm()">
                            Cadastrar Primeiro Poste
                        </button>
                    </div>
                `;
        return;
    }

    container.innerHTML = '';

    postes.forEach(poste => {
        const item = createPosteItem(poste);
        container.appendChild(item);
    });
}

function createPosteItem(poste) {
    const item = document.createElement('div');
    item.className = `mobile-list-item ${poste.ativo ? 'ativo' : 'inativo'}`;

    const statusLabel = poste.ativo ? '✅ Ativo' : '❌ Inativo';
    const statusClass = poste.ativo ? 'ativo' : 'inativo';

    item.innerHTML = `
                <div class="item-header">
                    <span class="item-status ${statusClass}">
                        ${statusLabel}
                    </span>
                    <span class="item-code">${poste.codigo}</span>
                </div>
                
                <div class="item-content">
                    <div class="item-price">${window.AppUtils.formatCurrency(poste.preco)}</div>
                    <div class="item-title">${poste.descricao}</div>
                </div>
                
                <div class="item-actions">
                    <button class="btn btn-small btn-primary" onclick="editPoste(${poste.id})">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-small ${poste.ativo ? 'btn-secondary' : 'btn-success'}" 
                            onclick="togglePosteStatus(${poste.id})">
                        ${poste.ativo ? '❌ Inativar' : '✅ Ativar'}
                    </button>
                </div>
            `;

    return item;
}

async function editPoste(id) {
    try {
        const poste = postesData.postes.find(p => p.id === id);
        if (!poste) {
            throw new Error('Poste não encontrado');
        }

        populateEditForm(poste);
        postesData.currentEditId = id;
        window.AppUtils.showModal('edit-modal');

    } catch (error) {
        console.error('Erro ao carregar poste para edição:', error);
        window.AppUtils.showAlert('Erro ao carregar dados do poste: ' + error.message, 'error');
    }
}

function populateEditForm(poste) {
    document.getElementById('edit-poste-codigo').value = poste.codigo;
    document.getElementById('edit-poste-descricao').value = poste.descricao;
    document.getElementById('edit-poste-preco').value = poste.preco;
    document.getElementById('edit-poste-ativo').value = poste.ativo.toString();
}

async function handleEditSubmit(e) {
    e.preventDefault();

    try {
        const formData = buildEditFormData();

        if (!validateFormData(formData)) {
            return;
        }

        window.AppUtils.showLoading(true);

        await window.AppUtils.apiRequest(`/postes/${postesData.currentEditId}`, {
            method: 'PUT',
            body: JSON.stringify(formData),
            skipCache: true
        });

        window.AppUtils.showAlert('Poste atualizado com sucesso!', 'success');
        window.AppUtils.closeModal('edit-modal');

        window.AppUtils.clearCache();
        await loadData();

    } catch (error) {
        console.error('Erro ao atualizar poste:', error);
        window.AppUtils.showAlert('Erro ao atualizar poste: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

function buildEditFormData() {
    return {
        codigo: document.getElementById('edit-poste-codigo').value.trim(),
        descricao: document.getElementById('edit-poste-descricao').value.trim(),
        preco: parseFloat(document.getElementById('edit-poste-preco').value),
        ativo: document.getElementById('edit-poste-ativo').value === 'true'
    };
}

async function togglePosteStatus(id) {
    try {
        const poste = postesData.postes.find(p => p.id === id);
        if (!poste) {
            throw new Error('Poste não encontrado');
        }

        const novoStatus = !poste.ativo;
        const acao = novoStatus ? 'ativar' : 'inativar';

        if (!confirm(`Tem certeza que deseja ${acao} este poste?`)) {
            return;
        }

        window.AppUtils.showLoading(true);

        await window.AppUtils.apiRequest(`/postes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...poste, ativo: novoStatus }),
            skipCache: true
        });

        window.AppUtils.showAlert(`Poste ${acao}do com sucesso!`, 'success');

        window.AppUtils.clearCache();
        await loadData();

    } catch (error) {
        console.error('Erro ao alterar status do poste:', error);
        window.AppUtils.showAlert('Erro ao alterar status do poste: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

function applyFilters() {
    const { status, codigo, descricao } = postesData.filters;

    let filtered = [...postesData.postes];

    if (status !== '') {
        const isActive = status === 'true';
        filtered = filtered.filter(p => p.ativo === isActive);
    }

    if (codigo) {
        const searchTerm = codigo.toLowerCase();
        filtered = filtered.filter(p =>
            p.codigo.toLowerCase().includes(searchTerm)
        );
    }

    if (descricao) {
        const searchTerm = descricao.toLowerCase();
        filtered = filtered.filter(p =>
            p.descricao.toLowerCase().includes(searchTerm)
        );
    }

    displayPostes(filtered);
}

function updateResumo() {
    const postes = postesData.postes;

    const total = postes.length;
    const ativos = postes.filter(p => p.ativo).length;
    const inativos = total - ativos;
    const precoMedio = total > 0 ?
        postes.reduce((sum, p) => sum + (p.preco || 0), 0) / total : 0;

    window.AppUtils.updateElement('total-postes', total);
    window.AppUtils.updateElement('postes-ativos', ativos);
    window.AppUtils.updateElement('postes-inativos', inativos);
    window.AppUtils.updateElement('preco-medio', window.AppUtils.formatCurrency(precoMedio));
}

function resetForm() {
    document.getElementById('poste-form').reset();
}

function scrollToForm() {
    const form = document.getElementById('poste-form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }
}

function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    document.getElementById('filtro-descricao').value = '';

    postesData.filters = { status: '', codigo: '', descricao: '' };
    applyFilters();
    window.AppUtils.showAlert('Filtros limpos', 'success');
}

async function exportarPostes() {
    if (!postesData.postes || postesData.postes.length === 0) {
        window.AppUtils.showAlert('Nenhum poste para exportar', 'warning');
        return;
    }

    const dadosExportar = postesData.postes.map(poste => ({
        'Código': poste.codigo,
        'Descrição': poste.descricao,
        'Preço': poste.preco,
        'Status': poste.ativo ? 'Ativo' : 'Inativo'
    }));

    window.AppUtils.exportToCSV(dadosExportar, `postes_branco_${new Date().toISOString().split('T')[0]}`);
}

async function loadPostes() {
    try {
        window.AppUtils.clearCache();
        await loadData();
        window.AppUtils.showAlert('Dados atualizados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar postes:', error);
        window.AppUtils.showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

// Disponibilizar funções globalmente
window.editPoste = editPoste;
window.togglePosteStatus = togglePosteStatus;
window.limparFiltros = limparFiltros;
window.exportarPostes = exportarPostes;
window.loadPostes = loadPostes;
window.scrollToForm = scrollToForm;
window.closeModal = () => window.AppUtils.closeModal('edit-modal');

console.log('✅ Postes Caminhão Branco carregado');