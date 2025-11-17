/**
 * SCRIPT DE AUTENTICAÇÃO
 * 
 * Responsável por:
 * - Login de usuários
 * - Registro de novos usuários
 * - Upload e preview de foto de perfil
 * 
 * Usado nas páginas login.html e register.html
 */

// Armazena a foto selecionada em formato base64
let selectedProfilePhoto = null;

// Quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Busca os formulários de login e registro
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const profilePhotoInput = document.getElementById('profilePhoto');

    // Se estiver na página de login, adiciona listener ao formulário
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Se estiver na página de registro, adiciona listener ao formulário
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Se houver campo de foto de perfil, adiciona listener
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', handlePhotoSelect);
    }
});

/**
 * Manipula a seleção de foto de perfil
 * Valida o arquivo e cria preview
 * @param {Event} e - Evento de mudança do input file
 */
function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Valida se é uma imagem
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido');
        return;
    }

    // Valida tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB');
        return;
    }

    // Lê o arquivo e converte para base64
    const reader = new FileReader();
    reader.onload = (e) => {
        // Armazena a imagem em base64
        selectedProfilePhoto = e.target.result;
        
        // Atualiza o preview da imagem
        const previewImage = document.getElementById('previewImage');
        const placeholder = document.querySelector('.avatar-placeholder');
        
        previewImage.src = selectedProfilePhoto;
        previewImage.style.display = 'block'; // Mostra a imagem
        placeholder.style.display = 'none'; // Esconde o placeholder
    };
    reader.readAsDataURL(file); // Converte arquivo para base64
}

/**
 * Manipula o envio do formulário de login
 * @param {Event} e - Evento de submit do formulário
 */
async function handleLogin(e) {
    e.preventDefault(); // Previne reload da página
    
    // Pega valores dos campos
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Remove mensagem de erro anterior
    errorDiv.classList.remove('show');
    
    // Desabilita botão e muda texto
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    try {
        // Faz requisição de login para a API
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Login bem-sucedido - redireciona para dashboard
            window.location.href = '/dashboard.html';
        } else {
            // Login falhou - mostra mensagem de erro
            showError(errorDiv, data.error || 'Erro ao fazer login');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
        }
    } catch (error) {
        // Erro de conexão
        showError(errorDiv, 'Erro de conexão com o servidor');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
    }
}

/**
 * Manipula o envio do formulário de registro
 * @param {Event} e - Evento de submit do formulário
 */
async function handleRegister(e) {
    e.preventDefault(); // Previne reload da página
    
    // Pega valores dos campos
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Remove mensagem de erro anterior
    errorDiv.classList.remove('show');

    // Valida se as senhas coincidem
    if (password !== confirmPassword) {
        showError(errorDiv, 'As senhas não coincidem');
        return;
    }

    // Valida tamanho mínimo da senha
    if (password.length < 6) {
        showError(errorDiv, 'A senha deve ter no mínimo 6 caracteres');
        return;
    }

    // Desabilita botão e muda texto
    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando conta...';

    try {
        // Monta corpo da requisição
        const requestBody = { 
            name, 
            email, 
            password
        };
        
        // Adiciona foto de perfil se foi selecionada
        if (selectedProfilePhoto) {
            requestBody.profilePhoto = selectedProfilePhoto;
        }

        // Faz requisição de registro para a API
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok) {
            // Registro bem-sucedido - redireciona para dashboard
            window.location.href = '/dashboard.html';
        } else {
            // Registro falhou - mostra mensagem de erro
            showError(errorDiv, data.error || 'Erro ao criar conta');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Criar Conta';
        }
    } catch (error) {
        // Erro de conexão
        showError(errorDiv, 'Erro de conexão com o servidor');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Conta';
    }
}

/**
 * Exibe mensagem de erro na tela
 * @param {HTMLElement} element - Elemento onde exibir o erro
 * @param {string} message - Mensagem de erro a exibir
 */
function showError(element, message) {
    element.textContent = message;
    element.classList.add('show'); // Adiciona classe para mostrar com animação
}
