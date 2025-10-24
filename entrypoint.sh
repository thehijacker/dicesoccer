#!/bin/sh

chown -R www:www /var/www/html/multiplayer-data

php-fpm &

nginx -g 'daemon off;'
