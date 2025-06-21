// Postes JavaScript Mobile-First - Versão Refatorada
const API_BASE = 'http://localhost:8080/api';

// Estado global simplificado
const state = {
    postes: [],
    currentEditId: null,
    filters: { status: '', codigo: '', descricao: '' }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Postes Mobile...');
    
    try {
        configurarEventos();
        await carregarDados();
        console.log('✅ Postes carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        showAlert('Erro ao carregar dados', 'error');
    }
});

// Configuração de eventos
function configurarEventos() {
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
    setupFilters();
}

function setupFilters() {
    const filters = {
        'filtro-status': 'status',
        'filtro-codigo': 'codigo',
        'filtro-descricao': 'descricao'
    };
    
    Object.entries(filters).forEach(([elementId, filterKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('input', debounce(() => {
                state.filters[filterKey] = element.value;
                applyFilters();
            }, 300));
        }
    });
}

// Carregamento de dados
async function carregarDados() {
    try {
        showLoading(true);
        
        const postes = await fetchPostes();
        state.postes = postes;
        
        updateResumo();
        applyFilters();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

// API calls
async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
}

async function fetchPostes() {
    return await apiRequest('/postes');
}

// Manipulação do formulário
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        showAlert('Poste criado com sucesso!', 'success');
        resetForm();
        await carregarDados();
        
    } catch (error) {
        console.error('Erro ao criar poste:', error);
        showAlert('Erro ao criar poste', 'error');
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
    if (!data.codigo || data.codigo.length < 1) {
        showAlert('Código é obrigatório', 'warning');
        return false;
    }
    
    if (!data.descricao || data.descricao.length < 3) {
        showAlert('Descrição deve ter pelo menos 3 caracteres', 'warning');
        return false;
    }
    
    if (!data.preco || data.preco <= 0) {
        showAlert('Preço deve ser maior que zero', 'warning');
        return false;
    }
    
    // Verificar código duplicado
    const codigoExistente = state.postes.find(p => 
        p.codigo.toLowerCase() === data.codigo.toLowerCase() && 
        (!state.currentEditId || p.id !== state.currentEditId)
    );
    
    if (codigoExistente) {
        showAlert('Código já existe', 'warning');
        return false;
    }
    
    return true;
}

// Display postes
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

// CRUD operations
async function editPoste(id) {
    try {
        const poste = state.postes.find(p => p.id === id);
        if (!poste) {
            throw new Error('Poste não encontrado');
        }
        
        populateEditForm(poste);
        state.currentEditId = id;
        showModal();
        
    } catch (error) {
        console.error('Erro ao carregar poste para edição:', error);
        showAlert('Erro ao carregar dados do poste', 'error');
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
        
        await apiRequest(`/postes/${state.currentEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        showAlert('Poste atualizado com sucesso!', 'success');
        closeModal();
        await carregarDados();
        
    } catch (error) {
        console.error('Erro ao atualizar poste:', error);
        showAlert('Erro ao atualizar poste', 'error');
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
        const poste = state.postes.find(p => p.id === id);
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...poste, ativo: novoStatus })
        });
        
        showAlert(`Poste ${acao}do com sucesso!`, 'success');
        await carregarDados();
        
    } catch (error) {
        console.error('Erro ao alterar status do poste:', error);
        showAlert('Erro ao alterar status do poste', 'error');
    } finally {
        showLoading(false);
    }
}

// Filtros e resumo
function applyFilters() {
    const { status, codigo, descricao } = state.filters;
    
    let filtered = [...state.postes];
    
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
    const postes = state.postes;
    
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

// Utilitários
function resetForm() {
    document.getElementById('poste-form').reset();
}

function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    state.filters = { status: '', codigo: '', descricao: '' };
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

function scrollToForm() {
    const form = document.getElementById('poste-form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }
}

async function exportarPostes() {
    if (!state.postes || state.postes.length === 0) {
        showAlert('Nenhum poste para exportar', 'warning');
        return;
    }
    
    const dadosExportar = state.postes.map(poste => ({
        'Código': poste.codigo,
        'Descrição': poste.descricao,
        'Preço': poste.preco,
        'Status': poste.ativo ? 'Ativo' : 'Inativo'
    }));
    
    exportToCSV(dadosExportar, `postes_${new Date().toISOString().split('T')[0]}`);
}

async function loadPostes() {
    await carregarDados();
    showAlert('Dados atualizados!', 'success');
}

// Modal functions
function showModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.style.display = 'flex';
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }
}

function closeModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.style.display = 'none';
    state.currentEditId = null;
}

// Formatters
function formatCurrency(value) {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Helper functions
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value.toString();
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = show ? 'flex' : 'none';
}

function showAlert(message, type = 'success', duration = 3000) {
    const container = document.getElementById('alert-container');
    if (!container) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) alert.remove();
    }, duration);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showAlert('Nenhum dado para exportar', 'warning');
        return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                let value = row[header] || '';
                if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${filename}.csv`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    showAlert('Dados exportados com sucesso!', 'success');
}

console.log('✅ Postes Mobile carregado');