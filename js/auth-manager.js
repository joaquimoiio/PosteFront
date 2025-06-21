// Auth Manager - Sistema de Autenticação
// Este arquivo deve ser incluído em todas as páginas protegidas

class AuthManager {
    constructor() {
        this.storageKeys = {
            loggedIn: 'poste-system-logged-in',
            loginTime: 'poste-system-login-time',
            username: 'poste-system-username',
            remember: 'poste-system-remember'
        };
        
        // Sessão expira em 8 horas (em milissegundos)
        this.sessionTimeout = 8 * 60 * 60 * 1000;
        
        this.init();
    }
    
    init() {
        // Verificar se está em uma página protegida
        if (this.isProtectedPage()) {
            this.checkAuthentication();
            this.setupLogoutButton();
            this.startSessionMonitoring();
        }
        
        console.log('🔐 Auth Manager inicializado');
    }
    
    isProtectedPage() {
        const currentPage = window.location.pathname.split('/').pop();
        const protectedPages = [
            'dashboard.html',
            'vendas.html', 
            'despesas.html',
            'postes.html',
            'estoque.html',
            'relatorios.html'
        ];
        
        return protectedPages.includes(currentPage) || currentPage === '';
    }
    
    checkAuthentication() {
        const isLoggedIn = this.getStorageItem(this.storageKeys.loggedIn);
        const loginTime = this.getStorageItem(this.storageKeys.loginTime);
        
        if (!isLoggedIn || isLoggedIn !== 'true') {
            this.redirectToLogin();
            return false;
        }
        
        // Verificar se a sessão expirou
        if (loginTime && this.isSessionExpired(loginTime)) {
            this.logout('Sessão expirada. Faça login novamente.');
            return false;
        }
        
        // Atualizar tempo de atividade
        this.updateLastActivity();
        
        return true;
    }
    
    isSessionExpired(loginTime) {
        const now = new Date().getTime();
        const loginTimestamp = new Date(loginTime).getTime();
        return (now - loginTimestamp) > this.sessionTimeout;
    }
    
    updateLastActivity() {
        // Atualizar timestamp de última atividade
        this.setStorageItem('poste-system-last-activity', new Date().toISOString());
    }
    
    setupLogoutButton() {
        // Adicionar botão de logout ao theme toggle se não existir
        this.createLogoutButton();
        
        // Listeners para atividade do usuário
        this.setupActivityListeners();
    }
    
    createLogoutButton() {
        // Verificar se já existe
        if (document.getElementById('logout-button')) return;
        
        const logoutButton = document.createElement('button');
        logoutButton.id = 'logout-button';
        logoutButton.className = 'logout-button';
        logoutButton.innerHTML = '🚪';
        logoutButton.setAttribute('aria-label', 'Sair do sistema');
        logoutButton.setAttribute('title', 'Sair do sistema');
        logoutButton.addEventListener('click', () => this.logout());
        
        // Inserir no DOM próximo ao theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.parentNode.insertBefore(logoutButton, themeToggle.nextSibling);
        } else {
            document.body.appendChild(logoutButton);
        }
        
        // Adicionar estilos
        this.addLogoutButtonStyles();
    }
    
    addLogoutButtonStyles() {
        // Verificar se os estilos já foram adicionados
        if (document.getElementById('logout-button-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'logout-button-styles';
        style.textContent = `
            .logout-button {
                position: fixed;
                top: var(--space-4);
                right: calc(var(--space-4) + 60px);
                z-index: 1000;
                background: var(--danger);
                border: 1px solid var(--border-primary);
                border-radius: 50%;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 1.2rem;
                transition: all var(--transition-normal);
                box-shadow: var(--shadow-primary);
                color: white;
            }
            
            .logout-button:hover {
                background: #dc2626;
                transform: scale(1.05);
            }
            
            .logout-button:active {
                transform: scale(0.95);
            }
            
            @media (min-width: 768px) {
                .logout-button {
                    top: var(--space-6);
                    right: calc(var(--space-6) + 60px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupActivityListeners() {
        // Eventos que indicam atividade do usuário
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
    }
    
    startSessionMonitoring() {
        // Verificar sessão a cada minuto
        setInterval(() => {
            this.checkSessionValidity();
        }, 60000);
        
        // Verificar quando a aba volta ao foco
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkSessionValidity();
            }
        });
    }
    
    checkSessionValidity() {
        const loginTime = this.getStorageItem(this.storageKeys.loginTime);
        
        if (loginTime && this.isSessionExpired(loginTime)) {
            this.logout('Sua sessão expirou por inatividade.');
        }
    }
    
    logout(message = null) {
        // Limpar dados de autenticação (manter remember se estava marcado)
        const shouldRemember = this.getStorageItem(this.storageKeys.remember) === 'true';
        const savedUsername = this.getStorageItem(this.storageKeys.username);
        
        // Limpar dados de sessão
        this.removeStorageItem(this.storageKeys.loggedIn);
        this.removeStorageItem(this.storageKeys.loginTime);
        this.removeStorageItem('poste-system-last-activity');
        
        // Manter dados de "lembrar-me" se necessário
        if (!shouldRemember) {
            this.removeStorageItem(this.storageKeys.remember);
            this.removeStorageItem(this.storageKeys.username);
        }
        
        // Mostrar mensagem se fornecida
        if (message) {
            this.showLogoutMessage(message);
        }
        
        // Redirecionar para login
        setTimeout(() => {
            this.redirectToLogin();
        }, message ? 2000 : 0);
    }
    
    showLogoutMessage(message) {
        // Criar overlay de mensagem
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
        `;
        
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            max-width: 400px;
            margin: 1rem;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border-primary);
        `;
        
        messageBox.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 1rem;">🔐</div>
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Sessão Encerrada</h3>
            <p style="color: var(--text-secondary);">${message}</p>
        `;
        
        overlay.appendChild(messageBox);
        document.body.appendChild(overlay);
    }
    
    redirectToLogin() {
        window.location.href = 'index.html';
    }
    
    // Métodos utilitários para localStorage
    getStorageItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn('Erro ao acessar localStorage:', error);
            return null;
        }
    }
    
    setStorageItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn('Erro ao salvar no localStorage:', error);
        }
    }
    
    removeStorageItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('Erro ao remover do localStorage:', error);
        }
    }
    
    // Métodos públicos para uso em outros scripts
    getUserInfo() {
        return {
            username: this.getStorageItem(this.storageKeys.username),
            loginTime: this.getStorageItem(this.storageKeys.loginTime),
            isLoggedIn: this.getStorageItem(this.storageKeys.loggedIn) === 'true'
        };
    }
    
    isAuthenticated() {
        return this.checkAuthentication();
    }
    
    forceLogout() {
        this.logout();
    }
    
    extendSession() {
        // Estender sessão por mais 8 horas
        this.setStorageItem(this.storageKeys.loginTime, new Date().toISOString());
        this.updateLastActivity();
    }
}

// Inicializar automaticamente quando DOM estiver pronto
let authManager;

function initAuthManager() {
    if (!authManager) {
        authManager = new AuthManager();
        
        // Tornar disponível globalmente para debug
        window.authManager = authManager;
    }
}

// Inicializar imediatamente se DOM já estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthManager);
} else {
    initAuthManager();
}

// Exportar para uso em módulos (se necessário)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}

// Event listeners para outros scripts
window.addEventListener('authStatusChanged', (event) => {
    console.log('🔐 Status de autenticação alterado:', event.detail);
});

console.log('🔐 Auth Manager script carregado');