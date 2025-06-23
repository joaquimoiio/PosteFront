// Postes JavaScript - Versão Leve
// Utiliza AppUtils para funcionalidades compartilhadas

const { 
    apiRequest, clearCache, formatCurrency, updateElement, showLoading, showAlert,
    setupFilters, validateRequired, validateNumber, exportToCSV,
    showModal, closeModal
} = window.AppUtils;

// Estado local
let postesData = {
    postes: [],
    currentEditId: null,
    filters: { status: '', codigo: '', descricao: '' }
};

// ================================
// INICIALIZAÇÃO
// ================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Postes...');
    
    try {
        setupEventListeners();
        await loadData();
        console.log('✅ Postes carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
});

// ================================
// EVENT LISTENERS
// ================================
function setupEventListeners() {
    // Form principal
    const posteForm = document.getElementById('poste-form');
    if (posteForm) {
        posteForm.addEventListener('submit', handlePosteSubmit);
        posteForm.addEventListener('reset', resetForm);
    }
    
    // Form de edição
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
    
    // Filtros
    setupFilters({
        'filtro-status': 'status',
        'filtro-codigo': 'codigo',
        'filtro-descricao': 'descricao'
    }, applyFilters);
}

// ================================
// CARREGAMENTO DE DADOS
// ================================
async function loadData() {
    try {
        showLoading(true);
        
        const postes = await fetchPostes();
        postesData.postes = postes || [];
        
        updateResumo();
        applyFilters();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

async function fetchPostes() {
    return await apiRequest('/postes');
}

// ================================
// MANIPULAÇÃO DO FORMULÁRIO
// ================================
async function handlePosteSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        showLoading(true);
        
        await apiRequest('/postes', {
            method: 'POST',
            body: JSON.stringify(formData),
            skipCache: true
        });
        
        showAlert('Poste criado com sucesso!', 'success');
        resetForm();
        
        clearCache();
        await loadData();
        
    } catch (error) {
        console.error('Erro ao criar poste:', error);
        showAlert('Erro ao criar poste: ' + error.message, 'error');
    } finally {
        showLoading(false);
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
    if (!validateRequired(data.codigo, 'Código') ||
        !validateRequired(data.descricao, 'Descrição')) {
        return false;
    }
    
    if (data.descricao.length < 3) {
        showAlert('Descrição deve ter pelo menos 3 caracteres', 'warning');
        return false;
    }
    
    if (!validateNumber(data.preco, 'Preço', 0)) {
        return false;
    }
    
    // Verificar código duplicado
    const codigoExistente = postesData.postes.find(p => 
        p.codigo.toLowerCase() === data.codigo.toLowerCase() && 
        (!postesData.currentEditId || p.id !== postesData.currentEditId)
    );
    
    if (codigoExistente) {
        showAlert('Código já existe', 'warning');
        return false;
    }
    
    return true;
}

// ================================
// DISPLAY POSTES
// ================================
function displayPostes(postes) {
    const container = document.getElementById('postes-list');
    if (!container) return;
    
    if (!postes || postes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚡</div>
                <h3>Nenhum poste encontrado</h3>
                <p>Comece cadastrando seu primeiro poste.</p>
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
            <div class="item-price">${formatCurrency(poste.preco)}</div>
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

// ================================
// CRUD OPERATIONS
// ================================
async function editPoste(id) {
    try {
        const poste = postesData.postes.find(p => p.id === id);
        if (!poste) {
            throw new Error('Poste não encontrado');
        }
        
        populateEditForm(poste);
        postesData.currentEditId = id;
        showModal('edit-modal');
        
    } catch (error) {
        console.error('Erro ao carregar poste para edição:', error);
        showAlert('Erro ao carregar dados do poste: ' + error.message, 'error');
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
        
        showLoading(true);
        
        await apiRequest(`/postes/${postesData.currentEditId}`, {
            method: 'PUT',
            body: JSON.stringify(formData),
            skipCache: true
        });
        
        showAlert('Poste atualizado com sucesso!', 'success');
        closeModal('edit-modal');
        
        clearCache();
        await loadData();
        
    } catch (error) {
        console.error('Erro ao atualizar poste:', error);
        showAlert('Erro ao atualizar poste: ' + error.message, 'error');
    } finally {
        showLoading(false);
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
        
        showLoading(true);
        
        await apiRequest(`/postes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...poste, ativo: novoStatus }),
            skipCache: true
        });
        
        showAlert(`Poste ${acao}do com sucesso!`, 'success');
        
        clearCache();
        await loadData();
        
    } catch (error) {
        console.error('Erro ao alterar status do poste:', error);
        showAlert('Erro ao alterar status do poste: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ================================
// FILTROS E RESUMO
// ================================
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
    
    updateElement('total-postes', total);
    updateElement('postes-ativos', ativos);
    updateElement('postes-inativos', inativos);
    updateElement('preco-medio', formatCurrency(precoMedio));
}

// ================================
// HELPER FUNCTIONS
// ================================
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

// ================================
// FUNÇÕES GLOBAIS
// ================================
function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    postesData.filters = { status: '', codigo: '', descricao: '' };
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

async function exportarPostes() {
    if (!postesData.postes || postesData.postes.length === 0) {
        showAlert('Nenhum poste para exportar', 'warning');
        return;
    }
    
    const dadosExportar = postesData.postes.map(poste => ({
        'Código': poste.codigo,
        'Descrição': poste.descricao,
        'Preço': poste.preco,
        'Status': poste.ativo ? 'Ativo' : 'Inativo'
    }));
    
    exportToCSV(dadosExportar, `postes_${new Date().toISOString().split('T')[0]}`);
}

async function loadPostes() {
    try {
        clearCache();
        await loadData();
        showAlert('Dados atualizados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar postes:', error);
        showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

// Disponibilizar funções globalmente
window.editPoste = editPoste;
window.togglePosteStatus = togglePosteStatus;
window.limparFiltros = limparFiltros;
window.exportarPostes = exportarPostes;
window.loadPostes = loadPostes;
window.scrollToForm = scrollToForm;
window.closeModal = () => closeModal('edit-modal');

console.log('✅ Postes leve carregado');