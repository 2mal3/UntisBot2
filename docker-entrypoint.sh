#!/bin/bash

if [ "$TEST" = "true" ] ; then
  bun test --timeout 10000
else
  bun serve
fi
