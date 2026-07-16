#!/bin/sh
docker exec plant-care wget -q -O /dev/null "http://127.0.0.1:3000/api/cron/notify?secret=bee4eb00c7311e458a0ed4c5469b2ff4" 2>/dev/null
