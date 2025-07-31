// Состояние приложения
let isLoggedIn = false;
let balance = 2500;
let steamUser = null;
let selectedPrivilege = null;
let selectedTopupAmount = 0;

// Steam OpenID конфигурация
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const RETURN_URL = window.location.origin + window.location.pathname;

// ВАЖНО: Замените на ваш реальный Steam API ключ
const STEAM_API_KEY = '4BBB6B94DCBA1A35D53A77575FB84924';

// DOM элементы
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const topupBtn = document.getElementById('topupBtn');
const balanceDisplay = document.getElementById('balanceDisplay');
const balanceAmount = document.getElementById('balanceAmount');
const userInfo = document.getElementById('userInfo');
const purchaseButtons = document.querySelectorAll('.btn-purchase');
const toastContainer = document.getElementById('toastContainer');

// Модальные окна
const purchaseModal = document.getElementById('purchaseModal');
const topupModal = document.getElementById('topupModal');
const purchaseModalClose = document.getElementById('purchaseModalClose');
const topupModalClose = document.getElementById('topupModalClose');
const cancelPurchase = document.getElementById('cancelPurchase');
const confirmPurchase = document.getElementById('confirmPurchase');
const cancelTopup = document.getElementById('cancelTopup');
const confirmTopup = document.getElementById('confirmTopup');

// Элементы модала покупки
const privilegeImage = document.getElementById('privilegeImage');
const privilegeTitle = document.getElementById('privilegeTitle');
const privilegeDescription = document.getElementById('privilegeDescription');
const privilegeDuration = document.getElementById('privilegeDuration');
const privilegeFeatures = document.getElementById('privilegeFeatures');
const currentBalance = document.getElementById('currentBalance');
const privilegePrice = document.getElementById('privilegePrice');
const remainingBalance = document.getElementById('remainingBalance');
const insufficientFunds = document.getElementById('insufficientFunds');

// Элементы модала пополнения
const amountButtons = document.querySelectorAll('.amount-btn');
const customAmountInput = document.getElementById('customAmountInput');
const topupPreview = document.getElementById('topupPreview');
const topupAmount = document.getElementById('topupAmount');

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    updateUI();
    setupEventListeners();
    
    // Проверяем, вернулся ли пользователь из Steam
    checkSteamReturn();
});

// Загрузка данных пользователя из localStorage
function loadUserData() {
    try {
        const savedUser = localStorage.getItem('steamUser');
        const savedBalance = localStorage.getItem('userBalance');
        const savedLoginState = localStorage.getItem('isLoggedIn');
        
        if (savedUser && savedLoginState === 'true') {
            steamUser = JSON.parse(savedUser);
            isLoggedIn = true;
        }
        
        if (savedBalance) {
            balance = parseInt(savedBalance);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
    }
}

// Сохранение данных пользователя в localStorage
function saveUserData() {
    try {
        if (steamUser) {
            localStorage.setItem('steamUser', JSON.stringify(steamUser));
        }
        localStorage.setItem('userBalance', balance.toString());
        localStorage.setItem('isLoggedIn', isLoggedIn.toString());
    } catch (error) {
        console.error('Ошибка сохранения данных пользователя:', error);
    }
}

// Очистка данных пользователя
function clearUserData() {
    localStorage.removeItem('steamUser');
    localStorage.removeItem('isLoggedIn');
}

// Обновление интерфейса
function updateUI() {
    if (isLoggedIn && steamUser) {
        loginBtn.style.display = 'none';
        balanceDisplay.style.display = 'flex';
        userInfo.style.display = 'flex';
        balanceAmount.textContent = formatCurrency(balance);
        
        // Обновляем информацию о пользователе
        const userAvatar = document.querySelector('.user-avatar');
        const username = document.querySelector('.username');
        
        if (userAvatar && steamUser.avatar) {
            userAvatar.src = steamUser.avatar;
            userAvatar.alt = steamUser.name;
        }
        
        if (username && steamUser.name) {
            username.textContent = steamUser.name;
        }
    } else {
        loginBtn.style.display = 'flex';
        balanceDisplay.style.display = 'none';
        userInfo.style.display = 'none';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик входа
    loginBtn.addEventListener('click', handleLogin);
    
    // Обработчик выхода
    logoutBtn.addEventListener('click', handleLogout);
    
    // Обработчик пополнения
    topupBtn.addEventListener('click', () => showTopupModal());
    
    // Обработчики покупок
    purchaseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const title = this.getAttribute('data-title');
            const price = parseInt(this.getAttribute('data-price'));
            const image = this.getAttribute('data-image');
            const description = this.getAttribute('data-description');
            const duration = this.getAttribute('data-duration');
            const features = JSON.parse(this.getAttribute('data-features'));
            
            handlePurchaseClick(title, price, image, description, duration, features);
        });
    });
    
    // Обработчики модальных окон
    setupModalHandlers();
    
    // Обработчики пополнения
    setupTopupHandlers();
}

// Реальный вход через Steam OpenID
function handleLogin() {
    showToast('Перенаправление в Steam...', 'loading');
    
    // Генерируем Steam OpenID URL
    const steamLoginUrl = buildSteamOpenIDUrl();
    
    // Реальное перенаправление в Steam
    window.location.href = steamLoginUrl;
}

// Построение Steam OpenID URL
function buildSteamOpenIDUrl() {
    const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': RETURN_URL + '?steam_login=1',
        'openid.realm': window.location.origin,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });
    
    return `${STEAM_OPENID_URL}?${params.toString()}`;
}

// Проверка возврата из Steam
function checkSteamReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('steam_login') === '1') {
        // Пользователь вернулся из Steam
        const steamId = extractSteamId(urlParams);
        
        if (steamId) {
            // Получаем данные профиля через Steam Web API
            fetchSteamUserData(steamId);
        } else {
            showToast('Ошибка входа через Steam', 'error');
        }
        
        // Очищаем URL от параметров Steam
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Извлечение Steam ID из OpenID ответа
function extractSteamId(urlParams) {
    const identity = urlParams.get('openid.identity');
    if (identity) {
        const match = identity.match(/\/id\/(\d+)$/);
        return match ? match[1] : null;
    }
    return null;
}

// Получение данных пользователя Steam через ваш сервер
async function fetchSteamUserData(steamId) {
    try {
        showToast('Получение данных профиля...', 'loading');
        
        // ВАЖНО: Этот запрос должен идти через ваш сервер!
        // Steam Web API не поддерживает CORS для браузерных запросов
        
        // Пример URL для вашего серверного эндпоинта:
        const apiUrl = `/api/steam/user/${steamId}`;
        
        // Альтернативно, если у вас есть CORS proxy:
        // const apiUrl = `https://your-cors-proxy.com/steam-api/user/${steamId}`;
        
        // Для тестирования без сервера можно использовать публичный CORS proxy:
        const corsProxy = 'https://api.allorigins.win/get?url=';
        const steamApiUrl = encodeURIComponent(
            `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`
        );
        const testUrl = corsProxy + steamApiUrl;
        
        const response = await fetch(testUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Если используется CORS proxy, данные будут в data.contents
        const userData = data.contents ? JSON.parse(data.contents) : data;
        
        if (userData.response && userData.response.players.length > 0) {
            const player = userData.response.players[0];
            
            steamUser = {
                steamId: player.steamid,
                name: player.personaname,
                avatar: player.avatarmedium || player.avatar,
                avatarFull: player.avatarfull || player.avatar
            };
            
            isLoggedIn = true;
            saveUserData();
            updateUI();
            
            dismissLoadingToast();
            showToast(`Добро пожаловать, ${steamUser.name}!`, 'success');
        } else {
            throw new Error('Нет данных профиля Steam');
        }
    } catch (error) {
        console.error('Ошибка получения данных Steam:', error);
        dismissLoadingToast();
        
        if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
            showToast('Ошибка CORS. Настройте серверную часть для работы с Steam API.', 'error');
            console.log(`
🚨 CORS Error: Steam Web API не поддерживает браузерные запросы.

Решения:
1. Настройте серверную часть (PHP/Node.js/Python)
2. Используйте CORS proxy сервис
3. Обновите STEAM_API_KEY на настоящий ключ

Подробности в файле STEAM_INTEGRATION.md
            `);
        } else {
            showToast('Ошибка получения данных Steam', 'error');
        }
    }
}

// Обработка выхода
function handleLogout() {
    isLoggedIn = false;
    steamUser = null;
    clearUserData();
    updateUI();
    showToast('Вы вышли из системы', 'info');
}

// Настройка обработчиков модальных окон
function setupModalHandlers() {
    // Закрытие модальных окон
    purchaseModalClose.addEventListener('click', closePurchaseModal);
    topupModalClose.addEventListener('click', closeTopupModal);
    cancelPurchase.addEventListener('click', closePurchaseModal);
    cancelTopup.addEventListener('click', closeTopupModal);
    
    // Подтверждение покупки
    confirmPurchase.addEventListener('click', handlePurchaseConfirm);
    
    // Подтверждение пополнения
    confirmTopup.addEventListener('click', handleTopupConfirm);
    
    // Закрытие по клику на overlay
    purchaseModal.addEventListener('click', function(e) {
        if (e.target === purchaseModal) {
            closePurchaseModal();
        }
    });
    
    topupModal.addEventListener('click', function(e) {
        if (e.target === topupModal) {
            closeTopupModal();
        }
    });
    
    // Закрытие по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePurchaseModal();
            closeTopupModal();
        }
    });
}

// Настройка обработчиков пополнения
function setupTopupHandlers() {
    // Кнопки быстрого пополнения
    amountButtons.forEach(button => {
        button.addEventListener('click', function() {
            const amount = parseInt(this.getAttribute('data-amount'));
            selectTopupAmount(amount, this);
        });
    });
    
    // Ввод произвольной суммы
    customAmountInput.addEventListener('input', function() {
        const amount = parseFloat(this.value) || 0;
        selectCustomAmount(amount);
    });
}

// Обработка клика по покупке
function handlePurchaseClick(title, price, image, description, duration, features) {
    if (!isLoggedIn) {
        showToast('Пожалуйста, войдите через Steam для покупки привилегий', 'error');
        return;
    }
    
    selectedPrivilege = {
        title,
        price,
        image,
        description,
        duration,
        features
    };
    
    showPurchaseModal();
}

// Показать модал покупки
function showPurchaseModal() {
    if (!selectedPrivilege) return;
    
    // Заполняем данные
    privilegeImage.src = selectedPrivilege.image;
    privilegeImage.alt = selectedPrivilege.title;
    privilegeTitle.textContent = selectedPrivilege.title;
    privilegeDescription.textContent = selectedPrivilege.description;
    privilegeDuration.textContent = selectedPrivilege.duration;
    
    // Заполняем возможности
    privilegeFeatures.innerHTML = '';
    const featuresToShow = selectedPrivilege.features.slice(0, 3);
    featuresToShow.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        privilegeFeatures.appendChild(li);
    });
    
    if (selectedPrivilege.features.length > 3) {
        const extraLi = document.createElement('li');
        extraLi.textContent = `+${selectedPrivilege.features.length - 3} дополнительных возможностей`;
        extraLi.style.color = '#94a3b8';
        privilegeFeatures.appendChild(extraLi);
    }
    
    // Обновляем баланс
    currentBalance.textContent = formatCurrency(balance);
    privilegePrice.textContent = formatCurrency(selectedPrivilege.price);
    
    const remaining = balance - selectedPrivilege.price;
    remainingBalance.textContent = formatCurrency(remaining);
    
    // Проверяем достаточность средств
    const hasEnoughBalance = balance >= selectedPrivilege.price;
    if (hasEnoughBalance) {
        remainingBalance.style.color = '#10b981';
        insufficientFunds.style.display = 'none';
        confirmPurchase.disabled = false;
        confirmPurchase.textContent = `Купить за ${formatCurrency(selectedPrivilege.price)}`;
    } else {
        remainingBalance.style.color = '#ef4444';
        insufficientFunds.style.display = 'block';
        confirmPurchase.disabled = true;
        confirmPurchase.textContent = 'Недостаточно средств';
    }
    
    purchaseModal.classList.add('show');
}

// Закрыть модал покупки
function closePurchaseModal() {
    purchaseModal.classList.remove('show');
    selectedPrivilege = null;
}

// Подтверждение покупки
function handlePurchaseConfirm() {
    if (!selectedPrivilege) return;
    
    if (selectedPrivilege.price > balance) {
        showToast('Недостаточно средств на балансе', 'error');
        closePurchaseModal();
        return;
    }
    
    // Списываем средства с баланса
    balance -= selectedPrivilege.price;
    saveUserData();
    updateUI();
    showToast(`Привилегия "${selectedPrivilege.title}" успешно приобретена за ${formatCurrency(selectedPrivilege.price)}!`, 'success');
    closePurchaseModal();
    
    // Здесь можно добавить отправку данных о покупке на сервер
    sendPurchaseToServer(selectedPrivilege);
}

// Отправка данных о покупке на сервер
async function sendPurchaseToServer(privilege) {
    try {
        const purchaseData = {
            steamId: steamUser.steamId,
            privilegeName: privilege.title,
            price: privilege.price,
            timestamp: new Date().toISOString()
        };
        
        // Замените на ваш серверный эндпоинт
        const response = await fetch('/api/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(purchaseData)
        });
        
        if (response.ok) {
            console.log('Покупка успешно отправлена на сервер');
        }
    } catch (error) {
        console.error('Ошибка отправки покупки на сервер:', error);
    }
}

// Показать модал пополнения
function showTopupModal() {
    // Сбрасываем выбор
    selectedTopupAmount = 0;
    amountButtons.forEach(btn => btn.classList.remove('selected'));
    customAmountInput.value = '';
    updateTopupPreview();
    
    topupModal.classList.add('show');
}

// Закрыть модал пополнения
function closeTopupModal() {
    topupModal.classList.remove('show');
}

// Выбор суммы пополнения
function selectTopupAmount(amount, button) {
    selectedTopupAmount = amount;
    customAmountInput.value = '';
    
    // Обновляем UI кнопок
    amountButtons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    
    updateTopupPreview();
}

// Выбор произвольной суммы
function selectCustomAmount(amount) {
    selectedTopupAmount = amount;
    
    // Убираем выделение с кнопок
    amountButtons.forEach(btn => btn.classList.remove('selected'));
    
    updateTopupPreview();
}

// Обновление превью пополнения
function updateTopupPreview() {
    if (selectedTopupAmount > 0) {
        topupPreview.style.display = 'block';
        topupAmount.textContent = formatCurrency(selectedTopupAmount);
        confirmTopup.disabled = false;
        confirmTopup.textContent = `Пополнить на ${formatCurrency(selectedTopupAmount)}`;
    } else {
        topupPreview.style.display = 'none';
        confirmTopup.disabled = true;
        confirmTopup.textContent = 'Введите сумму';
    }
}

// Подтверждение пополнения
function handleTopupConfirm() {
    if (selectedTopupAmount <= 0) return;
    
    balance += selectedTopupAmount;
    saveUserData();
    updateUI();
    showToast(`Баланс пополнен на ${formatCurrency(selectedTopupAmount)}!`, 'success');
    closeTopupModal();
}

// Форматирование валюты
function formatCurrency(amount) {
    return amount.toLocaleString('ru-RU') + ' ₽';
}

// Показ уведомлений
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const content = document.createElement('div');
    content.className = 'toast-content';
    content.textContent = message;
    
    toast.appendChild(content);
    toastContainer.appendChild(toast);
    
    // Показываем уведомление
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Автоматическое скрытие через 3 секунды (кроме loading)
    if (type !== 'loading') {
        setTimeout(() => {
            hideToast(toast);
        }, 3000);
    }
    
    return toast;
}

// Скрытие уведомления
function hideToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// Скрытие loading уведомления
function dismissLoadingToast() {
    const loadingToasts = document.querySelectorAll('.toast.loading');
    loadingToasts.forEach(toast => {
        hideToast(toast);
    });
}

// Экспортируем функции для внешнего использования
window.privilegeStore = {
    updateBalance,
    loginUser,
    getCurrentUser,
    showToast,
    handlePurchaseClick,
    showTopupModal,
    showPurchaseModal,
    clearUserData,
    saveUserData,
    loadUserData
};

// Функция для обновления баланса
function updateBalance(newBalance) {
    balance = newBalance;
    saveUserData();
    updateUI();
}

// Функция для программного входа пользователя
function loginUser(userData) {
    steamUser = userData;
    isLoggedIn = true;
    saveUserData();
    updateUI();
}

// Функция для получения текущих данных пользователя
function getCurrentUser() {
    return {
        isLoggedIn,
        steamUser,
        balance
    };
}

// Инструкции для разработчика
if (STEAM_API_KEY === '4BBB6B94DCBA1A35D53A77575FB84924') {
    console.warn(`
🔑 НАСТРОЙКА STEAM API

1. Замените YOUR_STEAM_API_KEY_HERE на ваш настоящий Steam API ключ
2. Настройте серверную часть для обработки Steam API запросов
3. Обновите URL в fetchSteamUserData() на ваш серверный эндпоинт

Получить Steam API ключ: https://steamcommunity.com/dev/apikey
Инструкции: STEAM_INTEGRATION.md
    `);
}