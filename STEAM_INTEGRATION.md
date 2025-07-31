# Steam Integration Guide для Delta MediumRP

## 🔧 Настройка реальной Steam аутентификации

### 1. Обновление API ключа

В файле `script.js` замените `YOUR_STEAM_API_KEY_HERE` на ваш настоящий Steam API ключ:

```javascript
const STEAM_API_KEY = '4BBB6B94DCBA1A35D53A77575FB84924;
```

### 2. Серверная часть (ОБЯЗАТЕЛЬНО)

Steam Web API не поддерживает CORS для браузерных запросов. Вам нужна серверная часть:

#### Node.js + Express:

```javascript
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const STEAM_API_KEY = '4BBB6B94DCBA1A35D53A77575FB84924';

// Эндпоинт для получения данных профиля Steam
app.get('/api/steam/user/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        const response = await axios.get(
            `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Steam API error:', error);
        res.status(500).json({ error: 'Failed to fetch Steam data' });
    }
});

// Эндпоинт для сохранения покупок
app.post('/api/purchase', async (req, res) => {
    try {
        const { steamId, privilegeName, price, timestamp } = req.body;
        
        // Здесь сохраните покупку в базу данных
        console.log('New purchase:', { steamId, privilegeName, price, timestamp });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Purchase save error:', error);
        res.status(500).json({ error: 'Failed to save purchase' });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

#### PHP:

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$steamApiKey = '4BBB6B94DCBA1A35D53A77575FB84924';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['steamid'])) {
    $steamId = $_GET['steamid'];
    $url = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" . $steamApiKey . "&steamids=" . $steamId;
    
    $response = file_get_contents($url);
    if ($response === FALSE) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch Steam data']);
    } else {
        echo $response;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Сохранение покупки в базу данных
    $steamId = $input['steamId'];
    $privilegeName = $input['privilegeName'];
    $price = $input['price'];
    $timestamp = $input['timestamp'];
    
    // Подключение к базе данных и сохранение
    // ...
    
    echo json_encode(['success' => true]);
}
?>
```

#### Python + Flask:

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

STEAM_API_KEY = '4BBB6B94DCBA1A35D53A77575FB84924'

@app.route('/api/steam/user/<steam_id>')
def get_steam_user(steam_id):
    try:
        url = f'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={STEAM_API_KEY}&steamids={steam_id}'
        response = requests.get(url)
        return response.json()
    except Exception as e:
        return {'error': 'Failed to fetch Steam data'}, 500

@app.route('/api/purchase', methods=['POST'])
def save_purchase():
    try:
        data = request.json
        # Сохранение покупки в базу данных
        print(f"New purchase: {data}")
        return {'success': True}
    except Exception as e:
        return {'error': 'Failed to save purchase'}, 500

if __name__ == '__main__':
    app.run(debug=True, port=3000)
```

### 3. Обновление клиентского кода

В `script.js` обновите URL в функции `fetchSteamUserData`:

```javascript
// Замените тестовый CORS proxy на ваш серверный эндпоинт
const apiUrl = `/api/steam/user/${steamId}`;
// или полный URL если сервер на другом домене:
// const apiUrl = `https://your-api-domain.com/api/steam/user/${steamId}`;

const response = await fetch(apiUrl);
const userData = await response.json();

// Убираем обработку CORS proxy
// const userData = data.contents ? JSON.parse(data.contents) : data;
```

### 4. База данных для покупок

```sql
CREATE DATABASE deltarp_store;

USE deltarp_store;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    steam_id VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    balance DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    steam_id VARCHAR(20) NOT NULL,
    privilege_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('completed', 'pending', 'failed') DEFAULT 'completed',
    INDEX idx_steam_id (steam_id),
    INDEX idx_purchased_at (purchased_at)
);

CREATE TABLE balance_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    steam_id VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('topup', 'purchase', 'refund') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_steam_id (steam_id)
);
```

### 5. Интеграция с игровым сервером

Добавьте webhook уведомления для синхронизации с игровым сервером:

```javascript
// В серверной части после сохранения покупки
async function notifyGameServer(steamId, privilegeName) {
    try {
        await fetch('http://deltascpsl.com/api/add-privilege', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steamId,
                privilege: privilegeName,
                duration: 30 // дни
            })
        });
    } catch (error) {
        console.error('Failed to notify game server:', error);
    }
}
```

### 6. Безопасность

#### Валидация Steam OpenID:

```javascript
function validateSteamLogin(params) {
    const requiredParams = [
        'openid.ns',
        'openid.mode',
        'openid.op_endpoint',
        'openid.claimed_id',
        'openid.identity',
        'openid.return_to',
        'openid.response_nonce',
        'openid.assoc_handle',
        'openid.signed',
        'openid.sig'
    ];
    
    // Проверяем наличие всех обязательных параметров
    for (const param of requiredParams) {
        if (!params[param]) {
            return false;
        }
    }
    
    // Проверяем домен
    if (!params['openid.op_endpoint'].includes('steamcommunity.com')) {
        return false;
    }
    
    return true;
}
```

### 7. Тестирование

1. **Локальное тестирование:**
   - Запустите сервер на localhost:3000
   - Обновите RETURN_URL в script.js на localhost
   - Тестируйте вход через Steam

2. **Продакшен:**
   - Разместите сайт на домене с HTTPS
   - Обновите настройки Steam API на реальный домен
   - Настройте SSL сертификаты

### 8. Возможные проблемы

#### CORS ошибки:
```javascript
// Если видите ошибки CORS, убедитесь что:
// 1. Сервер настроен правильно
// 2. URL в fetchSteamUserData указывает на ваш сервер
// 3. Steam API ключ корректный
```

#### Steam OpenID не работает:
- Проверьте домен в настройках Steam API
- Убедитесь что используете HTTPS
- Проверьте правильность RETURN_URL

### 9. Мониторинг

Добавьте логирование:

```javascript
// В серверной части
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Логирование ошибок
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});
```

### 10. Готовность к продакшену

Чекл-лист:
- ✅ Steam API ключ заменен на настоящий
- ✅ Серверная часть настроена и работает
- ✅ База данных создана
- ✅ HTTPS настроен
- ✅ Домен добавлен в Steam API настройки
- ✅ Тестирование пройдено
- ✅ Мониторинг настроен

После выполнения всех шагов ваш сайт будет полностью готов для реальной работы с Steam!