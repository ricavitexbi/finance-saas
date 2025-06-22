console.log('🚀 VitexAI iniciando...');

// Variáveis globais
let supabase = null;
let currentUser = null;
let transactions = [];
let categories = {
    receita: ['Consultoria', 'Desenvolvimento', 'Licenciamento', 'Outras'],
    despesa: ['Pró-labore', 'Impostos', 'Terceiros', 'Desenvolvedores', 'Assinaturas', 'Marketing', 'Outras']
};
let charts = {};
let demoMode = false;
let lastTransactionTime = 0;
let updateDashboardTimeout = null;
let chatOpen = false;

// Definir e expor funções críticas imediatamente
function showAuthTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    if (tabName !== 'setup') {
        const tabButton = document.querySelector(`.auth-tab[onclick="showAuthTab('${tabName}')"]`);
        if (tabButton) tabButton.classList.add('active');
    }
    
    const form = document.getElementById(tabName === 'login' ? 'loginForm' : 
                                       tabName === 'register' ? 'registerForm' : 'setupForm');
    if (form) form.classList.add('active');
    
    if (tabName === 'login') {
        const emailField = document.getElementById('loginEmail');
        const passwordField = document.getElementById('loginPassword');
        
        if (emailField && emailField.value.includes('supabase.co')) {
            emailField.value = '';
        }
        if (passwordField) {
            passwordField.value = '';
        }
    }
}

// Modo demonstração
function loadDemoMode() {
    demoMode = true;
    currentUser = { email: 'demo@vitexai.com' };
    showMainApp();
    showNotification('🎮 Modo demonstração ativado!', 'info');
    setTimeout(() => importarDadosExemplo(), 500);
}

// Expor funções críticas globalmente IMEDIATAMENTE
window.showAuthTab = showAuthTab;
window.loadDemoMode = loadDemoMode;

// Aguardar Supabase carregar
function waitForSupabase(callback) {
    if (window.supabase && window.supabase.createClient) {
        console.log('✅ Supabase disponível');
        callback();
    } else {
        console.log('⏳ Aguardando Supabase carregar...');
        setTimeout(() => waitForSupabase(callback), 100);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM carregado, aguardando Supabase...');
    
    waitForSupabase(() => {
        console.log('✅ Supabase carregado!');
        
        if (!window.supabase || !window.supabase.createClient) {
            console.error('❌ Biblioteca Supabase não carregada corretamente!');
            showAuthAlert('❌ Erro ao carregar bibliotecas. Recarregue a página.', 'danger');
            return;
        }
        
        console.log('✅ Biblioteca Supabase verificada');
        initializeApp();
    });
});

// Função principal de inicialização
function initializeApp() {
    console.log('🚀 Inicializando VitexAI...');
    checkStoredCredentials();
    setupDefaults();
    setupEventListeners();
}

// Configurar event listeners
function setupEventListeners() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.onclick = loginUser;
        console.log('✅ Botão de login configurado');
    }
    
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.onclick = registerUser;
        console.log('✅ Botão de registro configurado');
    }
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                loginUser();
            }
        });
    }
}

// Verificar credenciais armazenadas
function checkStoredCredentials() {
    console.log('🔍 Verificando credenciais armazenadas...');
    
    const url = localStorage.getItem('vitexai_supabase_url');
    const key = localStorage.getItem('vitexai_supabase_key');
    
    console.log('📊 Credenciais encontradas:', { 
        hasUrl: !!url, 
        hasKey: !!key,
        urlLength: url?.length,
        keyLength: key?.length 
    });
    
    if (url && key) {
        console.log('✅ Credenciais encontradas, inicializando...');
        const setupUrlField = document.getElementById('setupSupabaseUrl');
        const setupKeyField = document.getElementById('setupSupabaseKey');
        
        if (setupUrlField) setupUrlField.value = url;
        if (setupKeyField) setupKeyField.value = key;
        
        initializeSupabase(url, key);
    } else {
        console.log('ℹ️ Nenhuma credencial encontrada, mostrando setup');
        showAuthTab('setup');
        showAuthAlert('First time? Use Demo Mode or configure Supabase with the SIMPLE structure (without user_id)', 'info');
    }
}

// Configuração inicial
function setupDefaults() {
    console.log('📅 Configurando defaults...');
    
    const today = new Date();
    const quickDate = document.getElementById('quickDate');
    if (quickDate) {
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        quickDate.value = `${year}-${month}-${day}`;
        console.log('✅ Data padrão configurada:', quickDate.value);
    } else {
        console.log('ℹ️ Campo de data não encontrado (normal na tela de login)');
    }
}

// Configurar conexão inicial
async function setupConnection() {
    const url = document.getElementById('setupSupabaseUrl').value.trim();
    const key = document.getElementById('setupSupabaseKey').value.trim();
    
    if (!url || !key) {
        showAuthAlert('❌ Preencha a URL e API Key do Supabase', 'danger');
        return;
    }
    
    try {
        showAuthAlert('🔄 Testando conexão...', 'info');
        
        const testSupabase = window.supabase.createClient(url, key);
        const { data, error } = await testSupabase.from('transactions').select('count', { count: 'exact', head: true });
        
        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('not exist')) {
                showAuthAlert('⚠️ Tabela não encontrada. Crie a tabela "transactions" no Supabase usando a estrutura SIMPLES (disponível nas Configurações)', 'warning');
            } else if (error.message.includes('user_id')) {
                showAuthAlert('⚠️ Erro de user_id detectado. Use a estrutura SIMPLES da tabela (sem user_id)', 'warning');
            } else {
                throw new Error(`Erro na conexão: ${error.message}`);
            }
        }
        
        localStorage.setItem('vitexai_supabase_url', url);
        localStorage.setItem('vitexai_supabase_key', key);
        
        initializeSupabase(url, key);
        
        if (!error) {
            showAuthAlert('✅ Conexão configurada com sucesso! Agora faça login.', 'success');
        } else {
            showAuthAlert('✅ Conexão salva! Crie a tabela no Supabase e faça login.', 'success');
        }
        
        showAuthTab('login');
        
    } catch (error) {
        console.error('Erro ao configurar:', error);
        showAuthAlert(`❌ Erro: ${error.message}`, 'danger');
    }
}

// Testar conexão manualmente
async function testConnection() {
    const url = document.getElementById('setupSupabaseUrl').value.trim();
    const key = document.getElementById('setupSupabaseKey').value.trim();
    
    if (!url || !key) {
        showAuthAlert('❌ Preencha a URL e API Key primeiro', 'danger');
        return;
    }
    
    try {
        showAuthAlert('🔄 Testando conexão detalhadamente...', 'info');
        
        console.log('Teste 1: Criando cliente Supabase...');
        const testClient = window.supabase.createClient(url, key);
        
        if (!testClient) {
            throw new Error('Falha ao criar cliente');
        }
        
        console.log('Teste 2: Verificando sistema de autenticação...');
        const { data: authData, error: authError } = await testClient.auth.getSession();
        
        if (authError) {
            console.error('Erro de autenticação:', authError);
        }
        
        console.log('Teste 3: Verificando acesso ao banco de dados...');
        const { data: tableData, error: tableError } = await testClient
            .from('transactions')
            .select('*')
            .limit(1);
        
        let status = '📊 Resultado dos Testes:\n\n';
        status += '✅ Cliente Supabase: OK\n';
        status += authError ? '❌ Autenticação: ' + authError.message + '\n' : '✅ Autenticação: OK\n';
        
        if (tableError) {
            if (tableError.message.includes('not exist')) {
                status += '⚠️ Tabela: Não existe (crie usando a estrutura nas Configurações)\n';
            } else if (tableError.message.includes('JWT')) {
                status += '❌ API Key: Chave inválida ou expirada\n';
            } else {
                status += '❌ Banco de dados: ' + tableError.message + '\n';
            }
        } else {
            status += '✅ Banco de dados: OK\n';
        }
        
        console.log(status);
        alert(status);
        
    } catch (error) {
        console.error('Erro no teste:', error);
        showAuthAlert(`❌ Erro no teste: ${error.message}`, 'danger');
    }
}

// Inicializar Supabase
async function initializeSupabase(url, key) {
    try {
        console.log('🚀 Inicializando Supabase com:', { url, keyLength: key?.length });
        
        supabase = window.supabase.createClient(url, key);
        
        if (!supabase) {
            throw new Error('Falha ao criar cliente Supabase');
        }
        
        console.log('✅ Cliente Supabase criado');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('🔍 Verificando sessão existente:', { session, sessionError });
        
        if (sessionError) {
            console.error('Erro ao verificar sessão:', sessionError);
        }
        
        if (session) {
            console.log('✅ Sessão encontrada:', session.user.email);
            currentUser = session.user;
            showMainApp();
        } else {
            console.log('ℹ️ Nenhuma sessão ativa');
            if (url && key) {
                showAuthTab('login');
            }
        }
        
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state changed:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN' && session) {
                currentUser = session.user;
                showMainApp();
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                showAuthApp();
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao inicializar Supabase:', error);
        showAuthAlert('❌ Erro na inicialização: ' + error.message, 'danger');
    }
}

// Login do usuário
async function loginUser() {
    console.log('🔐 Função loginUser chamada');
    
    if (!window.supabase) {
        console.error('❌ Supabase não está carregado!');
        alert('Erro: Sistema ainda carregando. Por favor, aguarde e tente novamente.');
        location.reload();
        return;
    }
    
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    
    console.log('🔐 Tentando login com:', email);
    
    if (!email || !password) {
        showAuthAlert('❌ Preencha email e senha', 'danger');
        return;
    }
    
    if (!supabase) {
        console.error('❌ Supabase não inicializado');
        showAuthAlert('❌ Configure a conexão primeiro', 'danger');
        showAuthTab('setup');
        return;
    }
    
    try {
        const btn = document.getElementById('loginBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading"></span> Entrando...';
        }
        
        console.log('📡 Enviando requisição para Supabase...');
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        console.log('📊 Resposta do Supabase:', { data, error });
        
        if (error) throw error;
        
        if (data.user) {
            console.log('✅ Login bem-sucedido:', data.user.email);
            showAuthAlert('✓ Login successful!', 'success');
            currentUser = data.user;
            setTimeout(() => showMainApp(), 500);
        } else {
            throw new Error('Login retornou sem erro mas sem usuário');
        }
        
    } catch (error) {
        console.error('❌ Erro completo no login:', error);
        
        let errorMessage = error.message;
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Email ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Email não confirmado. Verifique sua caixa de entrada';
        } else if (error.message.includes('Network')) {
            errorMessage = 'Erro de conexão. Verifique sua internet';
        }
        
        showAuthAlert(`❌ ${errorMessage}`, 'danger');
    } finally {
        const btn = document.getElementById('loginBtn');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Sign In';
        }
    }
}

// Cadastro do usuário
async function registerUser() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showAuthAlert('❌ Preencha todos os campos', 'danger');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthAlert('❌ Senhas não coincidem', 'danger');
        return;
    }
    
    if (password.length < 8) {
        showAuthAlert('❌ Senha deve ter pelo menos 8 caracteres', 'danger');
        return;
    }
    
    if (!supabase) {
        showAuthAlert('❌ Configure a conexão primeiro', 'danger');
        showAuthTab('setup');
        return;
    }
    
    try {
        const btn = document.getElementById('registerBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Criando conta...';
        
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                }
            }
        });
        
        if (error) throw error;
        
        if (data.user && !data.session) {
            showAuthAlert('📧 Verifique seu email para confirmar a conta', 'info');
            showAuthTab('login');
        } else {
            showAuthAlert('✅ Conta criada com sucesso!', 'success');
        }
        
    } catch (error) {
        console.error('Erro no cadastro:', error);
        showAuthAlert(`❌ ${error.message}`, 'danger');
    } finally {
        const btn = document.getElementById('registerBtn');
        btn.disabled = false;
        btn.innerHTML = '🚀 Criar Conta VitexAI';
    }
}

// Reset de senha
async function resetPassword() {
    const email = document.getElementById('loginEmail').value.trim();
    
    if (!email) {
        showAuthAlert('❌ Digite seu email primeiro', 'danger');
        return;
    }
    
    if (!supabase) {
        showAuthAlert('❌ Configure a conexão primeiro', 'danger');
        return;
    }
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        
        if (error) throw error;
        
        showAuthAlert('📧 Email de recuperação enviado!', 'success');
        
    } catch (error) {
        console.error('Erro no reset:', error);
        showAuthAlert(`❌ ${error.message}`, 'danger');
    }
}

// Logout do usuário
async function logoutUser() {
    if (confirm('Are you sure you want to sign out?')) {
        try {
            if (!demoMode && supabase) {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
            }
            
            transactions = [];
            currentUser = null;
            demoMode = false;
            
            showAuthApp();
            showNotification('Signed out successfully!', 'info');
            
        } catch (error) {
            console.error('Logout error:', error);
            showNotification(`Error: ${error.message}`, 'danger');
        }
    }
}

// Mostrar app principal
function showMainApp() {
    console.log('🏠 Mostrando app principal...');
    
    const authContainer = document.getElementById('authContainer');
    const mainContainer = document.getElementById('mainContainer');
    const chatWidget = document.getElementById('chatWidget');
    
    if (!mainContainer) {
        console.error('❌ mainContainer não encontrado!');
        return;
    }
    
    authContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    chatWidget.style.display = 'block';
    
    console.log('✅ Containers alternados');
    
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    const profileEmail = document.getElementById('profileEmail');
    
    if (currentUser) {
        const email = currentUser.email || 'demo@vitexai.com';
        console.log('👤 Usuário logado:', email);
        
        if (userEmail) userEmail.textContent = email;
        if (profileEmail) profileEmail.textContent = email;
        if (userInfo) userInfo.style.display = 'block';
    }
    
    checkDatabaseStructure();
    
    setTimeout(() => {
        console.log('📊 Carregando dados...');
        setupDefaults();
        updateCategories();
        if (!demoMode) {
            loadCategories();
            sincronizarDados();
        } else {
            setupDefaults();
        }
    }, 100);
}

// Verificar estrutura do banco
async function checkDatabaseStructure() {
    if (!supabase || demoMode) return;
    
    const systemAlerts = document.getElementById('systemAlerts');
    if (systemAlerts) {
        systemAlerts.innerHTML = `
            <div class="alert alert-info">
                <strong>Simplified System:</strong> This version uses a shared database structure. 
                All users view the same data. For private per-user data, see the 
                advanced structure in Settings.
            </div>
        `;
    }
}

// Mostrar app de autenticação
function showAuthApp() {
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('chatWidget').style.display = 'none';
    
    clearAuthForms();
}

// Limpar formulários de auth
function clearAuthForms() {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('registerName').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('authAlerts').innerHTML = '';
}

// Mostrar alertas de auth
function showAuthAlert(message, type) {
    const container = document.getElementById('authAlerts');
    if (!container) {
        console.error('❌ Container de alertas não encontrado:', message);
        if (type === 'danger' || type === 'warning') {
            alert('⚠️ ' + message);
        }
        return;
    }
    
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    
    setTimeout(() => {
        if (container) {
            container.innerHTML = '';
        }
    }, 5000);
}

// Carregar categorias
async function loadCategories() {
    if (!supabase || !currentUser || demoMode) return;
    
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('nome')
            .limit(1);
        
        if (error) {
            console.log('Categories table not found, using default categories');
            return;
        }
        
        const { data: allCategories } = await supabase
            .from('categories')
            .select('*')
            .order('nome');
        
        if (allCategories && allCategories.length > 0) {
            categories = { receita: [], despesa: [] };
            allCategories.forEach(cat => {
                if (categories[cat.tipo]) {
                    categories[cat.tipo].push(cat.nome);
                }
            });
            updateCategories();
        }
        
    } catch (error) {
        console.log('Using default categories:', error.message);
    }
}

// Sincronizar dados
async function sincronizarDados() {
    if (!supabase || !currentUser || demoMode) {
        if (demoMode) {
            showNotification('Demo mode - local data only', 'info');
        }
        return;
    }
    
    const now = Date.now();
    if (now - lastTransactionTime < 2000) {
        showNotification('Please wait a moment before syncing...', 'warning');
        return;
    }
    
    try {
        showNotification('Syncing data...', 'info');
        
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('data', { ascending: false })
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        transactions = data || [];
        
        transactions.sort((a, b) => {
            const dateCompare = new Date(b.data) - new Date(a.data);
            if (dateCompare !== 0) return dateCompare;
            return b.id - a.id;
        });
        
        updateTransactionsTable();
        updateAllDashboards();
        
        const userDataCount = document.getElementById('userDataCount');
        if (userDataCount) {
            userDataCount.textContent = transactions.length;
        }
        
        showNotification(`${transactions.length} records synchronized successfully`, 'success');
        
    } catch (error) {
        console.error('Sync error:', error);
        showNotification(`Error: ${error.message}`, 'danger');
    }
}

// Adicionar lançamento
async function adicionarLancamento() {
    const data = document.getElementById('quickDate').value;
    const tipo = document.getElementById('quickTipo').value;
    const categoria = document.getElementById('quickCategoria').value;
    const valor = parseFloat(document.getElementById('quickValor').value);
    const descricao = document.getElementById('quickDescricao').value;
    
    if (!data || !valor || !descricao) {
        showNotification('❌ Preencha todos os campos obrigatórios', 'danger');
        return;
    }
    
    if (valor <= 0) {
        showNotification('❌ Valor deve ser maior que zero', 'danger');
        return;
    }
    
    if (demoMode) {
        const newTransaction = {
            id: Date.now(),
            data,
            tipo,
            categoria,
            valor,
            descricao,
            created_at: new Date().toISOString()
        };
        
        transactions.unshift(newTransaction);
        updateTransactionsTable();
        updateAllDashboards();
        clearQuickForm();
        showNotification('✅ Lançamento adicionado (modo demo)!', 'success');
        return;
    }
    
    if (!supabase || !currentUser) {
        showNotification('❌ Usuário não autenticado', 'danger');
        return;
    }
    
    try {
        const btn = document.getElementById('btnAdicionar');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Salvando...';
        
        const transactionData = {
            data,
            tipo,
            categoria,
            valor,
            descricao
        };
        
        let newTransaction = null;
        let error = null;
        
        try {
            const result = await supabase
                .from('transactions')
                .insert(transactionData)
                .select()
                .single();
            
            if (result.data) {
                newTransaction = result.data;
                transactions.unshift(newTransaction);
                updateTransactionsTable();
                updateAllDashboards();
                clearQuickForm();
                showNotification('✅ Lançamento salvo com sucesso!', 'success');
                return;
            }
            
            error = result.error;
        } catch (e) {
            error = e;
        }
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Erro ao adicionar:', error);
        showNotification(`❌ Erro: ${error.message}`, 'danger');
    } finally {
        const btn = document.getElementById('btnAdicionar');
        btn.disabled = false;
        btn.innerHTML = '➕ Adicionar';
    }
}

// Remover lançamento
async function removerLancamento(id) {
    if (!confirm('Are you sure you want to remove this transaction?')) {
        return;
    }
    
    if (demoMode) {
        transactions = transactions.filter(t => t.id !== id);
        updateTransactionsTable();
        updateAllDashboards();
        showNotification('Transaction removed (demo mode)', 'warning');
        return;
    }
    
    if (!supabase || !currentUser) {
        showNotification('User not authenticated', 'danger');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        transactions = transactions.filter(t => t.id !== id);
        updateTransactionsTable();
        updateAllDashboards();
        
        showNotification('Transaction removed successfully', 'warning');
        
    } catch (error) {
        console.error('Error removing transaction:', error);
        showNotification(`Error: ${error.message}`, 'danger');
    }
}

// Importar dados de exemplo
function importarDadosExemplo() {
    const exemplos = [
        {
            id: Date.now() + 1,
            data: '2025-05-15',
            tipo: 'receita',
            categoria: 'Outras',
            valor: 17500,
            descricao: 'Angel investor funding',
            created_at: new Date().toISOString()
        },
        {
            id: Date.now() + 2,
            data: '2025-05-10',
            tipo: 'despesa',
            categoria: 'Pró-labore',
            valor: 5735.36,
            descricao: 'Partner salaries',
            created_at: new Date().toISOString()
        },
        {
            id: Date.now() + 3,
            data: '2025-05-20',
            tipo: 'despesa',
            categoria: 'Impostos',
            valor: 3534.80,
            descricao: 'Monthly taxes',
            created_at: new Date().toISOString()
        },
        {
            id: Date.now() + 4,
            data: '2025-05-25',
            tipo: 'despesa',
            categoria: 'Terceiros',
            valor: 2024.50,
            descricao: 'Accounting services',
            created_at: new Date().toISOString()
        },
        {
            id: Date.now() + 5,
            data: '2025-06-05',
            tipo: 'receita',
            categoria: 'Consultoria',
            valor: 5910.83,
            descricao: 'IT Consulting - Client A',
            created_at: new Date().toISOString()
        },
        {
            id: Date.now() + 6,
            data: '2025-06-15',
            tipo: 'receita',
            categoria: 'Desenvolvimento',
            valor: 6875,
            descricao: 'Mobile app development',
            created_at: new Date().toISOString()
        },
        {
            id: Date.now() + 7,
            data: '2025-06-20',
            tipo: 'despesa',
            categoria: 'Outras',
            valor: 14165.10,
            descricao: 'Equipment investment',
            created_at: new Date().toISOString()
        }
    ];
    
    transactions = [...exemplos, ...transactions];
    updateTransactionsTable();
    updateAllDashboards();
    showNotification('Sample data loaded successfully!', 'success');
}

// Gerenciar abas
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'aggregated' || tabName === 'trends') {
        updateAllDashboards();
    }
    
    if (tabName === 'digitaltwin') {
        console.log('Digital Twin tab selected');
    }
    
    if (tabName === 'charts') {
        setTimeout(createCharts, 100);
    }
}

// Atualizar categorias no select
function updateCategories() {
    const tipoSelect = document.getElementById('quickTipo');
    const categoriaSelect = document.getElementById('quickCategoria');
    
    if (!tipoSelect || !categoriaSelect) return;
    
    function populateCategories() {
        const tipo = tipoSelect.value;
        categoriaSelect.innerHTML = '';
        categories[tipo].forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoriaSelect.appendChild(option);
        });
    }
    
    tipoSelect.addEventListener('change', populateCategories);
    populateCategories();
}

// Limpar formulário rápido
function clearQuickForm() {
    const valor = document.getElementById('quickValor');
    const descricao = document.getElementById('quickDescricao');
    
    if (valor) {
        valor.value = '';
        valor.focus();
    }
    if (descricao) descricao.value = '';
}

// Atualizar tabela de transações
function updateTransactionsTable() {
    const tbody = document.getElementById('transactionsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const uniqueTransactions = [];
    const seenIds = new Set();
    
    for (const transaction of transactions) {
        if (!seenIds.has(transaction.id)) {
            seenIds.add(transaction.id);
            uniqueTransactions.push(transaction);
        }
    }
    
    const sortedTransactions = uniqueTransactions.sort((a, b) => {
        const dateCompare = new Date(b.data) - new Date(a.data);
        if (dateCompare !== 0) return dateCompare;
        return b.id - a.id;
    });
    
    sortedTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.className = `transaction-row ${transaction.tipo}`;
        
        const dataFormatada = new Date(transaction.data).toLocaleDateString('pt-BR');
        const valorFormatado = formatCurrency(transaction.valor);
        const valorClass = transaction.tipo === 'receita' ? 'value-positive' : 'value-negative';
        const tipoText = transaction.tipo === 'receita' ? 'Revenue' : 'Expense';
        
        row.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${tipoText}</td>
            <td>${transaction.categoria}</td>
            <td>${transaction.descricao}</td>
            <td class="${valorClass}">${valorFormatado}</td>
            <td>
                <button class="btn btn-danger" onclick="removerLancamento(${transaction.id})" 
                        style="padding: 5px 10px; font-size: 12px; width: auto;">
                    Remove
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Atualizar todos os dashboards
function updateAllDashboards() {
    if (updateDashboardTimeout) {
        clearTimeout(updateDashboardTimeout);
    }
    
    updateDashboardTimeout = setTimeout(() => {
        updateAggregatedMetrics();
        updateTrends();
        updateAlerts();
    }, 100);
}

// Atualizar indicadores agregados
function updateAggregatedMetrics() {
    if (transactions.length === 0) {
        resetAllMetrics();
        return;
    }
    
    const receitaTotal = transactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const despesaTotal = transactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const resultadoTotal = receitaTotal - despesaTotal;
    
    const monthlyData = getMonthlyData();
    
    const receitaMedia = monthlyData.length > 0 ? monthlyData.reduce((sum, data) => sum + data.receitas, 0) / monthlyData.length : 0;
    const despesaMedia = monthlyData.length > 0 ? monthlyData.reduce((sum, data) => sum + data.despesas, 0) / monthlyData.length : 0;
    const margemMedia = receitaTotal > 0 ? (resultadoTotal / receitaTotal) : 0;
    
    animateValue('receitaAcumulada', receitaTotal, 'currency');
    animateValue('despesasAcumuladas', despesaTotal, 'currency');
    animateValue('resultadoAcumulado', resultadoTotal, 'currency');
    animateValue('margemMedia', margemMedia, 'percent');
    animateValue('receitaMedia', receitaMedia, 'currency');
    animateValue('burnrateMedia', despesaMedia, 'currency');
    
    setElementColor('resultadoAcumulado', resultadoTotal >= 0 ? 'var(--success)' : 'var(--danger)');
    
    if (resultadoTotal >= 0) {
        updateElement('resultadoTrend', '↑ Accumulated profit');
        document.getElementById('resultadoTrend').className = 'metric-trend trend-up';
    } else {
        updateElement('resultadoTrend', '↓ Accumulated loss');
        document.getElementById('resultadoTrend').className = 'metric-trend trend-down';
    }
    
    updateMixReceitas();
    updateEficienciaOperacional();
}

// Mix de Receitas
function updateMixReceitas() {
    const totalReceitas = transactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    
    if (totalReceitas === 0) {
        updateElement('mixConsultoria', '0%');
        updateElement('mixDesenvolvimento', '0%');
        updateElement('mixOutras', '0%');
        updateElement('consultoriaValue', 'R$ 0,00');
        updateElement('desenvolvimentoValue', 'R$ 0,00');
        updateElement('outrasValue', 'R$ 0,00');
        return;
    }
    
    const consultoriaTotal = transactions.filter(t => t.tipo === 'receita' && t.categoria === 'Consultoria').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const desenvolvimentoTotal = transactions.filter(t => t.tipo === 'receita' && t.categoria === 'Desenvolvimento').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const outrasTotal = totalReceitas - consultoriaTotal - desenvolvimentoTotal;
    
    animateValue('mixConsultoria', consultoriaTotal / totalReceitas, 'percent');
    animateValue('mixDesenvolvimento', desenvolvimentoTotal / totalReceitas, 'percent');
    animateValue('mixOutras', outrasTotal / totalReceitas, 'percent');
    
    updateElement('consultoriaValue', formatCurrency(consultoriaTotal));
    updateElement('desenvolvimentoValue', formatCurrency(desenvolvimentoTotal));
    updateElement('outrasValue', formatCurrency(outrasTotal));
}

// Eficiência Operacional
function updateEficienciaOperacional() {
    const totalReceitas = transactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const totalDespesas = transactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    
    const roi = totalDespesas > 0 ? ((totalReceitas / totalDespesas) - 1) : 0;
    animateValue('roiAcumulado', roi, 'percent');
    setElementColor('roiAcumulado', roi >= 0 ? 'var(--success)' : 'var(--danger)');
    
    const impostosTotal = transactions.filter(t => t.tipo === 'despesa' && t.categoria === 'Impostos').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const cargaTributaria = totalReceitas > 0 ? (impostosTotal / totalReceitas) : 0;
    animateValue('cargaTributaria', cargaTributaria, 'percent');
    
    const prolaboreTotal = transactions.filter(t => t.tipo === 'despesa' && t.categoria === 'Pró-labore').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const assinaturasTotal = transactions.filter(t => t.tipo === 'despesa' && t.categoria === 'Assinaturas').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const custosFixos = totalDespesas > 0 ? ((prolaboreTotal + assinaturasTotal) / totalDespesas) : 0;
    animateValue('custosFixes', custosFixos, 'percent');
}

// Atualizar tendências
function updateTrends() {
    const monthlyData = getMonthlyData();
    
    if (monthlyData.length < 2) {
        updateElement('crescimentoMedio', '0%');
        updateElement('volatilidadeReceita', '0%');
        updateElement('mesesPositivos', '0');
        updateElement('percentualPositivos', '0%');
        updateElement('maiorResultado', formatCurrency(0));
        updateElement('maiorResultadoMes', '-');
        return;
    }
    
    let crescimentos = [];
    for (let i = 1; i < monthlyData.length; i++) {
        const anterior = monthlyData[i-1].receitas;
        const atual = monthlyData[i].receitas;
        if (anterior > 0) {
            crescimentos.push((atual - anterior) / anterior);
        }
    }
    
    const crescimentoMedio = crescimentos.length > 0 ? crescimentos.reduce((sum, val) => sum + val, 0) / crescimentos.length : 0;
    animateValue('crescimentoMedio', crescimentoMedio, 'percent');
    
    const receitas = monthlyData.map(data => data.receitas);
    const media = receitas.reduce((sum, val) => sum + val, 0) / receitas.length;
    const variancia = receitas.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / receitas.length;
    const desvio = Math.sqrt(variancia);
    const volatilidade = media > 0 ? desvio / media : 0;
    animateValue('volatilidadeReceita', volatilidade, 'percent');
    
    const mesesPositivos = monthlyData.filter(data => data.resultado > 0).length;
    const percentualPositivos = monthlyData.length > 0 ? mesesPositivos / monthlyData.length : 0;
    updateElement('mesesPositivos', mesesPositivos);
    animateValue('percentualPositivos', percentualPositivos, 'percent');
    
    const resultados = monthlyData.map(data => data.resultado);
    const maiorResultado = Math.max(...resultados);
    const maiorResultadoIndex = resultados.indexOf(maiorResultado);
    const maiorResultadoMes = monthlyData[maiorResultadoIndex]?.month;
    
    animateValue('maiorResultado', maiorResultado, 'currency');
    if (maiorResultadoMes) {
        updateElement('maiorResultadoMes', new Date(maiorResultadoMes + '-01').toLocaleDateString('en-US', {month: 'long', year: 'numeric'}));
    }
    
    updateTrendsTable();
}

// Atualizar tabela de tendências
function updateTrendsTable() {
    const tbody = document.getElementById('trendsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const monthlyData = getMonthlyData();
    
    if (monthlyData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No data available</td></tr>';
        return;
    }
    
    monthlyData.forEach((data, index) => {
        let crescimentoMoM = '';
        if (index > 0) {
            const anterior = monthlyData[index-1].receitas;
            if (anterior > 0) {
                const crescimento = (data.receitas - anterior) / anterior;
                crescimentoMoM = formatPercent(crescimento);
            }
        }
        
        const status = data.resultado > 0 ? '✓ Positive' : '✗ Negative';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(data.month + '-01').toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</td>
            <td>${formatCurrency(data.receitas)}</td>
            <td>${formatCurrency(data.despesas)}</td>
            <td style="color: ${data.resultado >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(data.resultado)}</td>
            <td>${crescimentoMoM || '-'}</td>
            <td style="color: ${data.margem >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatPercent(data.margem)}</td>
            <td>${status}</td>
        `;
        tbody.appendChild(row);
    });
}

// Atualizar alertas
function updateAlerts() {
    const alertsContainer = document.getElementById('alertsContainer');
    alertsContainer.innerHTML = '';
    
    if (transactions.length === 0) return;
    
    const monthlyData = getMonthlyData();
    if (monthlyData.length === 0) return;
    
    const ultimoMes = monthlyData[monthlyData.length - 1];
    const margemMedia = monthlyData.reduce((sum, data) => sum + data.margem, 0) / monthlyData.length;
    
    if (ultimoMes.resultado < 0) {
        alertsContainer.innerHTML += `
            <div class="alert alert-warning">
                <strong>Negative Result:</strong> Last month showed a loss of ${formatCurrency(Math.abs(ultimoMes.resultado))}
            </div>
        `;
    }
    
    if (margemMedia < 0.15) {
        alertsContainer.innerHTML += `
            <div class="alert alert-warning">
                <strong>Low Margin:</strong> Average margin of ${formatPercent(margemMedia)} is below recommended (20%+)
            </div>
        `;
    }
    
    if (ultimoMes.resultado > 0 && margemMedia > 0.20) {
        alertsContainer.innerHTML += `
            <div class="alert alert-success">
                <strong>Positive Performance:</strong> Company shows healthy results with ${formatPercent(margemMedia)} margin
            </div>
        `;
    }
    
    const receitaTotal = transactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const outrasReceitas = transactions.filter(t => t.tipo === 'receita' && (t.categoria === 'Outras' || t.categoria === 'Licenciamento')).reduce((sum, t) => sum + parseFloat(t.valor), 0);
    if (receitaTotal > 0 && outrasReceitas / receitaTotal > 0.5) {
        alertsContainer.innerHTML += `
            <div class="alert alert-info">
                <strong>Diversification:</strong> ${formatPercent(outrasReceitas/receitaTotal)} of revenue comes from non-core categories
            </div>
        `;
    }
}

// Criar gráficos
function createCharts() {
    if (transactions.length === 0) {
        showNotification('📊 Adicione lançamentos para visualizar os gráficos', 'info');
        return;
    }
    
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    createEvolutionChart();
    createRevenueChart();
    createExpenseChart();
    createMarginChart();
    createTrendsChart();
}

// Gráfico de evolução
function createEvolutionChart() {
    const ctx = document.getElementById('evolutionChart')?.getContext('2d');
    if (!ctx) return;
    
    const monthlyData = getMonthlyData();
    if (monthlyData.length === 0) return;
    
    const labels = monthlyData.map(data => 
        new Date(data.month + '-01').toLocaleDateString('pt-BR', {month: 'short', year: 'numeric'})
    );
    
    charts.evolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: monthlyData.map(data => data.receitas),
                    borderColor: '#4CAF50',
                    backgroundColor: '#4CAF5020',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Despesas',
                    data: monthlyData.map(data => data.despesas),
                    borderColor: '#f44336',
                    backgroundColor: '#f4433620',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de receitas
function createRevenueChart() {
    const ctx = document.getElementById('revenueChart')?.getContext('2d');
    if (!ctx) return;
    
    const revenueByCategory = getCategoryData('receita');
    if (Object.keys(revenueByCategory).length === 0) return;
    
    const labels = Object.keys(revenueByCategory);
    const data = Object.values(revenueByCategory);
    const colors = ['#4facfe', '#00f2fe', '#4CAF50', '#2196f3', '#9c27b0', '#ff9800'];
    
    charts.revenue = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + formatCurrency(context.parsed) + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de despesas
function createExpenseChart() {
    const ctx = document.getElementById('expenseChart')?.getContext('2d');
    if (!ctx) return;
    
    const expenseByCategory = getCategoryData('despesa');
    if (Object.keys(expenseByCategory).length === 0) return;
    
    const labels = Object.keys(expenseByCategory);
    const data = Object.values(expenseByCategory);
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3'];
    
    charts.expense = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + formatCurrency(context.parsed) + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de margem
function createMarginChart() {
    const ctx = document.getElementById('marginChart')?.getContext('2d');
    if (!ctx) return;
    
    const monthlyData = getMonthlyData();
    if (monthlyData.length === 0) return;
    
    const labels = monthlyData.map(data => 
        new Date(data.month + '-01').toLocaleDateString('pt-BR', {month: 'short', year: 'numeric'})
    );
    
    charts.margin = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Margem (%)',
                data: monthlyData.map(data => data.margem * 100),
                backgroundColor: monthlyData.map(data => data.margem >= 0.2 ? '#4CAF50' : data.margem >= 0 ? '#FFA500' : '#f44336'),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Margem: ' + context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de tendências
function createTrendsChart() {
    const ctx = document.getElementById('trendsChart')?.getContext('2d');
    if (!ctx) return;
    
    const monthlyData = getMonthlyData();
    if (monthlyData.length === 0) return;
    
    const labels = monthlyData.map(data => 
        new Date(data.month + '-01').toLocaleDateString('pt-BR', {month: 'short', year: 'numeric'})
    );
    
    charts.trends = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: monthlyData.map(data => data.receitas),
                    backgroundColor: '#4CAF5080',
                    borderColor: '#4CAF50',
                    borderWidth: 2
                },
                {
                    label: 'Despesas',
                    data: monthlyData.map(data => data.despesas),
                    backgroundColor: '#f4433680',
                    borderColor: '#f44336',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Dados auxiliares
function getMonthlyData() {
    const monthlyMap = new Map();
    
    transactions.forEach(transaction => {
        const date = new Date(transaction.data);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { 
                month: monthKey, 
                receitas: 0, 
                despesas: 0,
                resultado: 0,
                margem: 0
            });
        }
        
        const monthData = monthlyMap.get(monthKey);
        const valor = parseFloat(transaction.valor);
        
        if (transaction.tipo === 'receita') {
            monthData.receitas += valor;
        } else {
            monthData.despesas += valor;
        }
    });
    
    monthlyMap.forEach(data => {
        data.resultado = data.receitas - data.despesas;
        data.margem = data.receitas > 0 ? data.resultado / data.receitas : 0;
    });
    
    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
}

function getCategoryData(tipo) {
    const categoryMap = {};
    
    transactions
        .filter(t => t.tipo === tipo)
        .forEach(transaction => {
            if (!categoryMap[transaction.categoria]) {
                categoryMap[transaction.categoria] = 0;
            }
            categoryMap[transaction.categoria] += parseFloat(transaction.valor);
        });
    
    return categoryMap;
}

// Exportação de dados
function exportarCSV() {
    if (transactions.length === 0) {
        showNotification('No data to export', 'danger');
        return;
    }
    
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
    const csvContent = [
        headers.join(','),
        ...transactions.map(t => [
            t.data,
            t.tipo,
            t.categoria,
            `"${t.descricao.replace(/"/g, '""')}"`,
            parseFloat(t.valor).toFixed(2)
        ].join(','))
    ].join('\n');
    
    downloadFile(csvContent, 'vitexai_financial_data.csv', 'text/csv');
    showNotification('Data exported successfully!', 'success');
}

function exportarJSON() {
    const dataToExport = {
        user: currentUser?.email || 'demo@vitexai.com',
        transactions,
        categories,
        exportDate: new Date().toISOString(),
        source: 'vitexai_dashboard_v3',
        version: '3.0',
        summary: {
            totalTransactions: transactions.length,
            totalReceitas: transactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + parseFloat(t.valor), 0),
            totalDespesas: transactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + parseFloat(t.valor), 0)
        }
    };
    
    const jsonContent = JSON.stringify(dataToExport, null, 2);
    downloadFile(jsonContent, 'vitexai_backup.json', 'application/json');
    showNotification('Backup created successfully!', 'success');
}

// Gerar relatório mensal
function gerarRelatorioMensal() {
    const monthlyData = getMonthlyData();
    if (monthlyData.length === 0) {
        showNotification('❌ Sem dados para gerar relatório', 'danger');
        return;
    }
    
    const ultimoMes = monthlyData[monthlyData.length - 1];
    const totalReceitas = transactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const totalDespesas = transactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    
    const relatorioHtml = `
        <div class="input-section">
            <h4>📊 Executive Report - VitexAI</h4>
            <p><strong>Period:</strong> ${new Date().toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</p>
            
            <h5>General Summary</h5>
            <ul>
                <li><strong>Total Transactions:</strong> ${transactions.length}</li>
                <li><strong>Total Accumulated Revenue:</strong> ${formatCurrency(totalReceitas)}</li>
                <li><strong>Total Accumulated Expenses:</strong> ${formatCurrency(totalDespesas)}</li>
                <li><strong>Accumulated Result:</strong> <span style="color: ${totalReceitas - totalDespesas >= 0 ? '#4CAF50' : '#f44336'}">${formatCurrency(totalReceitas - totalDespesas)}</span></li>
            </ul>
            
            <h5>Last Month (${new Date(ultimoMes.month + '-01').toLocaleDateString('en-US', {month: 'long', year: 'numeric'})})</h5>
            <ul>
                <li><strong>Revenue:</strong> ${formatCurrency(ultimoMes.receitas)}</li>
                <li><strong>Expenses:</strong> ${formatCurrency(ultimoMes.despesas)}</li>
                <li><strong>Result:</strong> <span style="color: ${ultimoMes.resultado >= 0 ? '#4CAF50' : '#f44336'}">${formatCurrency(ultimoMes.resultado)}</span></li>
                <li><strong>Margin:</strong> ${formatPercent(ultimoMes.margem)}</li>
            </ul>
            
            <h5>Key Indicators</h5>
            <ul>
                <li><strong>Average Margin:</strong> ${formatPercent(totalReceitas > 0 ? (totalReceitas - totalDespesas) / totalReceitas : 0)}</li>
                <li><strong>ROI:</strong> ${formatPercent(totalDespesas > 0 ? (totalReceitas / totalDespesas) - 1 : 0)}</li>
                <li><strong>Positive Months:</strong> ${monthlyData.filter(m => m.resultado > 0).length} of ${monthlyData.length}</li>
            </ul>
            
            <button class="btn" onclick="window.print()" style="width: auto;">🖨️ Print Report</button>
        </div>
    `;
    
    document.getElementById('relatorioContainer').innerHTML = relatorioHtml;
    showNotification('📋 Report generated successfully!', 'success');
}

// Chat Functions
function toggleChat() {
    chatOpen = !chatOpen;
    const chatPanel = document.getElementById('chatPanel');
    const chatToggle = document.querySelector('.chat-toggle');
    
    if (chatOpen) {
        chatPanel.classList.add('active');
        chatToggle.style.display = 'none';
        document.getElementById('chatInput').focus();
        
        if (!window.nlpInitialized) {
            initializeNLPSystem();
            window.nlpInitialized = true;
        }
    } else {
        chatPanel.classList.remove('active');
        chatToggle.style.display = 'flex';
    }
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    const btn = document.getElementById('chatSendBtn');
    btn.disabled = true;
    input.disabled = true;
    
    addChatMessage(message, 'user');
    input.value = '';
    
    const response = await processUserQuery(message);
    
    addChatMessage(response, 'assistant');
    
    btn.disabled = false;
    input.disabled = false;
    input.focus();
}

function addChatMessage(message, type) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    messageDiv.innerHTML = message;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Sistema NLP simplificado
let nlpSystem = null;

async function initializeNLPSystem() {
    console.log('Initializing NLP system...');
}

async function processUserQuery(query) {
    return processBasicQuery(query);
}

function processBasicQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('health') || lowerQuery.includes('status') || lowerQuery.includes('how am i doing')) {
        return analyzeFinancialHealth();
    }
    
    if (lowerQuery.includes('biggest expense') || lowerQuery.includes('largest expense')) {
        return findBiggestExpense();
    }
    
    if (lowerQuery.includes('revenue trend') || lowerQuery.includes('income trend')) {
        return analyzeRevenueTrends();
    }
    
    if (lowerQuery.includes('margin') || lowerQuery.includes('profit')) {
        return analyzeMargin();
    }
    
    if (lowerQuery.includes('this month') || lowerQuery.includes('current month')) {
        return currentMonthSummary();
    }
    
    if (lowerQuery.includes('best month') || lowerQuery.includes('highest revenue')) {
        return findBestMonth();
    }
    
    if (lowerQuery.includes('expense breakdown') || lowerQuery.includes('where money goes')) {
        return expenseBreakdown();
    }
    
    return 'I can help you analyze your financial data! Try asking about:<br><br>• Your financial health<br>• Biggest expenses<br>• Revenue trends<br>• Profit margins<br>• Monthly summaries<br>• Expense breakdowns';
}

function analyzeFinancialHealth() {
    const totalRevenue = transactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const totalExpenses = transactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const netResult = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? (netResult / totalRevenue) : 0;
    
    let health = '';
    if (margin >= 0.2) {
        health = '🟢 <strong>Excellent!</strong> Your margin is above 20%.';
    } else if (margin >= 0.1) {
        health = '🟡 <strong>Good.</strong> Your margin is healthy but could be improved.';
    } else if (margin >= 0) {
        health = '🟠 <strong>Attention needed.</strong> Your margin is low.';
    } else {
        health = '🔴 <strong>Critical.</strong> You are operating at a loss.';
    }
    
    return '<strong>Financial Health Analysis:</strong><br><br>' +
            health + '<br><br>' +
            '<strong>Summary:</strong><br>' +
            '• Total Revenue: ' + formatCurrency(totalRevenue) + '<br>' +
            '• Total Expenses: ' + formatCurrency(totalExpenses) + '<br>' +
            '• Net Result: <span style="color: ' + (netResult >= 0 ? '#4CAF50' : '#f44336') + '">' + formatCurrency(netResult) + '</span><br>' +
            '• Profit Margin: ' + formatPercent(margin);
}

function findBiggestExpense() {
    const expenses = transactions.filter(t => t.tipo === 'despesa');
    if (expenses.length === 0) {
        return 'No expenses recorded yet.';
    }
    
    const biggest = expenses.reduce((max, t) => parseFloat(t.valor) > parseFloat(max.valor) ? t : max);
    const categoryTotals = {};
    
    expenses.forEach(t => {
        if (!categoryTotals[t.categoria]) {
            categoryTotals[t.categoria] = 0;
        }
        categoryTotals[t.categoria] += parseFloat(t.valor);
    });
    
    const biggestCategory = Object.entries(categoryTotals).reduce((max, [cat, total]) => 
        total > max[1] ? [cat, total] : max
    );
    
    return '<strong>Biggest Expense Analysis:</strong><br><br>' +
            '<strong>Single transaction:</strong><br>' +
            '• ' + biggest.descricao + ': ' + formatCurrency(biggest.valor) + '<br>' +
            '• Date: ' + new Date(biggest.data).toLocaleDateString() + '<br>' +
            '• Category: ' + biggest.categoria + '<br><br>' +
            '<strong>By category:</strong><br>' +
            '• ' + biggestCategory[0] + ': ' + formatCurrency(biggestCategory[1]);
}

function analyzeRevenueTrends() {
    const monthlyData = getMonthlyData();
    if (monthlyData.length < 2) {
        return 'Not enough data to analyze trends. Need at least 2 months.';
    }
    
    const recentMonths = monthlyData.slice(-3);
    const trend = recentMonths.length > 1 ? 
        (recentMonths[recentMonths.length - 1].receitas - recentMonths[0].receitas) / recentMonths[0].receitas : 0;
    
    let trendAnalysis = '';
    if (trend > 0.1) {
        trendAnalysis = '📈 <strong>Growing!</strong> Revenue is increasing.';
    } else if (trend > -0.1) {
        trendAnalysis = '➡️ <strong>Stable.</strong> Revenue is relatively constant.';
    } else {
        trendAnalysis = '📉 <strong>Declining.</strong> Revenue is decreasing.';
    }
    
    let response = '<strong>Revenue Trend Analysis:</strong><br><br>';
    response += trendAnalysis + '<br><br>';
    response += '<strong>Last 3 months:</strong><br>';
    response += recentMonths.map(m => 
        '• ' + new Date(m.month + '-01').toLocaleDateString('en-US', {month: 'short', year: 'numeric'}) + ': ' + formatCurrency(m.receitas)
    ).join('<br>');
    response += '<br><br><strong>Growth rate:</strong> ' + formatPercent(trend);
    
    return response;
}

function analyzeMargin() {
    const monthlyData = getMonthlyData();
    if (monthlyData.length === 0) {
        return 'No data available to analyze margins.';
    }
    
    const avgMargin = monthlyData.reduce((sum, m) => sum + m.margem, 0) / monthlyData.length;
    const lastMonth = monthlyData[monthlyData.length - 1];
    const improving = monthlyData.length > 1 && lastMonth.margem > monthlyData[monthlyData.length - 2].margem;
    
    return '<strong>Margin Analysis:</strong><br><br>' +
            '<strong>Average margin:</strong> ' + formatPercent(avgMargin) + '<br>' +
            '<strong>Last month:</strong> ' + formatPercent(lastMonth.margem) + '<br>' +
            '<strong>Trend:</strong> ' + (improving ? '📈 Improving' : '📉 Declining') + '<br><br>' +
            '<strong>Recommendation:</strong><br>' +
            (avgMargin < 0.2 ? 
                '• Focus on increasing revenue or reducing costs<br>• Target margin should be 20%+' : 
                '• Maintain current performance<br>• Look for optimization opportunities');
}

function currentMonthSummary() {
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const currentTransactions = transactions.filter(t => t.data.startsWith(currentMonth));
    
    if (currentTransactions.length === 0) {
        return 'No transactions recorded for the current month yet.';
    }
    
    const revenue = currentTransactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const expenses = currentTransactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const result = revenue - expenses;
    
    return '<strong>Current Month Summary:</strong><br><br>' +
            '<strong>' + now.toLocaleDateString('en-US', {month: 'long', year: 'numeric'}) + '</strong><br><br>' +
            '• Transactions: ' + currentTransactions.length + '<br>' +
            '• Revenue: ' + formatCurrency(revenue) + '<br>' +
            '• Expenses: ' + formatCurrency(expenses) + '<br>' +
            '• Result: <span style="color: ' + (result >= 0 ? '#4CAF50' : '#f44336') + '">' + formatCurrency(result) + '</span><br>' +
            '• Margin: ' + (revenue > 0 ? formatPercent(result / revenue) : '0%');
}

function findBestMonth() {
    const monthlyData = getMonthlyData();
    if (monthlyData.length === 0) {
        return 'No data available to analyze.';
    }
    
    const bestRevenue = monthlyData.reduce((best, m) => m.receitas > best.receitas ? m : best);
    const bestResult = monthlyData.reduce((best, m) => m.resultado > best.resultado ? m : best);
    
    return '<strong>Best Performance Analysis:</strong><br><br>' +
            '<strong>Highest Revenue:</strong><br>' +
            '• ' + new Date(bestRevenue.month + '-01').toLocaleDateString('en-US', {month: 'long', year: 'numeric'}) + '<br>' +
            '• Revenue: ' + formatCurrency(bestRevenue.receitas) + '<br><br>' +
            '<strong>Best Result:</strong><br>' +
            '• ' + new Date(bestResult.month + '-01').toLocaleDateString('en-US', {month: 'long', year: 'numeric'}) + '<br>' +
            '• Net profit: ' + formatCurrency(bestResult.resultado) + '<br>' +
            '• Margin: ' + formatPercent(bestResult.margem);
}

function expenseBreakdown() {
    const expenses = transactions.filter(t => t.tipo === 'despesa');
    if (expenses.length === 0) {
        return 'No expenses recorded yet.';
    }
    
    const categoryTotals = {};
    const total = expenses.reduce((sum, t) => {
        const valor = parseFloat(t.valor);
        if (!categoryTotals[t.categoria]) {
            categoryTotals[t.categoria] = 0;
        }
        categoryTotals[t.categoria] += valor;
        return sum + valor;
    }, 0);
    
    const sortedCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    let response = '<strong>Expense Breakdown:</strong><br><br>';
    response += '<strong>Total expenses:</strong> ' + formatCurrency(total) + '<br><br>';
    response += '<strong>Top categories:</strong><br>';
    response += sortedCategories.map(([cat, value]) => 
        '• ' + cat + ': ' + formatCurrency(value) + ' (' + formatPercent(value/total) + ')'
    ).join('<br>');
    response += '<br><br>💡 <strong>Tip:</strong> Focus on reducing the highest categories for maximum impact.';
    
    return response;
}

// Funções utilitárias
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatPercent(value) {
    return (value * 100).toFixed(1) + '%';
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.innerHTML = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '1000';
    notification.style.maxWidth = '400px';
    notification.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
    notification.style.animation = 'slideIn 0.3s ease-out';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 4000);
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setElementColor(id, color) {
    const element = document.getElementById(id);
    if (element) element.style.color = color;
}

function resetAllMetrics() {
    const metrics = [
        'receitaAcumulada', 'despesasAcumuladas', 'resultadoAcumulado', 'margemMedia',
        'receitaMedia', 'burnrateMedia', 'mixConsultoria', 'mixDesenvolvimento', 'mixOutras',
        'roiAcumulado', 'cargaTributaria', 'custosFixes', 'crescimentoMedio', 'volatilidadeReceita',
        'mesesPositivos', 'maiorResultado', 'receitaProjetada', 'breakEven', 'runway',
        'consultoriaValue', 'desenvolvimentoValue', 'outrasValue'
    ];
    
    metrics.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (id.includes('mix') || id.includes('margem') || id.includes('roi') || 
                id.includes('carga') || id.includes('custos') || id.includes('crescimento') || 
                id.includes('volatilidade')) {
                element.textContent = '0%';
            } else if (id === 'mesesPositivos' || id === 'runway') {
                element.textContent = '0';
            } else {
                element.textContent = 'R$ 0.00';
            }
        }
    });
    
    updateElement('percentualPositivos', '0%');
    updateElement('maiorResultadoMes', '-');
    updateElement('runwayTrend', 'No historical data');
    updateElement('metaMargem', 'Configure data');
}

// Animação de valores
function animateValue(id, endValue, type = 'number') {
    const element = document.getElementById(id);
    if (!element) return;
    
    const startValue = parseFloat(element.textContent.replace(/[^\d.-]/g, '')) || 0;
    const duration = 600;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = startValue + (endValue - startValue) * easeOutQuart;
        
        if (type === 'currency') {
            element.textContent = formatCurrency(currentValue);
        } else if (type === 'percent') {
            element.textContent = formatPercent(currentValue);
        } else {
            element.textContent = currentValue.toFixed(0);
        }
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Copiar estrutura SQL para clipboard
function copyToClipboard(type) {
    let sql = '';
    
    if (type === 'simple') {
        sql = `CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    tipo VARCHAR(10) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Optional: Create index for better performance
CREATE INDEX idx_transactions_data ON transactions(data DESC);`;
    } else {
        sql = `CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    data DATE NOT NULL,
    tipo VARCHAR(10) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can only see own transactions" 
ON transactions FOR ALL 
USING (auth.uid() = user_id);`;
    }
    
    const textarea = document.createElement('textarea');
    textarea.value = sql;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showNotification('SQL copied to clipboard!', 'success');
    } catch (err) {
        showNotification('Error copying SQL', 'danger');
    }
    
    document.body.removeChild(textarea);
}

// Toggle ML Features
function toggleMLFeatures() {
    const checkbox = document.getElementById('enableMLCheckbox');
    const enabled = checkbox.checked;
    
    localStorage.setItem('vitexai_enable_ml', enabled);
    
    if (enabled) {
        showNotification('🤖 AI avançada será ativada na próxima vez que abrir o chat', 'info');
    } else {
        showNotification('💬 Usando chat básico', 'info');
    }
}

// Limpar credenciais armazenadas
function clearStoredCredentials() {
    if (confirm('Isso apagará suas credenciais salvas. Continuar?')) {
        localStorage.removeItem('vitexai_supabase_url');
        localStorage.removeItem('vitexai_supabase_key');
        localStorage.removeItem('vitexai_enable_ml');
        
        document.getElementById('setupSupabaseUrl').value = '';
        document.getElementById('setupSupabaseKey').value = '';
        
        supabase = null;
        currentUser = null;
        
        showAuthAlert('✅ Credenciais removidas. Configure novamente.', 'success');
        showAuthTab('setup');
    }
}

// Digital Twin Functions
function updateSimulation() {
    document.getElementById('revenueGrowthValue').textContent = document.getElementById('revenueGrowthSlider').value + '%';
    document.getElementById('expenseChangeValue').textContent = document.getElementById('expenseChangeSlider').value + '%';
    document.getElementById('newContractsValue').textContent = document.getElementById('newContractsSlider').value;
    document.getElementById('churnRateValue').textContent = document.getElementById('churnRateSlider').value + '%';
}

function runMonteCarloSimulation() {
    showNotification('🎲 Monte Carlo simulation coming soon!', 'info');
}

function resetSimulation() {
    document.getElementById('revenueGrowthSlider').value = 0;
    document.getElementById('expenseChangeSlider').value = 0;
    document.getElementById('newContractsSlider').value = 0;
    document.getElementById('churnRateSlider').value = 5;
    updateSimulation();
    showNotification('Simulation reset to current state', 'info');
}

// Função de diagnóstico global
function vitexDiagnostic() {
    console.log('=== VitexAI Diagnostic ===');
    console.log('Supabase loaded:', !!window.supabase);
    console.log('Supabase client:', !!supabase);
    console.log('Current user:', currentUser);
    console.log('Demo mode:', demoMode);
    console.log('Stored URL:', localStorage.getItem('vitexai_supabase_url'));
    console.log('Stored key exists:', !!localStorage.getItem('vitexai_supabase_key'));
    console.log('Auth container visible:', document.getElementById('authContainer')?.style.display);
    console.log('Main container visible:', document.getElementById('mainContainer')?.style.display);
    console.log('Active form:', document.querySelector('.auth-form.active')?.id);
    console.log('Transactions count:', transactions.length);
    console.log('=========================');
    
    return {
        supabaseLoaded: !!window.supabase,
        clientInitialized: !!supabase,
        userLoggedIn: !!currentUser,
        demoMode,
        hasStoredCredentials: !!localStorage.getItem('vitexai_supabase_url')
    };
}

// Função de diagnóstico visual
function runDiagnostic() {
    const result = vitexDiagnostic();
    let message = '🔍 Diagnóstico VitexAI\n\n';
    
    if (!result.supabaseLoaded) {
        message += '❌ Supabase não carregado\n';
        message += '   → Recarregue a página\n\n';
    } else {
        message += '✅ Supabase carregado\n\n';
    }
    
    if (!result.clientInitialized && result.hasStoredCredentials) {
        message += '⚠️ Cliente não inicializado\n';
        message += '   → Limpe as credenciais e reconfigure\n\n';
    }
    
    if (!result.hasStoredCredentials) {
        message += 'ℹ️ Nenhuma credencial salva\n';
        message += '   → Configure o Supabase primeiro\n\n';
    }
    
    message += 'Status atual:\n';
    message += `• Biblioteca Supabase: ${result.supabaseLoaded ? '✅' : '❌'}\n`;
    message += `• Cliente configurado: ${result.clientInitialized ? '✅' : '❌'}\n`;
    message += `• Usuário logado: ${result.userLoggedIn ? '✅' : '❌'}\n`;
    message += `• Modo demo: ${result.demoMode ? '✅' : '❌'}\n`;
    
    alert(message);
}

// Testar Supabase rapidamente
function testSupabase() {
    if (window.supabase) {
        alert('✅ Supabase está carregado!');
    } else {
        alert('❌ Supabase não está carregado. Recarregue a página.');
    }
}

// Expor todas as funções globalmente
window.loginUser = loginUser;
window.registerUser = registerUser;
window.resetPassword = resetPassword;
window.setupConnection = setupConnection;
window.testConnection = testConnection;
window.clearStoredCredentials = clearStoredCredentials;
window.runDiagnostic = runDiagnostic;
window.toggleMLFeatures = toggleMLFeatures;
window.removerLancamento = removerLancamento;
window.adicionarLancamento = adicionarLancamento;
window.sincronizarDados = sincronizarDados;
window.importarDadosExemplo = importarDadosExemplo;
window.showTab = showTab;
window.exportarCSV = exportarCSV;
window.exportarJSON = exportarJSON;
window.gerarRelatorioMensal = gerarRelatorioMensal;
window.logoutUser = logoutUser;
window.copyToClipboard = copyToClipboard;
window.toggleChat = toggleChat;
window.sendChatMessage = sendChatMessage;
window.handleChatKeyPress = handleChatKeyPress;
window.updateSimulation = updateSimulation;
window.runMonteCarloSimulation = runMonteCarloSimulation;
window.resetSimulation = resetSimulation;
window.testSupabase = testSupabase;
window.vitexDiagnostic = vitexDiagnostic;

// Initialize ML checkbox state
document.addEventListener('DOMContentLoaded', function() {
    const mlEnabled = localStorage.getItem('vitexai_enable_ml') === 'true';
    const checkbox = document.getElementById('enableMLCheckbox');
    if (checkbox) {
        checkbox.checked = mlEnabled;
    }
});

console.log('💡 Dica: Execute vitexDiagnostic() no console para diagnóstico completo');
