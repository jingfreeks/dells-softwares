-- Optional sample catalog for local testing.
-- Run after signing up as an admin (so a store row already exists), then
-- replace :store_id with your store's id from `select id from stores;`.

insert into products (store_id, barcode, name, price, stock, low_stock_threshold, category) values
  (:'store_id', '4801234567890', 'Lola''s Chicharon Pork Rinds', 35, 42, 10, 'Snacks & Chips'),
  (:'store_id', '4801234567906', 'Ube Crackers', 28, 8, 10, 'Snacks & Chips'),
  (:'store_id', '4801234567913', 'Corned Beef 150g', 45, 25, 8, 'Canned Goods'),
  (:'store_id', '4801234567920', 'Sardines in Tomato Sauce', 22, 60, 15, 'Canned Goods'),
  (:'store_id', '4801234567937', 'Softdrink 1.5L', 65, 3, 5, 'Drinks & Beverages'),
  (:'store_id', null, 'Shampoo Sachet (Tingi)', 8, 120, 20, 'Household Essentials'),
  (:'store_id', null, 'Load — ₱20 Prepaid', 20, 999, 0, 'Load & E-load'),
  (:'store_id', '4801234567951', 'Rice 1kg', 58, 30, 10, 'Rice & Basic Goods');
