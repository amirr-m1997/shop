from collections import OrderedDict

from products.models import Product

from .models import TaxonomyDimension


def _category_lineage(category):
    lineage = []
    while category is not None:
        lineage.append(category)
        category = category.parent
    return list(reversed(lineage))


def product_dimensions(product):
    """Return stable taxonomy values used by preference aggregation."""
    if not isinstance(product, Product):
        product = Product.objects.select_related(
            'category', 'category__parent', 'brand', 'fabric',
        ).prefetch_related('variants__color', 'images__color').get(pk=product)

    dimensions = OrderedDict()
    if product.main_category:
        dimensions[TaxonomyDimension.GENDER] = [(product.main_category, product.main_category)]

    if product.category_id:
        lineage = _category_lineage(product.category)
        leaf = lineage[-1]
        root = lineage[0]
        dimensions[TaxonomyDimension.CATEGORY] = [(root.slug, root.name)]
        if leaf.id != root.id:
            dimensions[TaxonomyDimension.SUBCATEGORY] = [(leaf.slug, leaf.name)]

    if product.brand_id:
        dimensions[TaxonomyDimension.BRAND] = [(product.brand.slug, product.brand.name)]
    if product.fabric_id:
        dimensions[TaxonomyDimension.FABRIC] = [(product.fabric.id and str(product.fabric_id), product.fabric.name)]

    colors = OrderedDict()
    for variant in product.variants.all():
        if variant.color_id:
            colors[str(variant.color_id)] = variant.color.name
    for image in product.images.all():
        if image.color_id:
            colors[str(image.color_id)] = image.color.name
    if colors:
        dimensions[TaxonomyDimension.COLOR] = list(colors.items())

    return dimensions
