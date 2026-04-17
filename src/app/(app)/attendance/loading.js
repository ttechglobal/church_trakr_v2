import { ListSkeleton } from '@/components/ui/Skeletons'

export default function Loading() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem' }}>
      <div style={{ height: 28, width: 160, background: '#ede9e0', borderRadius: 8, marginBottom: '1.5rem', animation: 'shimmer 1.4s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg,#ede9e0 25%,#e5e0d8 50%,#ede9e0 75%)' }} />
      <ListSkeleton count={6} height={72} />
      <style>{`@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
    </div>
  )
}
