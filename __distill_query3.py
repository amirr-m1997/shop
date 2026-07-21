import sqlite3
import json
import time

DB = r'C:\Users\a1\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Look at actual part data structures
print("=== SAMPLE PART DATA (edit tool) ===")
c.execute("""
    SELECT data FROM part
    WHERE json_extract(data, '$.tool') = 'edit'
    LIMIT 3
""")
for row in c.fetchall():
    d = json.loads(row['data'])
    print(json.dumps(d, indent=2)[:500])
    print("---")

print("\n=== SAMPLE PART DATA (bash tool) ===")
c.execute("""
    SELECT data FROM part
    WHERE json_extract(data, '$.tool') = 'bash'
    LIMIT 3
""")
for row in c.fetchall():
    d = json.loads(row['data'])
    print(json.dumps(d, indent=2)[:500])
    print("---")

print("\n=== SAMPLE PART DATA (read tool) ===")
c.execute("""
    SELECT data FROM part
    WHERE json_extract(data, '$.tool') = 'read'
    LIMIT 2
""")
for row in c.fetchall():
    d = json.loads(row['data'])
    print(json.dumps(d, indent=2)[:500])
    print("---")

print("\n=== SAMPLE PART DATA (grep tool) ===")
c.execute("""
    SELECT data FROM part
    WHERE json_extract(data, '$.tool') = 'grep'
    LIMIT 3
""")
for row in c.fetchall():
    d = json.loads(row['data'])
    print(json.dumps(d, indent=2)[:500])
    print("---")

print("\n=== SAMPLE PART DATA (glob tool) ===")
c.execute("""
    SELECT data FROM part
    WHERE json_extract(data, '$.tool') = 'glob'
    LIMIT 3
""")
for row in c.fetchall():
    d = json.loads(row['data'])
    print(json.dumps(d, indent=2)[:500])
    print("---")

# Check message data structure
print("\n=== SAMPLE MESSAGE DATA ===")
c.execute("""
    SELECT data FROM message WHERE json_extract(data, '$.role') = 'user'
    LIMIT 2
""")
for row in c.fetchall():
    d = json.loads(row['data'])
    print(json.dumps(d, indent=2)[:500])
    print("---")

conn.close()
