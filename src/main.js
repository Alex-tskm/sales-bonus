/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет прибыли от операции
  // purchase — это одна из записей в поле items из чека в data.purchase_records
  // _product — это продукт из коллекции data.products
  const { discount, sale_price, quantity } = purchase;
  const discountFraction = discount / 100;
  const total = sale_price * quantity * (1 - discountFraction);
  return total;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  /*    Методика расчёта бонусов в проекте такая:
    15% — для продавца, который принёс наибольшую прибыль.
    10% — для продавцов, которые по прибыли находятся на втором и третьем месте.
    5% — для всех остальных продавцов, кроме самого последнего.
    0% — для продавца на последнем месте.*/
  const { profit } = seller;

  if (index === 0) return profit * 0.15;
  if (index === 1 || index === 2) return profit * 0.1;
  if (index === total - 1) return 0;
  return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных

  // Валидация входных параметров
  function validateInputs() {
    if (
      !data ||
      !Array.isArray(data.sellers) ||
      data.sellers.length === 0 ||
      !Array.isArray(data.products) ||
      data.products.length === 0 ||
      !Array.isArray(data.purchase_records) ||
      data.purchase_records.length === 0
    ) {
      throw new Error('Некорректные входные данные');
    }
    // Проверка data
    if (typeof data !== 'object' || data === null) {
      throw new Error('Параметр data должен быть объектом');
    }

    const requiredDataKeys = [
      'customers',
      'products',
      'sellers',
      'purchase_records',
    ];
    requiredDataKeys.forEach((key) => {
      if (!Array.isArray(data[key])) {
        throw new Error(`Свойство data.${key} должно быть массивом`);
      }
    });

    // Проверка options
    if (typeof options !== 'object' || options === null) {
      throw new Error('Параметр options должен быть объектом');
    }
  }

  // Выполняем валидацию
  validateInputs();

  const { calculateRevenue, calculateBonus } = options;
  // @TODO: Проверка наличия опций
  if (!calculateRevenue) {
    throw new Error('Функция calculateRevenue не определена или null');
  }

  if (!calculateBonus) {
    throw new Error('Функция calculateBonus не определена или null');
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  // Получили список объектов продавцов для статистики
  const sellerStats = data.sellers.map((seller) => ({
    // Заполним начальными данными
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // console.log(sellerStats);

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  // Создаем индексы для быстрого доступа
  // список объектов продавцов
  // Ключом будет id, значением — запись из sellerStats
  const sellerIndex = Object.fromEntries(
    sellerStats.map((seller) => [seller.id, seller])
  );

  // console.log(sellerIndex);

  // Ключом будет sku, значением — запись из data.products
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product])
  );

  // console.log(productIndex);

  // @TODO: Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];

    //  console.log(record);
    //  console.log(seller);

    // Увеличиваем счётчики продавца
    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    // Перебираем все товары в чеке
    record.items.forEach((item) => {
      const product = productIndex[item.sku];

      //    console.log(product);
      //    console.log(item);

      // Выручка от конкретной продажи
      const revenue = calculateRevenue(item, product);

      //    console.log(revenue);

      // Себестоимость товара
      const cost = product.purchase_price * item.quantity;

      // Прибыль от продажи
      const profit = revenue - cost;

      // Прибавляем прибыль к общей прибыли продавца
      seller.profit += profit;

      // Увеличиваем счётчик проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });
  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2), // число с 2 знаками после точки
    profit: +seller.profit.toFixed(2), // число с 2 знаками после точки
    sales_count: seller.sales_count, // целое число
    top_products: seller.top_products, // массив из топ-10 товаров
    bonus: +seller.bonus.toFixed(2), // число с 2 знаками после точки
  }));
}
