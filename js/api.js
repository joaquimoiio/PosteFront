// Gerenciador de API - Versão corrigida
class APIManager {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    // Método genérico para requisições
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        try {
            console.log(`🌐 ${config.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Verificar se há conteúdo para parsear
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                console.log(`✅ Resposta recebida:`, data);
                return data;
            } else {
                return await response.text();
            }
            
        } catch (error) {
            console.error(`❌ Erro na requisição ${config.method || 'GET'} ${url}:`, error);
            throw error;
        }
    }

    // Métodos HTTP
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Instância global da API
const api = new APIManager(CONFIG.API_BASE);

// Serviços específicos da API
const PosteService = {
    async getAll() {
        try {
            return await api.get('/postes');
        } catch (error) {
            console.error('Erro ao buscar postes:', error);
            return [];
        }
    },

    async getActive() {
        try {
            return await api.get('/postes/ativos');
        } catch (error) {
            console.error('Erro ao buscar postes ativos:', error);
            return [];
        }
    },

    async getById(id) {
        return api.get(`/postes/${id}`);
    },

    async create(poste) {
        return api.post('/postes', poste);
    },

    async update(id, poste) {
        return api.put(`/postes/${id}`, poste);
    },

    async delete(id) {
        return api.delete(`/postes/${id}`);
    }
};

const VendaService = {
    async getAll() {
        try {
            return await api.get('/vendas');
        } catch (error) {
            console.error('Erro ao buscar vendas:', error);
            return [];
        }
    },

    async getById(id) {
        return api.get(`/vendas/${id}`);
    },

    async getResumo() {
        try {
            const resumo = await api.get('/vendas/resumo');
            console.log('📊 Resumo recebido:', resumo);
            return resumo || {};
        } catch (error) {
            console.error('Erro ao buscar resumo:', error);
            // Retornar estrutura padrão em caso de erro
            return {
                totalVendaPostes: 0,
                totalFreteEletrons: 0,
                valorTotalVendas: 0,
                valorTotalExtras: 0,
                totalVendasE: 0,
                totalVendasV: 0,
                totalVendasL: 0
            };
        }
    },

    async create(venda) {
        return api.post('/vendas', venda);
    },

    async update(id, venda) {
        return api.put(`/vendas/${id}`, venda);
    },

    async delete(id) {
        return api.delete(`/vendas/${id}`);
    }
};

const ItemVendaService = {
    async getAll() {
        try {
            return await api.get('/itens-venda');
        } catch (error) {
            console.error('Erro ao buscar itens de venda:', error);
            return [];
        }
    },

    async getByVenda(vendaId) {
        return api.get(`/itens-venda/venda/${vendaId}`);
    },

    async create(item) {
        return api.post('/itens-venda', item);
    },

    async update(id, item) {
        return api.put(`/itens-venda/${id}`, item);
    },

    async delete(id) {
        return api.delete(`/itens-venda/${id}`);
    }
};

const DespesaService = {
    async getAll() {
        try {
            return await api.get('/despesas');
        } catch (error) {
            console.error('Erro ao buscar despesas:', error);
            return [];
        }
    },

    async getByTipo(tipo) {
        try {
            return await api.get(`/despesas/${tipo.toLowerCase()}`);
        } catch (error) {
            console.error(`Erro ao buscar despesas do tipo ${tipo}:`, error);
            return [];
        }
    },

    async create(despesa) {
        return api.post('/despesas', despesa);
    },

    async update(id, despesa) {
        return api.put(`/despesas/${id}`, despesa);
    },

    async delete(id) {
        return api.delete(`/despesas/${id}`);
    }
};

// Funções utilitárias da API
const APIUtils = {
    // Formatação de moeda
    formatCurrency(value) {
        if (value == null || isNaN(value)) return 'R$ 0,00';
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    // Formatação de data
    formatDate(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Formatação de data simples
    formatDateSimple(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    },

    // Validação de dados
    validateRequired(data, requiredFields) {
        const errors = [];
        
        requiredFields.forEach(field => {
            if (!data[field] || data[field].toString().trim() === '') {
                errors.push(`${field} é obrigatório`);
            }
        });

        return errors;
    },

    // Debounce para evitar múltiplas requisições
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Retry para requisições falhas
    async retry(fn, maxAttempts = 3, delay = 1000) {
        let lastError;
        
        for (let i = 0; i < maxAttempts; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                console.warn(`Tentativa ${i + 1} falhou:`, error.message);
                
                if (i < maxAttempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    },

    // Verificar se o backend está disponível
    async checkBackendHealth() {
        try {
            const response = await fetch(CONFIG.API_BASE + '/postes');
            return response.ok;
        } catch (error) {
            console.warn('Backend não está disponível:', error);
            return false;
        }
    }
};

// Interceptador para tratamento de erros globais
const originalRequest = api.request.bind(api);
api.request = async function(endpoint, options = {}) {
    try {
        return await originalRequest(endpoint, options);
    } catch (error) {
        // Tratamento específico para diferentes tipos de erro
        if (error.message.includes('Failed to fetch')) {
            showAlert('Erro de conexão. Verifique se o backend está rodando.', 'error');
        } else if (error.message.includes('500')) {
            showAlert('Erro interno do servidor. Tente novamente.', 'error');
        } else if (error.message.includes('404')) {
            showAlert('Recurso não encontrado.', 'error');
        } else if (error.message.includes('400')) {
            showAlert('Dados inválidos enviados.', 'error');
        } else {
            showAlert('Erro na operação. Tente novamente.', 'error');
        }
        
        throw error;
    }
};

// Função para verificar status do backend na inicialização
async function checkBackendStatus() {
    const isHealthy = await APIUtils.checkBackendHealth();
    
    if (!isHealthy) {
        showAlert(
            'Backend não está disponível. Verifique se o servidor está rodando em ' + CONFIG.API_BASE,
            'warning'
        );
    } else {
        console.log('✅ Backend está disponível');
    }
    
    return isHealthy;
}

// Verificar status na inicialização
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkBackendStatus, 1000);
});

// Exportar serviços para uso global
window.PosteService = PosteService;
window.VendaService = VendaService;
window.ItemVendaService = ItemVendaService;
window.DespesaService = DespesaService;
window.APIUtils = APIUtils;
window.checkBackendStatus = checkBackendStatus;