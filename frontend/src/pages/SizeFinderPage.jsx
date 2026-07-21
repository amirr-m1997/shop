import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ruler, Check, ArrowLeft, Info } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { productsAPI } from '../services/api';

const SizeFinderPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    gender: '',
    height: '',
    weight: '',
    productType: 'clothing',
    chest: '',
    waist: '',
    hips: '',
    fitPreference: '',
  });
  const [recommendations, setRecommendations] = useState([]);
  const [measurementGuide, setMeasurementGuide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnswer = (question, value) => {
    setAnswers(prev => ({ ...prev, [question]: value }));
  };

  const fetchSizeRecommendation = async () => {
    setLoading(true);
    setError('');
    try {
      const data = {
        height: parseInt(answers.height),
        weight: parseInt(answers.weight),
        gender: answers.gender,
        product_type: answers.productType,
      };
      if (answers.chest) data.chest = parseFloat(answers.chest);
      if (answers.waist) data.waist = parseFloat(answers.waist);
      if (answers.hips) data.hips = parseFloat(answers.hips);

      const res = await productsAPI.getSizeRecommendation(data);
      setRecommendations(res.data.recommendations || []);
      setStep(4);
    } catch (err) {
      console.error('Error fetching size recommendation:', err);
      setError('خطا در دریافت پیشنهاد سایز. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeasurementGuide = async () => {
    try {
      const res = await productsAPI.getMeasurementGuide({
        product_type: answers.productType,
        gender: answers.gender || 'unisex',
      });
      setMeasurementGuide(res.data);
    } catch (err) {
      console.error('Error fetching measurement guide:', err);
    }
  };

  useEffect(() => {
    if (step === 3) {
      fetchMeasurementGuide();
    }
  }, [step, answers.productType, answers.gender]);

  const resetQuiz = () => {
    setStep(1);
    setAnswers({
      gender: '',
      height: '',
      weight: '',
      productType: 'clothing',
      chest: '',
      waist: '',
      hips: '',
      fitPreference: '',
    });
    setRecommendations([]);
    setMeasurementGuide(null);
    setError('');
  };

  const genderLabel = (g) => {
    const labels = { men: 'مردانه', women: 'زنانه', kids: 'بچگانه' };
    return labels[g] || g;
  };

  const productTypeLabel = (t) => {
    const labels = {
      clothing: 'لباس',
      shoes: 'کفش',
      underwear: 'لباس زیر',
      accessories: 'اکسسواری',
    };
    return labels[t] || t;
  };

  const fitLabel = (f) => {
    const labels = { tight: 'چسبان', regular: 'معمولی', loose: 'آزاد' };
    return labels[f] || f;
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="text-center mb-8">
        <Ruler className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl font-bold mb-2">سایز مناسب خود را پیدا کنید</h1>
        <p className="text-muted-foreground">اندازه‌های خود را وارد کنید تا سایز پیشنهادی دریافت کنید</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3, 4].map(s => (
              <React.Fragment key={s}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {step > s ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 4 && <div className={`w-12 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Gender & Product Type */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">جنسیت و نوع محصول</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3">جنسیت</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['men', 'women', 'kids'].map(gender => (
                      <Button
                        key={gender}
                        variant={answers.gender === gender ? 'default' : 'outline'}
                        size="lg"
                        onClick={() => handleAnswer('gender', gender)}
                        className="h-16"
                      >
                        {genderLabel(gender)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3">نوع محصول</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'clothing', label: 'لباس', icon: '👕' },
                      { value: 'shoes', label: 'کفش', icon: '👟' },
                      { value: 'underwear', label: 'لباس زیر', icon: '🩱' },
                      { value: 'accessories', label: 'اکسسواری', icon: '👜' },
                    ].map(type => (
                      <Button
                        key={type.value}
                        variant={answers.productType === type.value ? 'default' : 'outline'}
                        size="lg"
                        onClick={() => handleAnswer('productType', type.value)}
                        className="h-16 flex flex-col items-center gap-1"
                      >
                        <span className="text-lg">{type.icon}</span>
                        <span className="text-xs">{type.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                className="w-full mt-6"
                onClick={() => setStep(2)}
                disabled={!answers.gender}
              >
                ادامه
              </Button>
            </div>
          )}

          {/* Step 2: Measurements */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">اندازه‌های خود</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">قد (سانتی‌متر)</label>
                    <Input
                      type="number"
                      value={answers.height}
                      onChange={e => handleAnswer('height', e.target.value)}
                      placeholder="مثلاً ۱۷۵"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">وزن (کیلوگرم)</label>
                    <Input
                      type="number"
                      value={answers.weight}
                      onChange={e => handleAnswer('weight', e.target.value)}
                      placeholder="مثلاً ۷۰"
                    />
                  </div>
                </div>

                {/* Optional body measurements */}
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    اندازه‌های اختیاری (برای دقت بیشتر)
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">سینه (سانتی‌متر)</label>
                      <Input
                        type="number"
                        value={answers.chest}
                        onChange={e => handleAnswer('chest', e.target.value)}
                        placeholder="اختیاری"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">کمر (سانتی‌متر)</label>
                      <Input
                        type="number"
                        value={answers.waist}
                        onChange={e => handleAnswer('waist', e.target.value)}
                        placeholder="اختیاری"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">باسن (سانتی‌متر)</label>
                      <Input
                        type="number"
                        value={answers.hips}
                        onChange={e => handleAnswer('hips', e.target.value)}
                        placeholder="اختیاری"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">ترجیح سایز</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['tight', 'regular', 'loose'].map(pref => (
                      <Button
                        key={pref}
                        variant={answers.fitPreference === pref ? 'default' : 'outline'}
                        onClick={() => handleAnswer('fitPreference', pref)}
                      >
                        {fitLabel(pref)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  بازگشت
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!answers.height || !answers.weight}
                  className="flex-1"
                >
                  ادامه
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Measurement Guide */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">راهنمای اندازه‌گیری</h2>
              <p className="text-sm text-muted-foreground mb-6">
                قبل از دریافت پیشنهاد سایز، از صحیح بودن اندازه‌های خود اطمینان حاصل کنید
              </p>

              {measurementGuide && measurementGuide.categories?.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {measurementGuide.categories.map(cat => (
                    <div key={cat.category_id} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">{cat.category_name}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-right py-2 px-2">سایز</th>
                              {cat.sizes[0]?.chest && <th className="text-right py-2 px-2">سینه</th>}
                              {cat.sizes[0]?.waist && <th className="text-right py-2 px-2">کمر</th>}
                              {cat.sizes[0]?.hips && <th className="text-right py-2 px-2">باسن</th>}
                              {cat.sizes[0]?.length && <th className="text-right py-2 px-2">قد</th>}
                              {cat.sizes[0]?.shoulder && <th className="text-right py-2 px-2">شانه</th>}
                              {cat.sizes[0]?.sleeve && <th className="text-right py-2 px-2">آستین</th>}
                              {cat.sizes[0]?.height_min && <th className="text-right py-2 px-2">قد مناسب</th>}
                              {cat.sizes[0]?.weight_min && <th className="text-right py-2 px-2">وزن مناسب</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {cat.sizes.map((size, idx) => (
                              <tr key={idx} className="border-b last:border-b-0">
                                <td className="py-2 px-2 font-medium">{size.size}</td>
                                {size.chest && <td className="py-2 px-2">{size.chest}</td>}
                                {size.waist && <td className="py-2 px-2">{size.waist}</td>}
                                {size.hips && <td className="py-2 px-2">{size.hips}</td>}
                                {size.length && <td className="py-2 px-2">{size.length}</td>}
                                {size.shoulder && <td className="py-2 px-2">{size.shoulder}</td>}
                                {size.sleeve && <td className="py-2 px-2">{size.sleeve}</td>}
                                {size.height_min && (
                                  <td className="py-2 px-2">{size.height_min}-{size.height_max} سانتی‌متر</td>
                                )}
                                {size.weight_min && (
                                  <td className="py-2 px-2">{size.weight_min}-{size.weight_max} کیلوگرم</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold mb-2">نحوه اندازه‌گیری:</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• <strong>سینه:</strong> دور پهن‌ترین قسمت سینه را اندازه بگیرید</li>
                    <li>• <strong>کمر:</strong> دور باریک‌ترین قسمت کمر را اندازه بگیرید</li>
                    <li>• <strong>باسن:</strong> دور پهن‌ترین قسمت باسن را اندازه بگیرید</li>
                    <li>• <strong>قد:</strong> از بالای سر تا کف پا اندازه بگیرید</li>
                    <li>• <strong>وزن:</strong> وزن خود را به کیلوگرم وارد کنید</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  بازگشت
                </Button>
                <Button
                  onClick={fetchSizeRecommendation}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'در حال محاسبه...' : 'پیشنهاد سایز'}
                </Button>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">پیشنهادات سایز شما</h2>

              {/* Profile Summary */}
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-right">
                <h3 className="font-semibold mb-2">پروفایل شما:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>جنسیت: {genderLabel(answers.gender)}</p>
                  <p>نوع محصول: {productTypeLabel(answers.productType)}</p>
                  <p>قد: {answers.height} سانتی‌متر</p>
                  <p>وزن: {answers.weight} کیلوگرم</p>
                  {answers.chest && <p>سینه: {answers.chest} سانتی‌متر</p>}
                  {answers.waist && <p>کمر: {answers.waist} سانتی‌متر</p>}
                  {answers.hips && <p>باسن: {answers.hips} سانتی‌متر</p>}
                  {answers.fitPreference && <p>ترجیح: {fitLabel(answers.fitPreference)}</p>}
                </div>
              </div>

              {/* Recommendations */}
              {recommendations.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-semibold">{rec.category_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          سایز پیشنهادی: {rec.recommended_size}
                        </p>
                      </div>
                      <div className="text-left">
                        <div className={`text-2xl font-bold ${
                          rec.confidence >= 80 ? 'text-green-600' :
                          rec.confidence >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {rec.confidence}%
                        </div>
                        <p className="text-xs text-muted-foreground">دقت</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>پیشنهاد سایزی برای این دسته یافت نشد</p>
                  <p className="text-sm mt-2">لطفاً اطلاعات بیشتری در پنل مدیریت اضافه کنید</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="outline" onClick={resetQuiz} className="flex-1">
                  شروع مجدد
                </Button>
                <Button onClick={() => navigate('/products')} className="flex-1">
                  مشاهده محصولات
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SizeFinderPage;
