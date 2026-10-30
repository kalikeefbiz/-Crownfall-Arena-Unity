#!/bin/sh
BROWSER_ROOT=/home/agent/.cache/ms-playwright/webkit-2370/minibrowser-wpe
LOCAL_LIBS=/workspace/crownfall/PlayCanvas/.audit/018a/webkit-libs/root/usr/lib/x86_64-linux-gnu
export WEBKIT_EXEC_PATH="$BROWSER_ROOT/bin"
export WEBKIT_INJECTED_BUNDLE_PATH="$BROWSER_ROOT/lib"
export WEBKIT_INSPECTOR_RESOURCES_PATH="$BROWSER_ROOT/share"
export LD_LIBRARY_PATH="$BROWSER_ROOT/lib:$BROWSER_ROOT/sys/lib:$LOCAL_LIBS"
exec "$BROWSER_ROOT/bin/MiniBrowser" "$@"
