import MeasurementInput from './MeasurementInput'
import { getRequiredFields, getOptionalFields } from '../../config/sizeFinderCategories'

export default function MeasurementStep({
  categoryId,
  isKids,
  values,
  onChange,
  errors,
}) {
  const required = getRequiredFields(categoryId, isKids)
  const optional = getOptionalFields(categoryId, isKids)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">اندازه‌های خود را وارد کنید</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          اندازه‌ها را با دقت وارد کنید. فیلدهای اختیاری را می‌توانید رد کنید.
        </p>
      </div>

      {/* Required */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          الزامی
        </h3>
        {required.map((m) => (
          <MeasurementInput
            key={m.key}
            measurement={m}
            value={values[m.key]}
            onChange={(v) => onChange(m.key, v)}
            error={errors[m.key]}
          />
        ))}
      </div>

      {/* Optional */}
      {optional.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            اختیاری (برای دقت بیشتر)
          </h3>
          {optional.map((m) => (
            <MeasurementInput
              key={m.key}
              measurement={m}
              value={values[m.key]}
              onChange={(v) => onChange(m.key, v)}
              error={errors[m.key]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
