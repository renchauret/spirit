rootProject.name = "spirit"

pluginManagement {
    resolutionStrategy {
        this.eachPlugin {
            if (requested.id.id == "io.kotless") {
                useModule("io.kotless:gradle:${this.requested.version}")
            }
        }
    }

    repositories {
        maven(url = uri("https://packages.jetbrains.team/maven/p/ktls/maven"))
        gradlePluginPortal()
        mavenCentral()
        mavenLocal()
    }
}
