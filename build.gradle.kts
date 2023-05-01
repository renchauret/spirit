import io.kotless.DSLType
import io.kotless.plugin.gradle.dsl.kotless
//import io.kotless.plugin.gradle.dsl.Webapp.Route53

group = "com.chauret"
version = "0.1.0"

plugins {
    kotlin("jvm") version "1.8.0" apply true
    id("io.kotless") version "0.2.0" apply true
    kotlin("plugin.serialization") version "1.8.10" apply true
}

repositories {
    mavenCentral()
    //Kotless repository
    maven(url = uri("https://packages.jetbrains.team/maven/p/ktls/maven"))
}

dependencies {
    implementation("io.kotless", "kotless-lang", "0.2.0")
    implementation("io.kotless", "kotless-lang-aws", "0.2.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")

    implementation("software.amazon.awssdk:bom:2.17.2")
    implementation("software.amazon.awssdk:dynamodb-enhanced:2.17.2")
    implementation("software.amazon.awssdk:dynamodb:2.17.2")
    implementation("software.amazon.awssdk:s3:2.17.2")

    implementation("org.slf4j:slf4j-simple:1.7.32")

    testImplementation(kotlin("test"))
}

kotless {
    config {
        dsl {
            type = DSLType.Kotless
        }
    }
    extensions {
        local {
            port = 3001
        }
    }
}

tasks.test {
    useJUnitPlatform()
}
