import sqlite3
import json
import time

DB = r'C:\Users\a1\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# 1. List schemas
print("=== TABLE SCHEMAS ===")
for tbl in ['session', 'message', 'part', 'task', 'task_event', 'actor_registry']:
    c.execute(f"PRAGMA table_info({tbl})")
    cols = [r[1] for r in c.fetchall()]
    print(f"  {tbl}: {cols}")

# 2. Recent sessions
print("\n=== RECENT SESSIONS ===")
c.execute("SELECT * FROM session ORDER BY time_created DESC LIMIT 20")
cols = [d[0] for d in c.description]
print(f"  Columns: {cols}")
for row in c.fetchall():
    print(f"  {dict(row)}")

conn.close()
