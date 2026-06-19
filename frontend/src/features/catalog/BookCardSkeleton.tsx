// Khung xương 1 thẻ sách khi đang tải (class "skeleton" của DaisyUI tự nhấp nháy).
// Giữ đúng hình dạng BookCard để lúc tải xong không bị "nhảy" layout.
export default function BookCardSkeleton() {
  return (
    <div className="bg-base-100 border border-base-300 rounded-box overflow-hidden">
      <div className="p-3 pb-0">
        <div className="skeleton aspect-[2/3] w-full rounded-lg" />
      </div>
      <div className="px-3 pb-3 pt-2.5 space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-6 w-1/3 mt-2" />
      </div>
    </div>
  )
}
