import {
  Shirt, Watch, ShoppingBag, Gem, Footprints, Crown,
  Sparkles, Scissors, Heart, Star,
} from 'lucide-react'

const ICONS = [Shirt, Watch, ShoppingBag, Gem, Footprints, Crown, Sparkles, Scissors, Heart, Star]

export default function FashionVisual() {
  return (
    <div className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.5rem]">
      {/* Animated gradient base */}
      <div className="absolute inset-0 animate-gradient-x" style={{
        background: 'linear-gradient(135deg, #a855f7, #ec4899, #f97316, #a855f7)',
        backgroundSize: '400% 400%',
      }} />

      {/* Mesh blobs */}
      <div className="absolute h-48 w-48 rounded-full bg-yellow-400/30 mix-blend-overlay blur-3xl animate-blob" />
      <div className="absolute -bottom-12 -right-12 h-52 w-52 rounded-full bg-cyan-400/25 mix-blend-overlay blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute -top-10 -left-10 h-44 w-44 rounded-full bg-fuchsia-400/20 mix-blend-overlay blur-3xl animate-blob animation-delay-4000" />

      {/* Rotating ring */}
      <div className="absolute h-40 w-40 rounded-full border border-white/15 animate-spin-slow" />
      <div className="absolute h-56 w-56 rounded-full border border-white/10 animate-spin-slow-reverse" />

      {/* Floating icons */}
      {ICONS.map((Icon, i) => {
        const angle = (i / ICONS.length) * 360
        const radius = 30 + (i % 3) * 10
        const x = 50 + radius * Math.cos((angle * Math.PI) / 180)
        const y = 50 + radius * Math.sin((angle * Math.PI) / 180)
        return (
          <div
            key={i}
            className="absolute text-white/20 animate-float-item"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              '--dur': `${3.5 + (i % 4) * 0.5}s`,
              '--r': `${(i * 17) % 30 - 15}deg`,
              animationDelay: `${i * 0.3}s`,
            }}
          >
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.5} />
          </div>
        )
      })}

      {/* Center diamond */}
      <div className="relative z-10 flex h-16 w-16 rotate-45 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-2xl transition-transform duration-700 group-hover:scale-110 group-hover:rotate-[50deg]">
        <Sparkles className="h-7 w-7 -rotate-45 text-white" />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />
    </div>
  )
}
