# NowPass backend — multi-stage build
FROM gradle:8.14.4-jdk21 AS build
WORKDIR /workspace

# 先复制构建脚本，利用 Docker 层缓存
COPY gradle ./gradle
COPY gradlew gradle.properties settings.gradle.kts build.gradle.kts ./
COPY nowpass-common ./nowpass-common
COPY nowpass-framework ./nowpass-framework
COPY nowpass-system ./nowpass-system
COPY nowpass-admin ./nowpass-admin

RUN gradle :nowpass-admin:bootJar --no-daemon --console=plain

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S nowpass && adduser -S nowpass -G nowpass
WORKDIR /app
COPY --from=build /workspace/nowpass-admin/build/libs/nowpass.jar /app/app.jar
RUN chown -R nowpass:nowpass /app
USER nowpass
EXPOSE 18090

ENV TZ=Asia/Shanghai \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:18090/api/auth/captcha || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
