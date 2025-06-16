// Postes JavaScript - VERSÃO REFATORADA
const CONFIG = {
    API_BASE: 'http://localhost:8080/api'
};

// Estado global
let postesData = {
    postes: [],
    filteredPostes: [],
    currentEditId: null,
    filters: {
        status: '',
        codigo: '',
        descricao: ''
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando página de Postes...');
    
    try {
        await loadPostes();
        await loadEstatisticas();
        setupEventListeners();
        setupFilters();
        
        console.log('✅ Página de Postes carregada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar página de Postes:', error);
        showAlert('Erro ao carregar dados de postes', 'error');
    }
});

function setupEventListeners() {
    const posteForm = document.getElementById('poste-form');
    if (posteForm) {
        posteForm.addEventListener('submit', handlePosteSubmit);
    }
    
    const editForm = document.getElementById('edit-poste-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
}

function setupFilters() {
    const filterElements = {
        'filtro-status': 'status',
        'filtro-codigo': 'codigo',
        'filtro-descricao': 'descricao'
    };
    
    Object.entries(filterElements).forEach(([elementId, filterKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('input', debounce(() => {
                postesData.filters[filterKey] = element.value;
                applyFilters();
            }, 300));
        }
    });
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
        filtered = filtered.filter(p => p.codigo.toLowerCase().includes(searchTerm));
    }
    
    if (descricao) {
        const searchTerm = descricao.toLowerCase();
        filtered = filtered.filter(p => p.descricao.toLowerCase().includes(searchTerm));
    }
    
    postesData.filteredPostes = filtered;
    displayPostes(filtered);
}

// Funções de API
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro na requisição ${endpoint}:`, error);
        throw error;
    }
}

async function loadPostes() {
    try {
        showLoading(true);
        const postes = await apiRequest('/postes');
        postesData.postes = postes;
        postesData.filteredPostes = [...postes];
        displayPostes(postes);
    } catch (error) {
        console.error('Erro ao carregar postes:', error);
        displayPostesError();
    } finally {
        showLoading(false);
    }
}

async function loadEstatisticas() {
    try {
        const postes = postesData.postes;
        const ativo = postes.filter(p => p.ativo).length;
        const total = postes.length;
        const precoMedio = postes.length > 0 ? 
            postes.reduce((sum, p) => sum + (p.preco || 0), 0) / postes.length : 0;
        
        updateEstatisticasCards({
            total,
            ativo,
            precoMedio
        });
        
    } catch (error) {
        console.error('Erro ao calcular estatísticas:', error);
    }
}

function updateEstatisticasCards(stats) {
    const elements = {
        'total-postes': stats.total.toString(),
        'postes-ativos': stats.ativo.toString(),
        'preco-medio': formatCurrency(stats.precoMedio)
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function displayPostes(postes) {
    const tbody = document.querySelector('#postes-table tbody');
    if (!tbody) return;
    
    if (!postes || postes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table">
                    <div class="empty-table-icon">⚡</div>
                    <p>Nenhum poste encontrado</p>
                    <button class="btn btn-primary" onclick="scrollToForm()">Cadastrar Primeiro Poste</button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    postes.forEach(poste => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Código"><strong>${poste.codigo}</strong></td>
            <td data-label="Descrição">
                <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;" title="${poste.descricao}">
                    ${poste.descricao}
                </div>
            </td>
            <td class="currency" data-label="Preço">${formatCurrency(poste.preco)}</td>
            <td data-label="Status">
                <span class="status ${poste.ativo ? 'ativo' : 'inativo'}">
                    ${poste.ativo ? '✅ Ativo' : '❌ Inativo'}
                </span>
            </td>
            <td data-label="Ações">
                <div class="table-actions">
                    <button class="btn btn-primary btn-small" onclick="editPoste(${poste.id})" title="Editar">
                        <span class="btn-icon">✏️</span>
                        Editar
                    </button>
                    <button class="btn ${poste.ativo ? 'btn-secondary' : 'btn-success'} btn-small" 
                            onclick="togglePosteStatus(${poste.id})" 
                            title="${poste.ativo ? 'Inativar' : 'Ativar'}">
                        <span class="btn-icon">${poste.ativo ? '❌' : '✅'}</span>
                        ${poste.ativo ? 'Inativar' : 'Ativar'}
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function displayPostesError() {
    const tbody = document.querySelector('#postes-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table">
                    <div class="empty-table-icon">❌</div>
                    <p>Erro ao carregar postes</p>
                    <button class="btn btn-secondary" onclick="loadPostes()">Tentar Novamente</button>
                </td>
            </tr>
        `;
    }
}

async function handlePosteSubmit(e) {
    e.preventDefault();
    
    const formData = {
        codigo: document.getElementById('poste-codigo').value.trim(),
        descricao: document.getElementById('poste-descricao').value.trim(),
        preco: parseFloat(document.getElementById('poste-preco').value),
        ativo: true
    };
    
    const erros = validarPoste(formData);
    if (erros.length > 0) {
        showAlert(erros.join(', '), 'warning');
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest('/postes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        showAlert('Poste criado com sucesso!', 'success');
        
        e.target.reset();
        
        await loadPostes();
        await loadEstatisticas();
        
    } catch (error) {
        console.error('Erro ao criar poste:', error);
        showAlert('Erro ao criar poste', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    const formData = {
        codigo: document.getElementById('edit-poste-codigo').value.trim(),
        descricao: document.getElementById('edit-poste-descricao').value.trim(),
        preco: parseFloat(document.getElementById('edit-poste-preco').value),
        ativo: document.getElementById('edit-poste-ativo').value === 'true'
    };
    
    const erros = validarPoste(formData);
    if (erros.length > 0) {
        showAlert(erros.join(', '), 'warning');
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest(`/postes/${postesData.currentEditId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        showAlert('Poste atualizado com sucesso!', 'success');
        
        closeModal('edit-poste-modal');
        
        await loadPostes();
        await loadEstatisticas();
        
    } catch (error) {
        console.error('Erro ao atualizar poste:', error);
        showAlert('Erro ao atualizar poste', 'error');
    } finally {
        showLoading(false);
    }
}

async function editPoste(id) {
    try {
        const poste = postesData.postes.find(p => p.id === id);
        
        if (!poste) {
            throw new Error('Poste não encontrado');
        }
        
        document.getElementById('edit-poste-codigo').value = poste.codigo;
        document.getElementById('edit-poste-descricao').value = poste.descricao;
        document.getElementById('edit-poste-preco').value = poste.preco;
        document.getElementById('edit-poste-ativo').value = poste.ativo.toString();
        
        postesData.currentEditId = id;
        document.getElementById('edit-poste-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar poste para edição:', error);
        showAlert('Erro ao carregar dados do poste', 'error');
    }
}

async function togglePosteStatus(id) {
    try {
        const poste = postesData.postes.find(p => p.id === id);
        if (!poste) {
            throw new Error('Poste não encontrado');
        }
        
        const novoStatus = !poste.ativo;
        const acao = novoStatus ? 'ativar' : 'inativar';
        
        const confirmed = await confirm(
            `Tem certeza que deseja ${acao} este poste?`
        );
        
        if (!confirmed) return;
        
        showLoading(true);
        await apiRequest(`/postes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...poste, ativo: novoStatus })
        });
        
        showAlert(`Poste ${acao}do com sucesso!`, 'success');
        
        await loadPostes();
        await loadEstatisticas();
        
    } catch (error) {
        console.error('Erro ao alterar status do poste:', error);
        showAlert('Erro ao alterar status do poste', 'error');
    } finally {
        showLoading(false);
    }
}

function validarPoste(dados) {
    const erros = [];
    
    if (!dados.codigo || dados.codigo.trim().length < 1) {
        erros.push('Código é obrigatório');
    }
    
    if (!dados.descricao || dados.descricao.trim().length < 3) {
        erros.push('Descrição deve ter pelo menos 3 caracteres');
    }
    
    if (!dados.preco || dados.preco <= 0) {
        erros.push('Preço deve ser maior que zero');
    }
    
    if (!postesData.currentEditId) {
        const codigoExistente = postesData.postes.find(p => 
            p.codigo.toLowerCase() === dados.codigo.toLowerCase()
        );
        if (codigoExistente) {
            erros.push('Código já existe');
        }
    }
    
    return erros;
}

function exportarPostes() {
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

function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    postesData.filters = {
        status: '',
        codigo: '',
        descricao: ''
    };
    
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

function scrollToForm() {
    const form = document.getElementById('poste-form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }
}

// Utilitários
function formatCurrency(value) {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
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
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, duration);
    
    console.log(`📢 Alerta: ${message} (${type})`);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
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

console.log('✅ Postes refatorado carregado');