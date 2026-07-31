import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRight, Upload, X } from 'lucide-react';
import { productsAPI, dashboardAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();

  useEffect(() => {
    loadMeta();
    if (isEdit) loadProduct();
  }, [id]);

  const loadMeta = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        dashboardAPI.getCategories(),
        dashboardAPI.getBrands(),
      ]);
      setCategories(catRes.data);
      setBrands(brandRes.data);
    } catch {}
  };

  const loadProduct = async () => {
    try {
      const res = await productsAPI.get(id);
      const p = res.data;
      setValue('name', p.name);
      setValue('slug', p.slug);
      setValue('description', p.description);
      setValue('category', p.category);
      setValue('brand', p.brand || '');
      setValue('main_category', p.main_category);
      setValue('fabric', p.fabric || '');
      setValue('price', p.price);
      setValue('compare_price', p.compare_price || '');
      setValue('cost_price', p.cost_price || '');
      setValue('sku', p.sku || '');
      setValue('stock', p.stock);
      setValue('is_active', p.is_active);
      setValue('is_featured', p.is_featured);
      setValue('is_new_arrival', p.is_new_arrival);
      setValue('is_trending', p.is_trending);
      if (p.images) setExistingImages(p.images);
    } catch {
      toast.error('خطا در بارگذاری محصول');
      navigate('/products');
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          if (typeof data[key] === 'boolean') {
            formData.append(key, data[key] ? 'true' : '');
          } else {
            formData.append(key, data[key]);
          }
        }
      });

      images.forEach((img) => {
        formData.append('new_images', img);
      });

      if (isEdit) {
        await productsAPI.update(id, formData);
        toast.success('محصول بروزرسانی شد');
      } else {
        await productsAPI.create(formData);
        toast.success('محصول ایجاد شد');
      }
      navigate('/products');
    } catch (err) {
      const msg = err.response?.data;
      if (typeof msg === 'object') {
        const firstError = Object.values(msg)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : 'خطا در ذخیره');
      } else {
        toast.error('خطا در ذخیره محصول');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/products')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowRight className="h-5 w-5 text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isEdit ? 'ویرایش محصول' : 'افزودن محصول جدید'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            اطلاعات پایه
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                نام محصول *
              </label>
              <input
                {...register('name', { required: 'نام محصول الزامی است' })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                اسلاگ (Slug)
              </label>
              <input
                {...register('slug')}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="خودکار از نام ساخته می‌شود"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                توضیحات *
              </label>
              <textarea
                {...register('description', { required: 'توضیحات الزامی است' })}
                rows={4}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
              {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
            </div>
          </div>
        </div>

        {/* Categorization */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            دسته‌بندی و برند
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                دسته‌بندی اصلی *
              </label>
              <select
                {...register('main_category', { required: 'انتخاب الزامی است' })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">انتخاب کنید</option>
                <option value="مردانه">مردانه</option>
                <option value="زنانه">زنانه</option>
                <option value="بچگانه">بچگانه</option>
                <option value="اکسسوری">اکسسوری</option>
              </select>
              {errors.main_category && <p className="mt-1 text-xs text-red-500">{errors.main_category.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                دسته‌بندی *
              </label>
              <select
                {...register('category', { required: 'انتخاب الزامی است' })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">انتخاب کنید</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                برند
              </label>
              <select
                {...register('brand')}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">بدون برند</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            قیمت و موجودی
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                قیمت فروش (تومان) *
              </label>
              <input
                type="number"
                step="0.01"
                {...register('price', { required: 'قیمت الزامی است', min: 0 })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
              {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                قیمت اصلی (تومان)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('compare_price')}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                قیمت تمام‌شده (تومان)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('cost_price')}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                موجودی *
              </label>
              <input
                type="number"
                {...register('stock', { required: 'موجودی الزامی است', min: 0 })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
              {errors.stock && <p className="mt-1 text-xs text-red-500">{errors.stock.message}</p>}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              کد محصول (SKU)
            </label>
            <input
              {...register('sku')}
              className="w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Images */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            تصاویر
          </h2>
          {existingImages.length > 0 && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {existingImages.map((img, i) => (
                <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                  <img src={img.image} alt="" className="h-full w-full object-cover" />
                  {img.is_primary && (
                    <span className="absolute top-1 right-1 text-[10px] bg-blue-500 text-white px-1 rounded">اصلی</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <Upload className="h-8 w-8 text-slate-400 mb-2" />
            <span className="text-sm text-slate-500">تصاویر جدید را اینجا بکشید یا کلیک کنید</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setImages([...images, ...Array.from(e.target.files)])}
              className="hidden"
            />
          </label>
          {images.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                  <img src={URL.createObjectURL(img)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 left-0.5 bg-red-500 text-white rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            وضعیت نمایش
          </h2>
          <div className="flex flex-wrap gap-6">
            {[
              { key: 'is_active', label: 'فعال' },
              { key: 'is_featured', label: 'ویژه' },
              { key: 'is_new_arrival', label: 'جدید' },
              { key: 'is_trending', label: 'پرطرفدار' },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register(item.key)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'در حال ذخیره...' : isEdit ? 'بروزرسانی' : 'ایجاد محصول'}
          </button>
        </div>
      </form>
    </div>
  );
}
