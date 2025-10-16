import psycopg2
from tabulate import tabulate
import os
from contextlib import contextmanager


@contextmanager
def get_db_connection():
    """Context manager for database connections to ensure proper cleanup."""
    conn = None
    try:
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME", "logsdb"),
            user=os.getenv("DB_USER", "devlogs"),
            password=os.getenv("DB_PASSWORD", "devlogs"),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432")
        )
        yield conn
    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
        raise
    finally:
        if conn:
            conn.close()


def fetch_total_logs():
    """Fetch and return the total count of logs."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM logs;")
                result = cursor.fetchone()
                
                if result is None:
                    print("Could not fetch log count.")
                    return 0
                
                count = result[0]
                print(f"Total logs: {count}")
                return count
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None


def fetch_all_logs():
    """Fetch and display all logs in a tabular format."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM logs;")
                logs_data = cursor.fetchall()
                
                # Get column names
                colnames = [desc[0] for desc in cursor.description] if cursor.description else []
                
                # Print in tabular format
                if logs_data:
                    print(tabulate(logs_data, headers=colnames, tablefmt="grid"))
                else:
                    print("No logs found.")
                
                return logs_data
                
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None


def fetch_logs_by_level(level):
    """Fetch logs filtered by log level (e.g., 'ERROR', 'INFO', 'WARNING')."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM logs WHERE level = %s;", (level,))
                logs_data = cursor.fetchall()
                
                colnames = [desc[0] for desc in cursor.description] if cursor.description else []
                
                if logs_data:
                    print(f"\nLogs with level '{level}':")
                    print(tabulate(logs_data, headers=colnames, tablefmt="grid"))
                else:
                    print(f"No logs found with level '{level}'.")
                
                return logs_data
                
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None


def delete_log_by_id(log_id):
    """Delete a specific log by its ID."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM logs WHERE id = %s;", (log_id,))
                deleted_count = cursor.rowcount
                conn.commit()
                
                if deleted_count > 0:
                    print(f"Successfully deleted log with ID: {log_id}")
                    return True
                else:
                    print(f"No log found with ID: {log_id}")
                    return False
                    
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def delete_logs_by_level(level):
    """Delete all logs with a specific level (e.g., 'INFO', 'DEBUG')."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM logs WHERE level = %s;", (level,))
                deleted_count = cursor.rowcount
                conn.commit()
                
                print(f"Successfully deleted {deleted_count} log(s) with level '{level}'")
                return deleted_count
                    
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 0


def delete_logs_before_date(date):
    """Delete logs older than a specific date.
    
    Args:
        date: Date string in format 'YYYY-MM-DD' or datetime object
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM logs WHERE created_at < %s;", (date,))
                deleted_count = cursor.rowcount
                conn.commit()
                
                print(f"Successfully deleted {deleted_count} log(s) before {date}")
                return deleted_count
                    
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 0


def delete_all_logs(confirm=False):
    """Delete ALL logs from the database. Requires confirmation.
    
    Args:
        confirm: Must be True to actually delete. Safety measure.
    """
    if not confirm:
        print("WARNING: This will delete ALL logs. Call with confirm=True to proceed.")
        return False
        
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM logs;")
                deleted_count = cursor.rowcount
                conn.commit()
                
                print(f"Successfully deleted ALL {deleted_count} log(s) from database")
                return deleted_count
                    
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 0


if __name__ == "__main__":
    print("=== Fetching All Logs ===")
    # fetch_all_logs()
    
    print("\n=== Total Log Count ===")
    fetch_total_logs()
    
    # Example: Uncomment to filter by log level
    # print("\n=== Error Logs ===")
    # fetch_logs_by_level('ERROR')
    
    # Example: Uncomment to delete logs
    # print("\n=== Deleting a specific log ===")
    # delete_log_by_id(1)
    
    # print("\n=== Deleting logs by level ===")
    # delete_logs_by_level('DEBUG')
    
    # print("\n=== Deleting old logs ===")
    # delete_logs_before_date('2024-01-01')
    
    # print("\n=== DANGER: Delete ALL logs ===")
    delete_all_logs(confirm=True)

"""Great question! Let me explain `yield` in the context of context managers.

## What `yield` does in a Context Manager

The `yield` statement in a context manager divides the function into three phases:

```python
@contextmanager
def get_db_connection():
    # 1. SETUP phase (before yield)
    conn = psycopg2.connect(...)
    
    # 2. YIELD - gives control back to the caller
    yield conn  # This value becomes available in "with ... as conn:"
    
    # 3. TEARDOWN phase (after yield)
    if conn:
        conn.close()  # Always runs, even if there's an error
```

## How it works with `with`:

```python
with get_db_connection() as conn:
    # When execution enters this block:
    # - Setup code runs (connection is created)
    # - 'conn' receives the yielded value
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM logs")
    # ... your code here ...
    
# When execution exits this block (normally OR due to an exception):
# - Teardown code runs (connection is closed)
```

## Why use `yield` instead of `return`?

**`return`** would just give you the connection and exit the function immediately - no cleanup would happen.

**`yield`** pauses the function, lets you use the connection, then resumes to run the cleanup code.

## Visual Flow:

```python
with get_db_connection() as conn:  # ← Setup runs, yields conn
    do_something(conn)              # ← Your code runs
    raise Exception("Oops!")        # ← Even with an error...
                                    # ← Cleanup STILL runs after this block
```

## Without Context Manager (old way):

```python
conn = None
try:
    conn = psycopg2.connect(...)
    # do stuff
except:
    # handle error
finally:
    if conn:
        conn.close()  # You must remember this!
```

## With Context Manager (clean way):

```python
with get_db_connection() as conn:
    # do stuff
    # Connection automatically closes, guaranteed!
```

The `yield` keyword is what makes this automatic cleanup possible. It's the "magic" that ensures your cleanup code always runs, making your code safer and cleaner!"""