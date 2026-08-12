import { Ruler, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import SizeFinderWizard from '../components/sizefinder/SizeFinderWizard'
import { SEO } from '../lib/seo'

export default function SizeFinderPage() {
  return (
    <div className="relative min-h-screen overflow-hidden pb-16">
      <SEO
        title="راهنمای سایز"
        description="پیدا کردن سایز مناسب لباس | با وارد کردن اندازه‌های بدن خود، بهترین سایز را پیشنهاد بگیرید"
        url="https://fashionshop.ir/size-finder"
      />
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -right-40 top-60 h-96 w-96 rounded-full bg-amber-500/8 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-rose-500/8 blur-3xl" />
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
          <Link to="/" className="transition-colors hover:text-foreground">خانه</Link>
          <ChevronLeft className="h-3.5 w-3.5 opacity-50" />
          <span className="font-medium text-foreground">راهنمای سایز</span>
        </nav>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Hero card */}
        <div className="mb-10 overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl shadow-black/[0.08] backdrop-blur-2xl sm:p-10">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-xl">
              <Ruler className="h-9 w-9 text-primary" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">پیدا کردن سایز مناسب</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80 sm:text-base">
              با وارد کردن اندازه‌های بدن خود، بهترین سایز را پیشنهاد بگیرید. همه اندازه‌ها بر حسب سانتی‌متر هستند.
            </p>
          </div>
        </div>

        {/* Wizard card */}
        <div className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl shadow-black/[0.08] backdrop-blur-2xl">
          <SizeFinderWizard />
        </div>
      </div>
    </div>
  )
}
