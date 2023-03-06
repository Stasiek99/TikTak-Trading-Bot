// Importowanie potrzebnych bibliotek i modułów
const ccxt = require('ccxt');
const talib = require('talib');
const sleep = require('await-sleep');

// Ustawienia dla giełdy Binance
const exchange = new ccxt.binance({
    apiKey: 'your_API_KEY',
    secret: 'secret_API_KEY',
});

// Symbol pary walutowej
const symbol = 'ETH/BUSD';

// Wielkość pozycji w walucie kwotowanej
const position_size = 0.1;

// Wielkość stop loss
const stop_loss_size = 0.05;

// Funkcja otwierająca pozycję
async function open_position(side) {
    const market = exchange.market(symbol);
    const order = await exchange.create_order(symbol, 'market', side, position_size, undefined, {
        'leverage': 10,
    });
    console.log(`Otwarto pozycję ${side} w cenie ${order['price']} z dźwignią finansową 10`);
    // Ustawienie stop loss
    await exchange.create_order(symbol, 'stop_loss_limit', side, position_size, undefined, {
        'stopPrice': order['price'] * (1 - stop_loss_size),
        'price': order['price'] * (1 - stop_loss_size - 0.001),
        'leverage': 10,
    });
    console.log(`Ustawiono stop loss dla pozycji ${side} w cenie ${order['price'] * (1 - stop_loss_size)}`);
}

// Funkcja zamykająca pozycję
async function close_position(side) {
    const market = exchange.market(symbol);
    const open_trades = await exchange.fetch_open_orders(symbol);
    const open_position = open_trades.find((trade) => trade.side === side);
    if (open_position) {
        const order = await exchange.create_order(symbol, 'market', side === 'buy' ? 'sell' : 'buy', position_size, undefined, {
            'leverage': 10,
        });
        console.log(`Zamknięto pozycję ${side} w cenie ${order['price']} z dźwignią finansową 10`);
    }
}

// Główna pętla programu
(async function() {
    while (true) {
      // Pobranie ceny i danych EMA
      const bars = await exchange.fetch_ohlcv(symbol, '15m', undefined, 30);
      const closes = bars.map((bar) => bar[4]);
      const ema10 = talib.EMA(closes, 10);
      const ema30 = talib.EMA(closes, 30);
      const current_price = await exchange.fetch_ticker(symbol);
  
      // Sprawdzenie warunku EMA Cross
      if (ema10.slice(-1) > ema30.slice(-1) && ema10.slice(-2, -1) < ema30.slice(-2, -1)) {
        // Otwarcie pozycji długiej
        const position_size = (await exchange.fetch_balance())[base_currency].free * 0.99;
        const stop_loss = current_price.bid * 0.95;
        const take_profit = current_price.bid * 1.03;
        await exchange.createOrder(symbol, 'market', 'buy', position_size, current_price.bid, {stop_loss, take_profit, leverage: 10});
      } else if (ema10.slice(-1) < ema30.slice(-1) && ema10.slice(-2, -1) > ema30.slice(-2, -1)) {
        // Zamknięcie pozycji długiej
        const position = await exchange.fetch_open_orders(symbol);
        await exchange.cancelOrder(position[0].id, symbol);
        await exchange.createOrder(symbol, 'market', 'sell', position[0].amount, current_price.ask, {leverage: 10});
      }
  
      // Poczekaj 15 minut przed wykonaniem kolejnego obiegu pętli
      await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000));
    }
  })();
  
