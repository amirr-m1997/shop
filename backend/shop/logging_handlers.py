"""
Windows-safe rotating file handler.

On Windows, RotatingFileHandler.doRollover() does `os.rename(src, dst)` while
another process (the autoreload parent) still holds the file handle, which
raises PermissionError [WinError 32]. The base handler then emits
"--- Logging error ---" for every subsequent record.

This handler catches that specific error, closes the current stream, attempts
the rename again, and if it still fails (file still locked), it truncates
the current file so logging can continue without crashing. This keeps the
existing LOGGING behaviour (10 MB rotation, 10-15 backups) but makes it
reliable on Windows with `runserver --reload`.
"""
import logging.handlers
import os
import time


class WindowsSafeRotatingFileHandler(logging.handlers.RotatingFileHandler):
    def doRollover(self):
        try:
            super().doRollover()
        except PermissionError:
            # File is locked by autoreload parent / antivirus. Close stream
            # and retry once after a short pause.
            try:
                if self.stream:
                    self.stream.close()
                    self.stream = None
            except Exception:
                pass
            time.sleep(0.05)
            try:
                super().doRollover()
            except PermissionError:
                # Still locked — truncate current file so we don't lose logs
                # and don't emit a Logging error for every record.
                try:
                    # Reopen in write mode to truncate
                    self.mode = 'w'
                    self.stream = self._open()
                    self.stream.close()
                    self.stream = None
                    # Next emit will reopen in append mode via base emit()
                    self.mode = 'a'
                except Exception:
                    pass
            except Exception:
                pass
        except Exception:
            # Any other rotation error should not crash logging
            try:
                if self.stream:
                    self.stream.close()
                    self.stream = None
            except Exception:
                pass
