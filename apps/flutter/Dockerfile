FROM ghcr.io/cirruslabs/flutter:stable AS build

ARG API_BASE_URL=/api/v1
WORKDIR /src
COPY pubspec.yaml pubspec.lock analysis_options.yaml ./
RUN flutter pub get
COPY . .
RUN dart run build_runner build && \
    flutter build web --release --dart-define=API_BASE_URL=${API_BASE_URL}

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/build/web /usr/share/nginx/html
EXPOSE 8080
