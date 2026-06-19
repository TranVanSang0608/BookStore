import AddressBook from './AddressBook'
import ChangePasswordForm from './ChangePasswordForm'
import ProfileInfoForm from './ProfileInfoForm'

// Trang "Tài khoản của tôi" — 3 khối độc lập, mỗi khối tự quản state + mutation riêng
export default function ProfilePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="font-serif text-3xl font-semibold text-base-content">Tài khoản của tôi</h1>
      <ProfileInfoForm />
      <ChangePasswordForm />
      <AddressBook />
    </div>
  )
}
