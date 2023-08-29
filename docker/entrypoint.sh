#!/bin/bash

env | sed 's/=\(.*\)/="\1"/' > /etc/environment
cron
tail -f /var/log/cron.log
