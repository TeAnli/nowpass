# NowPass backend — multi-stage build
FROM gradle:8.14.4-jdk21 AS build
WORKDIR /workspace

# 先复制构建脚本，利用 Docker 层缓存
COPY backend/gradle ./backend/gradle
COPY backend/gradlew backend/gradle.properties backend/settings.gradle.kts backend/build.gradle.kts ./backend/
COPY backend/nowpass-admin ./backend/nowpass-admin
COPY backend/nowpass-common ./backend/nowpass-common
COPY backend/nowpass-framework ./backend/nowpass-framework
COPY backend/nowpass-system ./backend/nowpass-system

RUN cd backend && gradle :nowpass-admin:bootJar --no-daemon --console=plain

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S nowpass && adduser -S nowpass -G nowpass
WORKDIR /app
COPY --from=build /workspace/backend/nowpass-admin/build/libs/nowpass.jar /app/app.jar
RUN chown -R nowpass:nowpass /app
USER nowpass
EXPOSE 18090

ENV TZ=Asia/Shanghai \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:18090/api/auth/captcha || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
