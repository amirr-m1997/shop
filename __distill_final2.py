import sqlite3
import json

DB = r'C:\Users\a1\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

parent_sessions = ['ses_09e5aec17ffeox2o76t84v7UN0', 'ses_09b7ae1e2ffeFwyRCfJrV1vdWZ', 'ses_09af17982ffeO347SAgkJ1j90y']
placeholders = ','.join(['?' for _ in parent_sessions])

# 1. User message text content (from text parts)
print("=== USER MESSAGES (text parts) ===")
c.execute(f"""
    SELECT m.session_id, m.time_created, p.data as part_data
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
      AND m.session_id IN ({placeholders})
    ORDER BY m.time_created
""", parent_sessions)
for row in c.fetchall():
    pd = json.loads(row['part_data'])
    text = pd.get('text', '')[:500]
    sid = row['session_id'][:16]
    print(f"\n  [{sid}] ({row['time_created']})")
    print(f"    {text}")

# 2. Edit operations with file_path properly nested
print("\n\n=== EDIT OPERATIONS DETAIL ===")
c.execute(f"""
    SELECT session_id,
           json_extract(json_extract(data, '$.state'), '$.input') as inp
    FROM part
    WHERE json_extract(data, '$.tool') = 'edit'
      AND session_id IN ({placeholders})
    ORDER BY session_id
""", parent_sessions)
for row in c.fetchall():
    inp = json.loads(row['inp']) if row['inp'] else {}
    fp = inp.get('filePath', inp.get('file_path', 'unknown'))
    fname = fp.split('\\')[-1] if fp else 'unknown'
    old = (inp.get('oldString', inp.get('old_string', '')) or '')[:120]
    old = old.replace('\n', '\\n')
    sid = row['session_id'][:16]
    print(f"  [{sid}] {fname} | {old}")

# 3. Verify all session titles
print("\n=== ALL SESSION TITLES ===")
c.execute("""
    SELECT id, title FROM session
    WHERE parent_id IS NULL
    ORDER BY time_created
""")
for row in c.fetchall():
    print(f"  {row['id'][:16]} | {row['title']}")

# 4. Check session timestamps
print("\n=== SESSION TIMESTAMPS ===")
c.execute("""
    SELECT id, title, time_created, time_updated FROM session
    WHERE parent_id IS NULL
    ORDER BY time_created
""")
import datetime
for row in c.fetchall():
    ts = row['time_created'] / 1000
    dt = datetime.datetime.fromtimestamp(ts)
    print(f"  {row['id'][:16]} | {dt.strftime('%Y-%m-%d %H:%M')} | {row['title']}")

# 5. Summarize distinct user request patterns
print("\n\n=== USER REQUEST PATTERNS (summarized) ===")
c.execute(f"""
    SELECT m.session_id,
           json_extract(p.data, '$.text') as text
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
      AND m.session_id IN ({placeholders})
    ORDER BY m.time_created
""", parent_sessions)
for row in c.fetchall():
    text = (row['text'] or '')[:500]
    sid = row['session_id'][:16]
    if text.strip():
        print(f"\n  [{sid}] {text[:400]}")

conn.close()
