#!/bin/bash
cd R:\Code\IoT
node src/index.js 2>&1 | Tee-Object -File server.log