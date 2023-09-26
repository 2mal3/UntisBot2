#!/bin/bash

if [ "$TEST" = "true" ] ; then
  bun test
else
  bun serve
fi
