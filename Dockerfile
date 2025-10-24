FROM php:8.3-rc-cli-alpine3.22
WORKDIR /app
COPY . .
EXPOSE 8000
CMD ["php", "-S", "0.0.0.0:8000"]
