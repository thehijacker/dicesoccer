FROM php:8.3-rc-fpm-alpine
RUN apk add --no-cache nginx \
    && addgroup -g 1000 www \
    && adduser -u 1000 -G www -s /bin/sh -D www
WORKDIR /var/www/html
COPY . .
COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
RUN chown -R www:www /var/www/html
EXPOSE 80
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
