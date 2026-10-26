pluginManagement {
    repositories {
        // 国内网络优先走阿里云镜像，官方源兜底
        maven("https://maven.aliyun.com/repository/gradle-plugin")
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositories {
        maven("https://maven.aliyun.com/repository/public")
        mavenCentral()
    }
}

rootProject.name = "nowpass"

include(
    "nowpass-common",
    "nowpass-framework",
    "nowpass-system",
    "nowpass-admin",
)
