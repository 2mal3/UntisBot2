#!/bin/bash

NAME="untisbot2"

docker build -t $NAME-test:latest .
docker run --rm -e TEST=true $NAME-test:latest
docker rmi $NAME-test:latest
