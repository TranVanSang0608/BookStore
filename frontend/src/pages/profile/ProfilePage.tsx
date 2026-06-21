import { useMutation } from '@tanstack/react-query'
import { Check, Heart, Lock, LogOut, MapPin, Package, User as UserIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resendVerificationApi } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import AddressBook from './AddressBook'
import ChangePasswordForm from './ChangePasswordForm'
import ProfileInfoForm from './ProfileInfoForm'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

type Section = 'info' | 'password' | 'address'

// Trang "Tài khoản của tôi" — dạng hub: sidebar trái (hồ sơ + menu) + nội dung phải.
// Đổi mật khẩu CHỈ hiện khi chọn mục đó (không bày sẵn mọi form như trước).
export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('info')
  useDocumentTitle('Tài khoản của tôi')

  // Gửi lại email xác thực (nếu chưa xác minh)
  const resendMutation = useMutation({ mutationFn: resendVerificationApi })

  function handleLogout() {
    logout()
    navigate('/')
  }

  function navBtnClass(active: boolean) {
    return `flex items-center gap-2 ${active ? 'bg-primary/10 text-primary font-semibold' : ''}`
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-base-content mb-6">Tài khoản của tôi</h1>

      <div className="grid md:grid-cols-[260px_1fr] gap-6 items-start">
        {/* ===== SIDEBAR ===== */}
        <aside className="space-y-4">
          {/* Thẻ hồ sơ */}
          <div className="bg-base-100 border border-base-300 rounded-box p-5 text-center">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-content flex items-center justify-center text-2xl font-serif font-semibold mx-auto">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <p className="font-semibold mt-3">{user?.name}</p>
            <p className="text-xs text-base-content/60 break-all">{user?.email}</p>

            {/* Trạng thái xác minh email */}
            {user?.email_verified ? (
              <span className="badge badge-success badge-sm gap-1 mt-3">
                <Check size={12} /> Email đã xác minh
              </span>
            ) : (
              <div className="mt-3 space-y-1">
                <span className="badge badge-warning badge-sm">Email chưa xác minh</span>
                {resendMutation.isSuccess ? (
                  <p className="text-xs text-success">Đã gửi lại email xác thực</p>
                ) : (
                  <button
                    onClick={() => resendMutation.mutate()}
                    disabled={resendMutation.isPending}
                    className="btn btn-ghost btn-xs"
                  >
                    Gửi lại email
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Menu điều hướng */}
          <ul className="menu bg-base-100 border border-base-300 rounded-box p-2 w-full">
            <li>
              <button className={navBtnClass(section === 'info')} onClick={() => setSection('info')}>
                <UserIcon size={16} /> Thông tin cá nhân
              </button>
            </li>
            <li>
              <button
                className={navBtnClass(section === 'password')}
                onClick={() => setSection('password')}
              >
                <Lock size={16} /> Đổi mật khẩu
              </button>
            </li>
            <li>
              <button
                className={navBtnClass(section === 'address')}
                onClick={() => setSection('address')}
              >
                <MapPin size={16} /> Sổ địa chỉ
              </button>
            </li>
            <li>
              <Link to="/orders" className="flex items-center gap-2">
                <Package size={16} /> Đơn hàng của tôi
              </Link>
            </li>
            <li>
              <Link to="/wishlist" className="flex items-center gap-2">
                <Heart size={16} /> Sách yêu thích
              </Link>
            </li>
            <li>
              <button onClick={handleLogout} className="flex items-center gap-2 text-error">
                <LogOut size={16} /> Đăng xuất
              </button>
            </li>
          </ul>
        </aside>

        {/* ===== NỘI DUNG ===== */}
        <div>
          {section === 'info' && <ProfileInfoForm />}
          {section === 'password' && <ChangePasswordForm />}
          {section === 'address' && <AddressBook />}
        </div>
      </div>
    </div>
  )
}
