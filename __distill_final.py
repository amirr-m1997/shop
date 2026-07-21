import sqlite3
import json

DB = r'C:\Users\a1\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

parent_sessions = ['ses_09e5aec17ffeox2o76t84v7UN0', 'ses_09b7ae1e2ffeFwyRCfJrV1vdWZ', 'ses_09af17982ffeO347SAgkJ1j90y']
placeholders = ','.join(['?' for _ in parent_sessions])

# 1. Most-edited files
print("=== MOST-EDITED FILES ===")
c.execute(f"""
    SELECT json_extract(json_extract(data, '$.state.input'), '$.filePath') as filepath,
           count(*) as n
    FROM part
    WHERE json_extract(data, '$.tool') = 'edit'
      AND session_id IN ({placeholders})
    GROUP BY filepath
    ORDER BY n DESC
    LIMIT 20
""", parent_sessions)
for row in c.fetchall():
    fp = (row['filepath'] or 'unknown') 
    print(f"  {row['n']:3d}x | {fp}")

# 2. Most-read files
print("\n=== MOST-READ FILES ===")
c.execute(f"""
    SELECT json_extract(json_extract(data, '$.state.input'), '$.filePath') as filepath,
           count(*) as n
    FROM part
    WHERE json_extract(data, '$.tool') = 'read'
      AND session_id IN ({placeholders})
    GROUP BY filepath
    ORDER BY n DESC
    LIMIT 20
""", parent_sessions)
for row in c.fetchall():
    fp = (row['filepath'] or 'unknown')
    print(f"  {row['n']:3d}x | {fp}")

# 3. Most-used grep patterns
print("\n=== MOST-USED GREP PATTERNS ===")
c.execute(f"""
    SELECT json_extract(json_extract(data, '$.state.input'), '$.pattern') as pattern,
           json_extract(json_extract(data, '$.state.input'), '$.include') as include,
           count(*) as n
    FROM part
    WHERE json_extract(data, '$.tool') = 'grep'
      AND session_id IN ({placeholders})
    GROUP BY pattern, include
    ORDER BY n DESC
    LIMIT 20
""", parent_sessions)
for row in c.fetchall():
    print(f"  {row['n']:3d}x | pattern={row['pattern']} | include={row['include']}")

# 4. Bash commands grouped by description
print("\n=== BASH COMMAND DESCRIPTIONS ===")
c.execute(f"""
    SELECT json_extract(json_extract(data, '$.state.input'), '$.description') as desc,
           count(*) as n
    FROM part
    WHERE json_extract(data, '$.tool') = 'bash'
      AND session_id IN ({placeholders})
    GROUP BY desc
    ORDER BY n DESC
    LIMIT 30
""", parent_sessions)
for row in c.fetchall():
    desc = (row['desc'] or 'unknown')
    print(f"  {row['n']:3d}x | {desc}")

# 5. All bash commands with full text
print("\n=== ALL BASH COMMANDS ===")
c.execute(f"""
    SELECT json_extract(json_extract(data, '$.state.input'), '$.command') as cmd,
           json_extract(json_extract(data, '$.state.input'), '$.description') as desc,
           session_id
    FROM part
    WHERE json_extract(data, '$.tool') = 'bash'
      AND session_id IN ({placeholders})
    ORDER BY session_id
""", parent_sessions)
for row in c.fetchall():
    cmd = (row['cmd'] or '')[:250]
    desc = (row['desc'] or '')
    sid = row['session_id'][:16]
    print(f"  [{sid}] {desc}: {cmd}")

# 6. Glob patterns used
print("\n=== GLOB PATTERNS ===")
c.execute(f"""
    SELECT json_extract(json_extract(data, '$.state.input'), '$.pattern') as pattern,
           json_extract(json_extract(data, '$.state.input'), '$.path') as path,
           count(*) as n
    FROM part
    WHERE json_extract(data, '$.tool') = 'glob'
      AND session_id IN ({placeholders})
    GROUP BY pattern, path
    ORDER BY n DESC
    LIMIT 20
""", parent_sessions)
for row in c.fetchall():
    print(f"  {row['n']:3d}x | pattern={row['pattern']} | path={row['path']}")

# 7. Edit operations detail - what changes were made
print("\n=== EDIT OPERATIONS - FILES AND DESCRIPTIONS ===")
c.execute(f"""
    SELECT session_id,
           json_extract(json_extract(data, '$.state.input'), '$.filePath') as filepath,
           substr(json_extract(json_extract(data, '$.state.input'), '$.oldString'), 1, 100) as old_preview
    FROM part
    WHERE json_extract(data, '$.tool') = 'edit'
      AND session_id IN ({placeholders})
    ORDER BY session_id
""", parent_sessions)
for row in c.fetchall():
    fp = (row['filepath'] or 'unknown')
    old = (row['old_preview'] or '').replace('\n', '\\n')[:100]
    sid = row['session_id'][:16]
    fname = fp.split('\\')[-1]
    print(f"  [{sid}] {fname} | old: {old}")

# 8. Task/subagent spawns
print("\n=== TASK/SUBAGENT ACTIVITY ===")
c.execute(f"""
    SELECT session_id, count(*) as n, status
    FROM task
    WHERE session_id IN ({placeholders})
    GROUP BY session_id, status
""", parent_sessions)
for row in c.fetchall():
    print(f"  {row['session_id'][:16]} | status={row['status']} | n={row['n']}")

# 9. User messages with actual content (check if content field exists)
print("\n=== USER MESSAGE KEYS ===")
c.execute(f"""
    SELECT data FROM message
    WHERE json_extract(data, '$.role') = 'user'
      AND session_id IN ({placeholders})
    LIMIT 5
""", parent_sessions)
for row in c.fetchall():
    d = json.loads(row['data'])
    print(f"  Keys: {list(d.keys())}")
    content = d.get('content', 'NO CONTENT KEY')
    if isinstance(content, str):
        print(f"  Content: {content[:300]}")
    elif isinstance(content, list):
        for item in content[:3]:
            if isinstance(item, dict):
                print(f"  Content item: {json.dumps(item)[:300]}")
            else:
                print(f"  Content item: {str(item)[:200]}")
    else:
        print(f"  Content type: {type(content)}")

conn.close()
