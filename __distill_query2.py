import sqlite3
import json
import time

DB = r'C:\Users\a1\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Get all user sessions (non-checkpoint, non-subagent)
parent_sessions = ['ses_09e5aec17ffeox2o76t84v7UN0', 'ses_09b7ae1e2ffeFwyRCfJrV1vdWZ', 'ses_09af17982ffeO347SAgkJ1j90y']

# 1. User messages from main sessions
print("=== USER MESSAGES (main sessions) ===")
for sid in parent_sessions:
    c.execute("""
        SELECT m.id, m.time_created, substr(json_extract(m.data, '$.content'), 1, 400) as content
        FROM message m
        WHERE json_extract(m.data, '$.role') = 'user'
          AND m.session_id = ?
        ORDER BY m.time_created
    """, (sid,))
    print(f"\n--- Session {sid} ---")
    for row in c.fetchall():
        content = (row['content'] or '').replace('\n', ' ')[:300]
        print(f"  [{row['time_created']}] {content}")

# 2. Tool usage per main session
print("\n\n=== TOOL USAGE BY SESSION ===")
for sid in parent_sessions:
    c.execute("""
        SELECT json_extract(p.data, '$.tool') as tool,
               substr(json_extract(p.data, '$.state.input'), 1, 200) as input_preview,
               count(*) as n
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE json_extract(m.data, '$.role') = 'assistant'
          AND json_extract(p.data, '$.type') = 'tool'
          AND m.session_id = ?
        GROUP BY tool, input_preview
        ORDER BY n DESC
        LIMIT 20
    """, (sid,))
    print(f"\n--- Session {sid} ---")
    for row in c.fetchall():
        print(f"  {row['n']:3d}x | {row['tool']} | {row['input_preview'][:150]}")

# 3. Overall tool distribution
print("\n\n=== OVERALL TOOL DISTRIBUTION ===")
c.execute("""
    SELECT json_extract(p.data, '$.tool') as tool,
           count(*) as n
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'tool'
      AND m.session_id IN ({})
    GROUP BY tool
    ORDER BY n DESC
""".format(','.join(['?' for _ in parent_sessions])), parent_sessions)
for row in c.fetchall():
    print(f"  {row['n']:3d}x | {row['tool']}")

# 4. Most-edited files across all sessions
print("\n\n=== MOST-EDITED FILES ===")
c.execute("""
    SELECT json_extract(p.data, '$.state.file_path') as filepath,
           count(*) as n
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.tool') = 'edit'
      AND m.session_id IN ({})
    GROUP BY filepath
    ORDER BY n DESC
    LIMIT 20
""".format(','.join(['?' for _ in parent_sessions])), parent_sessions)
for row in c.fetchall():
    print(f"  {row['n']:3d}x | {row['filepath']}")

# 5. Most-searched patterns (grep)
print("\n\n=== MOST-USED GREP PATTERNS ===")
c.execute("""
    SELECT json_extract(p.data, '$.state.pattern') as pattern,
           json_extract(p.data, '$.state.path') as path,
           count(*) as n
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.tool') = 'grep'
      AND m.session_id IN ({})
    GROUP BY pattern, path
    ORDER BY n DESC
    LIMIT 20
""".format(','.join(['?' for _ in parent_sessions])), parent_sessions)
for row in c.fetchall():
    print(f"  {row['n']:3d}x | pattern={row['pattern']} | path={row['path']}")

# 6. Glob patterns used
print("\n\n=== MOST-USED GLOB PATTERNS ===")
c.execute("""
    SELECT json_extract(p.data, '$.state.pattern') as pattern,
           json_extract(p.data, '$.state.path') as path,
           count(*) as n
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.tool') = 'glob'
      AND m.session_id IN ({})
    GROUP BY pattern, path
    ORDER BY n DESC
    LIMIT 20
""".format(','.join(['?' for _ in parent_sessions])), parent_sessions)
for row in c.fetchall():
    print(f"  {row['n']:3d}x | pattern={row['pattern']} | path={row['path']}")

# 7. Repeated command sequences (bash commands)
print("\n\n=== MOST-USED BASH COMMANDS ===")
c.execute("""
    SELECT json_extract(p.data, '$.state.command') as cmd,
           count(*) as n
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.tool') = 'bash'
      AND m.session_id IN ({})
    GROUP BY cmd
    ORDER BY n DESC
    LIMIT 30
""".format(','.join(['?' for _ in parent_sessions])), parent_sessions)
for row in c.fetchall():
    cmd = (row['cmd'] or '')[:200]
    print(f"  {row['n']:3d}x | {cmd}")

conn.close()
