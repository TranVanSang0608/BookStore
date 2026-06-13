import { apiClient } from './client'

interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface UploadResult {
  url: string
  public_id: string
}

// Upload ảnh lên backend (backend đẩy tiếp lên Cloudinary) → nhận URL.
// FE sau đó gắn URL này vào payload JSON khi tạo/sửa sách hoặc tác giả.
export async function uploadImageApi(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('image', file) // 'image' = tên field multer chờ ở backend

  // axios tự đặt Content-Type: multipart/form-data khi body là FormData
  const { data } = await apiClient.post<ApiResponse<UploadResult>>('/uploads', formData)
  return data.data
}
