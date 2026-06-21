-- Bật extension unaccent để tìm kiếm KHÔNG PHÂN BIỆT DẤU tiếng Việt
-- (vd gõ "dac nhan tam" vẫn khớp "Đắc Nhân Tâm"). Idempotent, không phá dữ liệu.
CREATE EXTENSION IF NOT EXISTS unaccent;
