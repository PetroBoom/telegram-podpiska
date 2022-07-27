const NodeCache = require("node-cache")
const cacheBlock = new NodeCache()
const TelegramBot = require("node-telegram-bot-api")
const mysql = require('mysql');

var bot = new TelegramBot('5425421186:AAGdA0SSN6grY0gQcT7_4FX6jeR9vuod_pY', { polling: true });

var con = mysql.createConnection({
    host: "localhost",
    user: "admin",
    password: "",
    database: "admin"
});

con.connect(function(err) {
    if (err) throw err;
    console.log("> Подключение к базе данных выполнено.");
});

function pass_gen(len) {
    chrs = 'abdehkmnpswxzABDEFGHKMNPQRSTWXZ123456789';
    var str = '';
    for (var i = 0; i < len; i++) {
        var pos = Math.floor(Math.random() * chrs.length);
        str += chrs.substring(pos,pos+1);
    }
    return str;
}

async function searchUser(id, cache) {
    if (cache == true) {
        console.log('> Результат получается из кеша.');
        var user = cacheBlock.get(id);
        if (user != undefined) return user;
    }
    return new Promise(function(resolve) {
        con.query('SELECT * FROM users_bot WHERE telegramId = ?', [id], function(error, results) {
            if (error) return resolve(false);
            if (results.length == 0) {
                var time = Math.round(+new Date() / 1000);
                con.query('INSERT INTO `users_bot`(`id`, `telegramId`, `created`, `balance`, `buys`) VALUES ("0", ?, ?, "0", "0");', [id, time]);
                return resolve(false);
            }
            cacheBlock.set(id, results[0]);
            return resolve(results[0]);
        });
    });
}

menuOptions = {
    parse_mode: "Markdown",
    reply_markup: JSON.stringify({
        keyboard: [
            [
                { text: "🛒 Купить" },
                { text: "🏡 Профиль" }
            ],
            [
                { text: "🆘 Помощь" }
            ]
        ],
        one_time_keyboard: false,
        resize_keyboard: true
    }),
};

function callbackData(value, params = []) {
    return value + "|" + params.join();
}

bot.on("message", async(msg) => {
    var chatId = msg.from.id;
    var text = msg.text;
    var date = msg.date;
    var time = Math.round(+new Date() / 1000);
    if ((date + 20) < time) return;
    if (text == undefined) {
        bot.sendMessage(chatId, '*🔙 Главное меню.*', menuOptions);
        return;
    }
    var profile = await searchUser(chatId, true);
    console.log(profile);
    if(text == '🛒 Купить') {
        var options = {
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{
                        text: "Spotify",
                        callback_data: callbackData('spotify')
                    }],
                    [{
                        text: "Netflix",
                        callback_data: callbackData('netflix')
                    }],
                    [{
                        text: "PS Plus",
                        callback_data: callbackData('ps_plus')
                    }],
                    [{
                        text: "Закрыть",
                        callback_data: callbackData('close')
                    }]
                ],
            }),
        };
        bot.sendMessage(chatId, '*Выберите категорию.*', options);
        return;
    } else if(text == '🏡 Профиль') {
        var options = {
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{
                        text: "Пополнить баланс",
                        callback_data: callbackData('bill')
                    }],
                    [{
                        text: "Закрыть",
                        callback_data: callbackData('close')
                    }]
                ],
            }),
        };
        bot.sendMessage(chatId, '*Ваш ID:* ' + chatId + '\n*Баланс: *' + profile['balance'] + ' руб.\n*Покупок: *' + profile['buys'] + ' шт.', options);
        return;
    } else if(text == '🆘 Помощь') {
        var options = {
            parse_mode: "Markdown",

        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{
                    text: "Связаться с нами",
                    url: 't.me/XPodpiska'
                }],
                [{
                    text: "Закрыть",
                    callback_data: callbackData('close')
                }]
            ],
        }),
    };
        bot.sendMessage(chatId, '*Правила бота*\n\n1.1\n1.2\n1.3\n\n2.1\n2.2', options);
        return;
    } else {
        bot.sendMessage(chatId, '*🔙 Главное меню.*', menuOptions);
        return;
    }
});

bot.on("callback_query", async function(msg) {
    var chatId = msg.from.id;
    var data = msg.data.split("|");
    var date = msg.date;
    var time = Math.round(+new Date() / 1000);
    if ((date + 20) < time) return;
    var value = data[0];
    if (data[1]) {
        var params = data[1].split(",");
    } else {
        var params = [];
    }
    var profile = await searchUser(chatId, true);
    if(value == 'bill') {
        var number = '79777777777';
        var options = {
            chat_id: msg.from.id,
            message_id: msg.message.message_id,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{
                        text: "Перейти к оплате",
                        url: 'https://qiwi.com/payment/form/99?extra%5B%27account%27%5D=+' + number + '&currency=643&comment=' + chatId + '&amountFraction=0&blocked%5B0%5D=account&blocked%5B1%5D=comment'
                    }]
                ]
            })
        };
        var unix_timestamp = Math.round(+new Date()) + 600000;
        var date = new Date(unix_timestamp);
        var hours = "0" + date.getHours();
        var minutes = "0" + date.getMinutes();
        var seconds = "0" + date.getSeconds();
        var day = "0" + date.getDate();
        var month = "0" + (date.getMonth() + 1);
        var year = "0000" + date.getFullYear();
        var date = day.substr(-2) + '.' + month.substr(-2) + '.' + year.substr(-2) + ' ' + hours.substr(-2) + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
        bot.editMessageText('Переведите любую сумму до `5000` рублей *на номер нашего QIWI-кошелька* с комментарием, для автоматического заполнения формы перейдите по ссылке ниже.\n\nQIWI: `+' + number + '`\nКомментарий: `' + chatId + '`\nОплатить до: `' + date + '`\n\nОплата через СБП не зачисляется, перед каждым переводом проверяйте актуальность реквизитов, указывайте точный комментарий!', options);
    } else if(value == 'close') {
        bot.deleteMessage(chatId, msg.message.message_id);
    } else if(value == 'spotify') {
        var options = {
            chat_id: msg.from.id,
            message_id: msg.message.message_id,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{
                        text: "1 месяц - 249 Р",
                        callback_data: callbackData('buy', [249, '*Spotify - 1 месяц*'])
                    }],
                    [{
                        text: "Закрыть",
                        callback_data: callbackData('close')
                    }]
                ]
            })
        };
        bot.editMessageText('*Spotify.*\nПродление подписки.', options);
    } else if(value == 'netflix') {
        var options = {
            chat_id: msg.from.id,
            message_id: msg.message.message_id,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{
                        text: "Ligth - 499 Р",
                        callback_data: callbackData('buy', [499, '*Ligth - 1 месяц*'])
                    }],
                    [{
                        text: "Standart - 749 Р",
                        callback_data: callbackData('buy', [749, '*Standart - 1 месяц*'])
                    }],
                    [{
                        text: "Best - 990 Р",

                    callback_data: callbackData('buy', [990, '*Best - 1 месяц*'])
    }],
        [{
            text: "Закрыть",
            callback_data: callbackData('close')
        }]
    ]
    })
    };
        bot.editMessageText('*Netflix.*\nВыберите тарифный план.', options);
    } else if(value == 'ps_plus') {
        var options = {
            chat_id: msg.from.id,
            message_id: msg.message.message_id,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{
                        text: "Essential - 399 Р",
                        callback_data: callbackData('buy', [399, '*Essential - 1 месяц*'])
                    }],
                    [{
                        text: "Extra - 599 Р",
                        callback_data: callbackData('buy', [599, '*Extra - 1 месяц*'])
                    }],
                    [{
                        text: "Deluxe - 699 Р",
                        callback_data: callbackData('buy', [699, '*Deluxe - 1 месяц*'])
                    }],
                    [{
                        text: "Закрыть",
                        callback_data: callbackData('close')
                    }]
                ]
            })
        };
        bot.editMessageText('*Netflix.*\nВыберите тарифный план.', options);
    } else if(value == 'buy') {
        var options = {
            chat_id: msg.from.id,
            message_id: msg.message.message_id,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{
                        text: "Подтвердить",
                        callback_data: callbackData('buy_d', params)
                    },
                        {
                            text: "Закрыть",
                            callback_data: callbackData('close')
                        }]
                ]
            })
        };
        bot.editMessageText('*' + params[1] + '*\n*Цена: *' + params[0] + ' руб.\n\nВы хотите купить?', options);
    } else if(value == 'buy_d') {
        if(profile['balance'] < params[0]) {
            var options = {
                text: "У вас недостаточно средств!",
                show_alert: true,
            };
            bot.answerCallbackQuery(msg.id, options);
            return;
        }
        con.query('UPDATE users_bot SET buys = buys + 1, balance = balance - ? WHERE telegramId = ?', [params[0], chatId]);
        cacheBlock.del(chatId);
        bot.deleteMessage(chatId, msg.message.message_id);
        var options = {
            chat_id: msg.from.id,
            message_id: msg.message.message_id,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{
                        text: "Связаться с нами",
                        url: 't.me/XPodpiska'
                    }]
                ]
            })
        };
        bot.sendMessage(chatId, '*Покупка совершена!*\n\n*Категория: *' + params[1] + '\n*Цена: *' + params[0] + ' руб.\n\nДля продления подписки напишите нашему менеджеру, используя кнопку ниже, переслав данное сообщение.', options);
    } else {
        var options = {
            text: "⛓ Запрос устарел",
            show_alert: false,
        };
        bot.answerCallbackQuery(msg.id, options);
        return;
    }
});