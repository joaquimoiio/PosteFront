// Funções utilitárias globais
const Utils = {
    
    // Formatação de números
    formatNumber(value, decimals = 0) {
        if (value == null || isNaN(value)) return '0';
        return Number(value).toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    // Formatação de moeda
    formatCurrency(value) {
        if (value == null || isNaN(value)) return 'R$ 0,00';
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    // Formatação de percentual
    formatPercent(value) {
        if (value == null || isNaN(value)) return '0%';
        return (value * 100).toFixed(1) + '%';
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

    // LÓGICA DE CÁLCULO DE LUCROS - CORRIGIDA
    calcularLucros(resumoBasico, despesas) {
        console.log('🔢 Iniciando cálculo de lucros no frontend...');
        console.log('Dados recebidos:', { resumoBasico, despesas });

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

        console.log('Despesas calculadas:', { despesasFuncionario, outrasDespesas });

        // LÓGICA PRINCIPAL DE CÁLCULO:
        // 1. Lucro das vendas normais (V): Valor vendido - Custo dos postes
        const lucroVendasNormais = parseFloat(valorTotalVendas) - parseFloat(totalVendaPostes);
        console.log('Lucro vendas normais (V):', lucroVendasNormais);

        // 2. Somar todas as contribuições extras (E + Frete L)
        const totalContribuicoesExtras = parseFloat(valorTotalExtras) + parseFloat(totalFreteEletrons);
        console.log('Total contribuições extras (E + Frete L):', totalContribuicoesExtras);

        // 3. Lucro bruto = Lucro vendas normais + Contribuições extras - Outras despesas
        const lucroBruto = lucroVendasNormais + totalContribuicoesExtras - outrasDespesas;
        console.log('Lucro bruto (antes de despesas funcionário):', lucroBruto);

        // 4. Divisão inicial: 50% para cada lado
        const metadeCicero = lucroBruto / 2;
        const metadeGuilhermeJefferson = lucroBruto / 2;
        
        console.log('Divisão 50/50:', { metadeCicero, metadeGuilhermeJefferson });

        // 5. Da parte do Guilherme e Jefferson, descontar despesas de funcionário
        const parteGuilhermeJeffersonLiquida = metadeGuilhermeJefferson - despesasFuncionario;
        
        console.log('Parte G&J após despesas funcionário:', parteGuilhermeJeffersonLiquida);

        // 6. Dividir entre Guilherme e Jefferson (25% cada do total)
        const parteGuilherme = parteGuilhermeJeffersonLiquida / 2;
        const parteJefferson = parteGuilhermeJeffersonLiquida / 2;

        // 7. Lucro total final considerando todas as despesas
        const lucroTotal = lucroBruto - despesasFuncionario;

        const resultado = {
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
            
            // Valores por tipo (apenas E e L agora)
            valorTotalExtras: parseFloat(valorTotalExtras) || 0,
            totalFreteEletrons: parseFloat(totalFreteEletrons) || 0,
            
            // Detalhes para debug
            detalhes: {
                metadeCicero,
                metadeGuilhermeJefferson,
                parteGuilhermeJeffersonLiquida,
                calculoCorreto: `
                NOVA LÓGICA:
                - Tipo E (Extra): Contribui diretamente para o lucro
                - Tipo V (Venda Normal): Valor vendido - Custo do poste (SEM frete)
                - Tipo L (Venda Loja): Apenas o frete contribui para o lucro
                
                Exemplo: 
                Venda V: R$ 1.800 vendido, custo R$ 800 = R$ 1.000 lucro
                Extra E: R$ 200
                Frete L: R$ 150
                Outras despesas: R$ 50
                Despesa funcionário: R$ 100
                
                Cálculo:
                Lucro bruto: 1.000 + 200 + 150 - 50 = R$ 1.300
                Divisão 50/50: Cícero R$ 650, G&J R$ 650
                G&J - despesa funcionário: R$ 650 - R$ 100 = R$ 550
                Guilherme: R$ 275, Jefferson: R$ 275
                Lucro total: R$ 1.200
                `
            }
        };

        console.log('✅ Resultado final do cálculo:', resultado);
        return resultado;
    },

    // Validação de email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validação de CPF
    isValidCPF(cpf) {
        const cleanCPF = cpf.replace(/\D/g, '');
        if (cleanCPF.length !== 11) return false;
        
        // Verificar se todos os dígitos são iguais
        if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
        
        // Validar dígitos verificadores
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanCPF[i]) * (10 - i);
        }
        let remainder = sum % 11;
        let digit1 = remainder < 2 ? 0 : 11 - remainder;
        
        if (parseInt(cleanCPF[9]) !== digit1) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCPF[i]) * (11 - i);
        }
        remainder = sum % 11;
        let digit2 = remainder < 2 ? 0 : 11 - remainder;
        
        return parseInt(cleanCPF[10]) === digit2;
    },

    // Formatação de CPF
    formatCPF(cpf) {
        const cleanCPF = cpf.replace(/\D/g, '');
        return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },

    // Formatação de telefone
    formatPhone(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 11) {
            return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleanPhone.length === 10) {
            return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    },

    // Limpar texto
    sanitizeText(text) {
        if (!text) return '';
        return text.toString().trim().replace(/\s+/g, ' ');
    },

    // Capitalizar primeira letra
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // Capitalizar todas as palavras
    capitalizeWords(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    },

    // Gerar ID único
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Delay/sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Copiar texto para clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showAlert('Texto copiado para a área de transferência!', 'success');
            return true;
        } catch (err) {
            console.error('Erro ao copiar texto:', err);
            showAlert('Erro ao copiar texto', 'error');
            return false;
        }
    },

    // Download de arquivo
    downloadFile(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    // Exportar dados para CSV
    exportToCSV(data, filename) {
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
                    // Escapar aspas
                    if (typeof value === 'string' && value.includes(',')) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        this.downloadFile(csv, `${filename}.csv`, 'text/csv');
        showAlert('Dados exportados com sucesso!', 'success');
    },

    // Validar formulário
    validateForm(formElement) {
        const errors = [];
        const requiredFields = formElement.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            const value = field.value.trim();
            const fieldName = field.getAttribute('name') || field.id;
            
            if (!value) {
                errors.push(`${fieldName} é obrigatório`);
                field.classList.add('error');
            } else {
                field.classList.remove('error');
                
                // Validações específicas
                if (field.type === 'email' && !this.isValidEmail(value)) {
                    errors.push(`${fieldName} deve ser um email válido`);
                    field.classList.add('error');
                }
                
                if (field.dataset.validation === 'cpf' && !this.isValidCPF(value)) {
                    errors.push(`${fieldName} deve ser um CPF válido`);
                    field.classList.add('error');
                }
            }
        });

        return errors;
    },

    // Máscara para inputs
    applyMask(input, mask) {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            let maskedValue = '';
            let valueIndex = 0;

            for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
                if (mask[i] === '9') {
                    maskedValue += value[valueIndex];
                    valueIndex++;
                } else {
                    maskedValue += mask[i];
                }
            }

            e.target.value = maskedValue;
        });
    },

    // Confirmar ação
    async confirm(message, title = 'Confirmação') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div style="padding: 20px 30px;">
                        <p>${message}</p>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="cancel-btn">Cancelar</button>
                        <button class="btn btn-danger" id="confirm-btn">Confirmar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const cancelBtn = modal.querySelector('#cancel-btn');
            const confirmBtn = modal.querySelector('#confirm-btn');
            
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
            
            confirmBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });
            
            // Fechar com ESC
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(modal);
                    document.removeEventListener('keydown', handleEsc);
                    resolve(false);
                }
            };
            
            document.addEventListener('keydown', handleEsc);
        });
    },

    // Debounce
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

    // Throttle
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Scroll suave
    smoothScrollTo(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    },

    // Detectar dispositivo móvel
    isMobile() {
        return window.innerWidth <= 768;
    },

    // Observar mudanças de tamanho
    onResize(callback) {
        const debouncedCallback = this.debounce(callback, 250);
        window.addEventListener('resize', debouncedCallback);
        return () => window.removeEventListener('resize', debouncedCallback);
    }
};

// Extensões para elementos DOM
HTMLElement.prototype.show = function() {
    this.style.display = 'block';
    return this;
};

HTMLElement.prototype.hide = function() {
    this.style.display = 'none';
    return this;
};

HTMLElement.prototype.toggle = function() {
    this.style.display = this.style.display === 'none' ? 'block' : 'none';
    return this;
};

// Exportar para uso global
window.Utils = Utils;