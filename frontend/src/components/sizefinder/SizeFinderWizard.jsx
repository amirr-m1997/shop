import { useState, useCallback } from 'react'
import { ArrowRight, ArrowLeft, SkipForward, Loader2 } from 'lucide-react'
import ProgressBar from './ProgressBar'
import GenderStep from './GenderStep'
import CategoryStep from './CategoryStep'
import MeasurementStep from './MeasurementStep'
import ResultStep from './ResultStep'
import { getCategoryConfig, getOptionalFields, validateMeasurement } from '../../config/sizeFinderCategories'
import { productsAPI } from '../../services/api'

const TOTAL_STEPS = 4

export default function SizeFinderWizard() {
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState(null)
  const [categoryId, setCategoryId] = useState(null)
  const [measurements, setMeasurements] = useState({})
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [direction, setDirection] = useState(1)
  const [animKey, setAnimKey] = useState(0)

  const isKids = gender === 'kids'
  const catConfig = getCategoryConfig(categoryId)

  function validateAll() {
    const errs = {}
    const required = catConfig?.required || []
    const kidsRequired = isKids ? (catConfig?.kidsRequired || []) : []
    for (const key of [...required, ...kidsRequired]) {
      const err = validateMeasurement(key, measurements[key])
      if (err) errs[key] = err
    }
    setErrors(errs)
    return errs
  }

  async function handleSubmit() {
    const errs = validateAll()
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    setApiError(null)
    try {
      const cat = getCategoryConfig(categoryId)
      const payload = {
        gender,
        product_type: cat?.backendProductType || 'clothing',
        fitPreference: measurements.fitPreference || 'regular',
        measurements: { ...measurements },
      }
      delete payload.measurements.fitPreference
      const res = await productsAPI.getSizeRecommendation(payload)
      setResult(res.data)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'خطا در ارتباط با سرور'
      setApiError(msg)
      setResult(null)
    } finally {
      setLoading(false)
      setDirection(1)
      setStep(3)
      setAnimKey((k) => k + 1)
    }
  }

  function handleNext() {
    if (step === 0 && !gender) return
    if (step === 1 && !categoryId) return
    if (step === 2) {
      handleSubmit()
      return
    }
    setDirection(1)
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
    setAnimKey((k) => k + 1)
  }

  function handleBack() {
    setDirection(-1)
    setStep((s) => Math.max(s - 1, 0))
    setAnimKey((k) => k + 1)
  }

  function handleGenderChange(g) {
    setGender(g)
    setCategoryId(null)
    setMeasurements({})
    setErrors({})
    setApiError(null)
  }

  function handleCategoryChange(c) {
    setCategoryId(c)
    setMeasurements({})
    setErrors({})
    setApiError(null)
  }

  function handleMeasurementChange(key, value) {
    setMeasurements((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  function handleRestart() {
    setStep(0)
    setGender(null)
    setCategoryId(null)
    setMeasurements({})
    setErrors({})
    setResult(null)
    setApiError(null)
    setDirection(1)
    setAnimKey((k) => k + 1)
  }

  const optionalFields = getOptionalFields(categoryId, isKids)
  const hasOptional = optionalFields.length > 0 && step === 2
  const estimatedTime = step === 2 ? `${Math.max(30, optionalFields.length * 10 + 20)} ثانیه` : null
  const animClass = direction === 1 ? 'animate-slide-in-right' : 'animate-slide-in-left'

  return (
    <div className="min-h-[70vh] flex flex-col p-6 sm:p-8">
      <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />

      <div className="flex-1" key={animKey}>
        <div className={animClass}>
          {step === 0 && (
            <GenderStep value={gender} onChange={handleGenderChange} />
          )}
          {step === 1 && (
            <CategoryStep value={categoryId} onChange={handleCategoryChange} />
          )}
          {step === 2 && categoryId && (
            <MeasurementStep
              categoryId={categoryId}
              isKids={isKids}
              values={measurements}
              onChange={handleMeasurementChange}
              errors={errors}
            />
          )}
          {step === 3 && (
            <ResultStep
              result={result}
              apiError={apiError}
              onRestart={handleRestart}
              onRetry={handleSubmit}
              onBrowse={() => { window.location.href = '/products' }}
            />
          )}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/20 bg-white/10 px-8 py-6 shadow-2xl backdrop-blur-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">
              در حال پردازش اندازه‌ها...
            </span>
          </div>
        </div>
      )}

      {step < 3 && (
        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-foreground backdrop-blur-xl transition-all hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              قبلی
            </button>
          )}

          <div className="flex-1" />

          {estimatedTime && (
            <span className="text-xs text-muted-foreground/70 hidden sm:block">
              زمان تقریبی: {estimatedTime}
            </span>
          )}

          {hasOptional && step === 2 && (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs text-foreground backdrop-blur-xl transition-colors hover:bg-white/20"
            >
              رد کردن اختیاری
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={(step === 0 && !gender) || (step === 1 && !categoryId)}
            className="flex items-center gap-1 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === 2 ? 'پیشنهاد سایز' : 'بعدی'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
