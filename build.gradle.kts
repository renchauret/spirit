import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar
import io.kotless.DSLType
import io.kotless.plugin.gradle.dsl.kotless
import org.jetbrains.kotlin.gradle.dsl.KotlinMultiplatformExtension

//import io.kotless.plugin.gradle.dsl.Webapp.Route53

group = "com.chauret"
version = "0.1.0"

plugins {
    kotlin("plugin.serialization") version "1.8.20" apply true
    kotlin("multiplatform") version "1.8.20"
    id("io.kotless") version "0.2.0.2" apply false
    id("com.github.johnrengelman.shadow") version "6.0.0" apply true
}

repositories {
    mavenCentral()
    //Kotless repository
    maven(url = uri("https://packages.jetbrains.team/maven/p/ktls/maven"))
    maven("https://s01.oss.sonatype.org/content/repositories/snapshots/") // new repository here
    gradlePluginPortal()
}



tasks.withType<ShadowJar> {
//    manifest {
//        attributes("Main-Class" to "main.fully.qualified.Class")
//    }
    archiveClassifier.set("all")
    val main by kotlin.jvm().compilations
    from(main.output)
    configurations = listOf(main.runtimeDependencyFiles, main.runtimeDependencyFiles) as MutableList<Configuration>?
//    configurations.add(main.compileDependencyFiles as Configuration)
//    configurations.add(main.runtimeDependencyFiles as Configuration)
//    configurations += main.compileDependencyFiles as Configuration
//    configurations += main.runtimeDependencyFiles as Configuration
}
tasks {
    val shadowCreate by creating(ShadowJar::class) {
//        manifest {
//            attributes["Main-Class"] = "<mainfullyqualified>"
//        }
        archiveClassifier.set("all")
        from(kotlin.jvm().compilations.first().output)
        configurations =
            mutableListOf(
                kotlin.jvm().compilations.first().compileDependencyFiles as Configuration,
                kotlin.jvm().compilations.first().runtimeDependencyFiles as Configuration
            )
    }
    val build by existing {
        dependsOn(shadowCreate)
    }
}
//kotless {
//    config {
//        dsl {
//            type = DSLType.Kotless
////            staticsRoot = projectDir.resolve("src/jvmMain/kotlin/resources")
//        }
//    }
//    extensions {
//        local {
//            port = 8081
//        }
//    }
//}
kotlin {
    jvm()
    js(IR) {
        browser()
    }.binaries.executable()
//    project.logger.lifecycle(getByName("classes").name)

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")
            }
        }
        val jvmMain by getting {
            plugins.apply("io.kotless")
//            projectDir.resolve("src/jvmMain/kotlin").mkdirs()
//            projectDir.renameTo(projectDir.resolve("src/jvmMain/kotlin"))

            val kotlinExtension = extensions.getByName("kotlin") as KotlinMultiplatformExtension
            project.logger.lifecycle(kotlinExtension.sourceSets.asMap.keys.joinToString { it })
            project.logger.lifecycle(
                kotlinExtension.sourceSets.asMap["jvmMain"]!!.kotlin.files.toSet().joinToString { it.name })
            project.logger.lifecycle(projectDir.resolve("src/jvmMain").canonicalPath)
            project.logger.lifecycle(tasks.asMap.keys.joinToString { it })
            kotless {
                config {
                    dsl {
                        type = DSLType.Kotless
                        staticsRoot = projectDir.resolve("")
                    }
                }
                extensions {
                    local {
                        port = 8081
                    }
                }
            }
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

                implementation(npm("formik", "2.2.9"))
            }
        }
    }
}

//registerShadowJar("jvm")
dependencies {
    "implementation"("io.kotless", "kotless-lang", "0.2.0")
    "implementation"("org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")
    "implementation"("com.github.jengelman.gradle.plugins", "shadow", "6.0.0")
//    add("kspCommonMainMetadata", "org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")
}
//val defaultMainClassName: String? = null

//fun registerShadowJar(targetName: String, mainClassName: String? = defaultMainClassName) {
//    kotlin.targets.named<KotlinJvmTarget>(targetName) {
//        compilations.named("main") {
//            tasks {
////                val shadowJar = register<ShadowJar>("${targetName}ShadowJar") {
//                val shadowJar = register<ShadowJar>("${targetName}ShadowJar") {
//                    group = "build"
//                    from(output)
//                    configurations = listOf(runtimeDependencyFiles) as MutableList<Configuration>?
//                    archiveAppendix.set(targetName)
//                    archiveClassifier.set("all")
//                    if (mainClassName != null) {
//                        manifest {
//                            attributes("Main-Class" to mainClassName)
//                        }
//                    }
//                    mergeServiceFiles()
//                }
//                getByName("shadowJar") {
//                    finalizedBy(shadowJar)
//                }
//            }
//        }
//    }
//}
