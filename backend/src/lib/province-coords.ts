import fs from 'node:fs';
import path from 'node:path';

// Tọa độ tâm hành chính ước lượng 34 tỉnh — đọc 1 lần lúc import từ file đóng băng ở prisma/data
// (cùng chỗ vn-locations.json). Path từ __dirname: src/lib (dev tsx) hoặc dist/lib (prod) đều 2
// cấp dưới backend → prisma/data luôn đúng. Dùng cho tính khoảng cách kho→tỉnh (D62).
export interface ProvinceCoord {
  name: string;
  lat: number;
  lng: number;
}

const file = path.join(__dirname, '../../prisma/data/vn-provinces-latlng.json');
const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
  provinces: Record<string, ProvinceCoord>;
};

export const PROVINCE_COORDS: Record<string, ProvinceCoord> = raw.provinces;
