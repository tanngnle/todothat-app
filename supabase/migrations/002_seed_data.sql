-- ═══════════════════════════════════════════════════════════════
-- Seed Data: Default expense categories, wallets, and people
-- Based on the user's Vietnamese expense tracking spreadsheet
-- ═══════════════════════════════════════════════════════════════

-- NOTE: This seed file uses auth.uid() which requires an authenticated user.
-- Run this AFTER creating your account. Replace the user_id references.
-- Or run via Supabase Dashboard SQL Editor while logged in.

-- ═══════════════════════════════════════════
-- DEFAULT WALLETS
-- ═══════════════════════════════════════════

INSERT INTO wallets (user_id, name, type, icon, color, sort_order) VALUES
  (auth.uid(), 'Tiền mặt',      'cash',    '💵', '#4CAF50', 1),
  (auth.uid(), 'Vietcombank',   'bank',    '🏦', '#1565C0', 2),
  (auth.uid(), 'Timo',          'bank',    '🏦', '#00897B', 3),
  (auth.uid(), 'BIDV',          'bank',    '🏦', '#E65100', 4),
  (auth.uid(), 'MoMo',          'ewallet', '📱', '#E91E63', 5),
  (auth.uid(), 'ZaloPay',       'ewallet', '📱', '#1976D2', 6),
  (auth.uid(), 'Tikop',         'ewallet', '📱', '#7B1FA2', 7),
  (auth.uid(), 'Fmarket',       'ewallet', '📱', '#FF6F00', 8),
  (auth.uid(), 'Infina',        'ewallet', '📱', '#0097A7', 9);

-- ═══════════════════════════════════════════
-- EXPENSE CATEGORIES (Chi)
-- ═══════════════════════════════════════════

-- Top-level expense categories
INSERT INTO expense_categories (user_id, name, name_vi, type, icon, sort_order) VALUES
  (auth.uid(), 'Ăn uống',     'Ăn uống',     'expense', '🍔', 1),
  (auth.uid(), 'Di chuyển',   'Di chuyển',   'expense', '🚗', 2),
  (auth.uid(), 'Du lịch',     'Du lịch',     'expense', '✈️', 3),
  (auth.uid(), 'Eliz',        'Eliz',        'expense', '👩', 4),
  (auth.uid(), 'Giải trí',    'Giải trí',    'expense', '🎮', 5),
  (auth.uid(), 'Giáo dục',    'Giáo dục',    'expense', '📚', 6),
  (auth.uid(), 'Hóa đơn',     'Hóa đơn',     'expense', '💡', 7),
  (auth.uid(), 'Khác',        'Khác',        'expense', '📦', 8),
  (auth.uid(), 'Làm đẹp',     'Làm đẹp',     'expense', '💄', 9),
  (auth.uid(), 'Mua sắm',     'Mua sắm',     'expense', '🛒', 10),
  (auth.uid(), 'Sức khỏe',    'Sức khỏe',    'expense', '💊', 11);

-- Sub-categories for Ăn uống (Food & Drink)
INSERT INTO expense_categories (user_id, name, name_vi, type, parent_id, sort_order)
SELECT auth.uid(), sub.name, sub.name_vi, 'expense', ec.id, sub.sort_order
FROM (VALUES
  ('Tiền ăn',    'Tiền ăn',    1),
  ('Tiền uống',  'Tiền uống',  2)
) AS sub(name, name_vi, sort_order)
CROSS JOIN (SELECT id FROM expense_categories WHERE name = 'Ăn uống' AND user_id = auth.uid() AND parent_id IS NULL LIMIT 1) ec;

-- Sub-categories for Di chuyển (Transport)
INSERT INTO expense_categories (user_id, name, name_vi, type, parent_id, sort_order)
SELECT auth.uid(), sub.name, sub.name_vi, 'expense', ec.id, sub.sort_order
FROM (VALUES
  ('Xăng',        'Xăng',        1),
  ('Grab/Be/Bus', 'Grab/Be/Bus', 2),
  ('Gửi xe',      'Gửi xe',      3),
  ('Ship',        'Ship',        4),
  ('Bảo dưỡng',   'Bảo dưỡng',   5)
) AS sub(name, name_vi, sort_order)
CROSS JOIN (SELECT id FROM expense_categories WHERE name = 'Di chuyển' AND user_id = auth.uid() AND parent_id IS NULL LIMIT 1) ec;

-- Sub-categories for Du lịch (Travel)
INSERT INTO expense_categories (user_id, name, name_vi, type, parent_id, sort_order)
SELECT auth.uid(), 'Du lịch', 'Du lịch', 'expense', ec.id, 1
FROM (SELECT id FROM expense_categories WHERE name = 'Du lịch' AND user_id = auth.uid() AND parent_id IS NULL LIMIT 1) ec;

-- Sub-categories for Eliz (Personal)
INSERT INTO expense_categories (user_id, name, name_vi, type, parent_id, sort_order)
SELECT auth.uid(), sub.name, sub.name_vi, 'expense', ec.id, sub.sort_order
FROM (VALUES
  ('Đồ', 'Đồ', 1),
  ('Rum', 'Rum', 2)
) AS sub(name, name_vi, sort_order)
CROSS JOIN (SELECT id FROM expense_categories WHERE name = 'Eliz' AND user_id = auth.uid() AND parent_id IS NULL LIMIT 1) ec;

-- Sub-categories for Giải trí (Entertainment)
INSERT INTO expense_categories (user_id, name, name_vi, type, parent_id, sort_order)
SELECT auth.uid(), sub.name, sub.name_vi, 'expense', ec.id, sub.sort_order
FROM (VALUES
  ('Đi lượn',   'Đi lượn',   1),
  ('Tiệc tùng', 'Tiệc tùng', 2),
  ('Meet-ups',  'Meet-ups',  3)
) AS sub(name, name_vi, sort_order)
CROSS JOIN (SELECT id FROM expense_categories WHERE name = 'Giải trí' AND user_id = auth.uid() AND parent_id IS NULL LIMIT 1) ec;

-- Sub-categories for Giáo dục (Education)
INSERT INTO expense_categories (user_id, name, name_vi, type, parent_id, sort_order)
SELECT auth.uid(), sub.name, sub.name_vi, 'expense', ec.id, sub.sort_order
FROM (VALUES
  ('Sách',      'Sách',      1),
  ('Khóa học',  'Khóa học',  2),
  ('Workshop',  'Workshop',  3)
) AS sub(name, name_vi, sort_order)
CROSS JOIN (SELECT id FROM expense_categories WHERE name = 'Giáo dục' AND user_id = auth.uid() AND parent_id IS NULL LIMIT 1) ec;

-- Sub-categories for Hóa đơn (Bills)
INSERT INTO expense_categories (user_id, name, name_vi, type, parent_id, sort_order)
SELECT auth.uid(), sub.name, sub.name_vi, 'expense', ec.id, sub.sort_order
FROM (VALUES
  ('Tiền ĐT + 3G',       'Tiền ĐT + 3G',       1),
  ('Tiền nhà',            'Tiền nhà',            2),
  ('Tiền Gói Đăng ký',    'Tiền Gói Đăng ký',    3)
) AS sub(name, name_vi, sort_order)
CROSS JOIN (SELECT id FROM expense_categories WHERE name = 'Hóa đơn' AND user_id = auth.uid() AND parent_id IS NULL LIMIT 1) ec;

-- Sub-categories for Khác (Other)
INSERT INTO expense_categories (user_id, name, name_vi, type, parent_id, sort_order)
SELECT auth.uid(), sub.name, sub.name_vi, 'expense', ec.id, sub.sort_order
FROM (VALUES
  ('Khác',                   'Khác',                   1),
  ('Cho tiền',               'Cho tiền',               2),
  ('Nghĩa vụ/Bắt buộc',      'Nghĩa vụ/Bắt buộc',      3)
) AS sub(name, name_vi, sort_order)
CROSS JOIN (SELECT id FROM expense_categories WHERE name = 'Khác' AND user_id = auth.uid() AND parent_id IS NULL LIMIT 1) ec;

-- Sub-categories for Làm đẹp (Beauty)
INSERT INTO expense_categories (user_id, name, name_vi, type, parent_id, sort_order)
SELECT auth.uid(), sub.name, sub.name_vi, 'expense', ec.id, sub.sort_order
FROM (VALUES
  ('Spa',       'Spa',       1),
  ('Cắt tóc',   'Cắt tóc',   2),
  ('Mỹ phẩm',   'Mỹ phẩm',   3)
) AS sub(name, name_vi, sort_order)
CROSS JOIN (SELECT id FROM expense_categories WHERE name = 'Làm đẹp' AND user_id = auth.uid() AND parent_id IS NULL LIMIT 1) ec;

-- Sub-categories for Mua sắm (Shopping)
INSERT INTO expense_categories (user_id, name, name_vi, type, parent_id, sort_order)
SELECT auth.uid(), sub.name, sub.name_vi, 'expense', ec.id, sub.sort_order
FROM (VALUES
  ('Quần áo',          'Quần áo',          1),
  ('Giày dép',         'Giày dép',         2),
  ('Phụ kiện',         'Phụ kiện',         3),
  ('Thiết bị điện tử', 'Thiết bị điện tử', 4),
  ('Vật dụng',         'Vật dụng',         5),
  ('Quà tặng',         'Quà tặng',         6)
) AS sub(name, name_vi, sort_order)
CROSS JOIN (SELECT id FROM expense_categories WHERE name = 'Mua sắm' AND user_id = auth.uid() AND parent_id IS NULL LIMIT 1) ec;

-- Sub-categories for Sức khỏe (Health)
INSERT INTO expense_categories (user_id, name, name_vi, type, parent_id, sort_order)
SELECT auth.uid(), sub.name, sub.name_vi, 'expense', ec.id, sub.sort_order
FROM (VALUES
  ('Thể thao',          'Thể thao',          1),
  ('Khám chữa bệnh',    'Khám chữa bệnh',    2),
  ('Thuốc',             'Thuốc',             3),
  ('Chăm sóc cá nhân',  'Chăm sóc cá nhân',  4)
) AS sub(name, name_vi, sort_order)
CROSS JOIN (SELECT id FROM expense_categories WHERE name = 'Sức khỏe' AND user_id = auth.uid() AND parent_id IS NULL LIMIT 1) ec;

-- ═══════════════════════════════════════════
-- INCOME CATEGORIES (Thu)
-- ═══════════════════════════════════════════

INSERT INTO expense_categories (user_id, name, name_vi, type, icon, sort_order) VALUES
  (auth.uid(), 'Bán đồ',              'Bán đồ',              'income', '🏷️', 101),
  (auth.uid(), 'Lương Full',          'Lương Full',          'income', '💰', 102),
  (auth.uid(), 'Lương Part',          'Lương Part',          'income', '💰', 103),
  (auth.uid(), 'Tích lũy',            'Tích lũy',            'income', '🏦', 104),
  (auth.uid(), 'Trả mượn / Được tặng','Trả mượn / Được tặng','income', '🎁', 105);

-- ═══════════════════════════════════════════
-- DEFAULT PEOPLE
-- ═══════════════════════════════════════════

INSERT INTO people (user_id, name, relationship) VALUES
  (auth.uid(), 'Tuntun', 'Cá nhân'),
  (auth.uid(), 'Nunu',   'Người yêu');
