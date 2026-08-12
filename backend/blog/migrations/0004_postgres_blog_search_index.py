from django.db import migrations


INDEX_NAME = 'blog_search_fts_idx'


def create_index(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    schema_editor.execute(
        f"CREATE INDEX {INDEX_NAME} ON blog_blogpost USING GIN ("
        "to_tsvector('simple'::regconfig, "
        "COALESCE(title, '') || ' ' || COALESCE(excerpt, '') || ' ' || COALESCE(content, '')))"
    )


def drop_index(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute(f'DROP INDEX IF EXISTS {INDEX_NAME}')


class Migration(migrations.Migration):
    dependencies = [('blog', '0003_blogpost_blog_published_date_idx')]
    operations = [migrations.RunPython(create_index, drop_index)]
