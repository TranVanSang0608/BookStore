import { useQuery } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyOrders } from '../../api/orders'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../features/catalog/Pagination'
import { formatDateTime, formatPrice } from '../../lib/format'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { ORDER_STATUS_META } from '../../lib/order-status'

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  useDocumentTitle('Đơn hàng của tôi')

  const { data, isPending } = useQuery({
    queryKey: ['my-orders', page],
    queryFn: () => fetchMyOrders({ page: String(page), limit: '10' }),
  })

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="font-serif text-3xl font-semibold text-base-content">Đơn hàng của tôi</h1>

      {isPending && (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={<Package size={44} />}
          title="Bạn chưa có đơn hàng nào"
          description="Khám phá sách và đặt đơn đầu tiên nhé."
          action={
            <Link to="/books" className="btn btn-primary">
              Mua sắm ngay
            </Link>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="space-y-3">
            {data.items.map((order) => {
              const meta = ORDER_STATUS_META[order.status]
              // Tóm tắt nội dung đơn: "Mắt Biếc và 2 sản phẩm khác"
              const firstTitle = order.items[0]?.book_title ?? ''
              const more = order.items.length - 1
              // Đơn đã giao → các sách còn tồn tại được hiện link "Đánh giá" (mở trang sách + tab review)
              const reviewable = order.status === 'Delivered' ? order.items.filter((i) => i.book) : []
              return (
                <div
                  key={order.order_code}
                  className="card bg-base-100 border border-base-300 hover:border-primary/40 transition-colors"
                >
                  {/* Khu thông tin chính bấm vào để xem chi tiết đơn (Link riêng, không lồng link đánh giá) */}
                  <Link
                    to={`/orders/${order.order_code}`}
                    className="card-body p-4 flex-row items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="space-y-0.5">
                      <p className="font-serif font-semibold text-lg">{order.order_code}</p>
                      <p className="text-sm text-base-content/70">
                        {firstTitle}
                        {more > 0 && ` và ${more} sản phẩm khác`}
                      </p>
                      <p className="text-xs text-base-content/70">{formatDateTime(order.placed_at)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className={`badge ${meta.badge}`}>{meta.label}</span>
                      <p className="font-bold text-primary">{formatPrice(order.total)}</p>
                    </div>
                  </Link>

                  {reviewable.length > 0 && (
                    <div className="px-4 pb-3 -mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="text-base-content/70">★ Đánh giá:</span>
                      {reviewable.map((i, idx) => (
                        <Link
                          key={idx}
                          to={`/books/${i.book!.slug}?tab=reviews`}
                          className="link link-primary"
                        >
                          {i.book_title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
