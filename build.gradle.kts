import io.kotless.DSLType
import io.kotless.plugin.gradle.dsl.kotless

//import io.kotless.plugin.gradle.dsl.Webapp.Route53

group = "com.chauret"
version = "0.1.0"

plugins {
    kotlin("plugin.serialization") version "1.8.20" apply true
    kotlin("multiplatform") version "1.8.20"
    id("io.kotless") version "0.2.0" apply true
    // KSP support
//    id("com.google.devtools.ksp") version "1.8.20-1.0.10"
}

repositories {
    mavenCentral()
    //Kotless repository
    maven(url = uri("https://packages.jetbrains.team/maven/p/ktls/maven"))
    maven("https://s01.oss.sonatype.org/content/repositories/snapshots/") // new repository here
}

kotless {
    config {
        dsl {
            type = DSLType.Kotless
        }
    }
    extensions {
        local {
            port = 8081
        }
    }
}

//val fritz2Version = "1.0-RC4"

kotlin {
    jvm()
    js(IR) {
        browser()
    }.binaries.executable()

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")
            }
        }
        val jvmMain by getting {
            dependencies {
                implementation("io.kotless:kotless-lang:0.2.0")
                implementation("io.kotless:kotless-lang-aws:0.2.0")

                implementation("software.amazon.awssdk:bom:2.17.2")
                implementation("software.amazon.awssdk:dynamodb-enhanced:2.17.2")
                implementation("software.amazon.awssdk:dynamodb:2.17.2")
                implementation("software.amazon.awssdk:s3:2.17.2")

                implementation("org.slf4j:slf4j-simple:1.7.32")

                // testImplementation?
                implementation(kotlin("test"))
            }

//            tasks.test {
//                useJUnitPlatform()
//            }
        }
        val jsMain by getting {
            dependencies {
                // tailwind
                implementation(npm("tailwindcss", "3.2.1"))
                implementation(npm("@tailwindcss/forms", "0.5.3"))

                // webpack
                implementation(devNpm("postcss", "8.4.17"))
                implementation(devNpm("postcss-loader", "7.0.1"))
                implementation(devNpm("autoprefixer", "10.4.12"))
                implementation(devNpm("css-loader", "6.7.1"))
                implementation(devNpm("style-loader", "3.3.1"))
                implementation(devNpm("cssnano", "5.1.13"))

                // React, React DOM + Wrappers
                implementation(enforcedPlatform("org.jetbrains.kotlin-wrappers:kotlin-wrappers-bom:1.0.0-pre.354"))
                implementation("org.jetbrains.kotlin-wrappers:kotlin-react")
                implementation("org.jetbrains.kotlin-wrappers:kotlin-react-dom")

                // Kotlin React Emotion (CSS)
                implementation("org.jetbrains.kotlin-wrappers:kotlin-emotion")

                // Video Player
                implementation(npm("react-player", "2.10.1"))

                // Share Buttons
                implementation(npm("react-share", "4.4.0"))

                // Coroutines & serialization
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.3")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")
            }
        }
    }
}

/**
 * KSP support - start
 */
dependencies {
    "implementation"("io.kotless", "kotless-lang", "0.2.0")
    "implementation"("org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")
//    add("kspCommonMainMetadata", "org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")
}
kotlin.sourceSets.commonMain { kotlin.srcDir("build/generated/ksp/metadata/commonMain/kotlin") }

//tasks.withType<org.jetbrains.kotlin.gradle.dsl.KotlinCompile<*>>().all {
//    if (name != "kspCommonMainKotlinMetadata") dependsOn("kspCommonMainKotlinMetadata")
//}
/**
 * KSP support - end
 */
