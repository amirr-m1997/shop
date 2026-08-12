from django.db import migrations


INDEX_NAME = 'product_search_fts_idx'


def create_index(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    schema_editor.execute(
        f"CREATE INDEX {INDEX_NAME} ON products_product USING GIN ("
        "to_tsvector('simple'::regconfig, "
        "COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(sku, '')))"
    )


def drop_index(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute(f'DROP INDEX IF EXISTS {INDEX_NAME}')


class Migration(migrations.Migration):
    dependencies = [('products', '0021_product_product_active_created_idx')]
    operations = [migrations.RunPython(create_index, drop_index)]
