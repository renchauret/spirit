package com.chauret.db

import kotlin.reflect.KClass
import software.amazon.awssdk.auth.credentials.ProfileCredentialsProvider
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable
import software.amazon.awssdk.enhanced.dynamodb.Expression
import software.amazon.awssdk.enhanced.dynamodb.Key
import software.amazon.awssdk.enhanced.dynamodb.TableSchema
import software.amazon.awssdk.enhanced.dynamodb.model.BatchWriteItemEnhancedRequest
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest
import software.amazon.awssdk.enhanced.dynamodb.model.ReadBatch
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest
import software.amazon.awssdk.enhanced.dynamodb.model.WriteBatch
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.AttributeValue
import kotlin.streams.toList

open class DynamoDatabase<T: Any> constructor(private val type : KClass<T>): Database<T> {

    companion object{
        inline operator fun <reified T: Any> invoke() = DynamoDatabase(T::class)
    }

    private val client: DynamoDbClient = DynamoDbClient.builder()
        .region(Region.US_EAST_2)
        .credentialsProvider(ProfileCredentialsProvider.builder()
            .profileName("spirit-backend")
            .build()
        )
        .build()
    private val enhancedClient = DynamoDbEnhancedClient.builder()
        .dynamoDbClient(client)
        .build()

    private val tableName: String = type.simpleName?.lowercase() ?: "table"
    private val tableSchema = TableSchema.fromBean(type.java)
    private val table: DynamoDbTable<T> = enhancedClient.table(tableName, tableSchema)

    /**
     * Get an item from the table by its primary key
     * @param key the value of the partitionKey of the item
     * @param secondaryKey the value of the sortKey of the item, if it has one
     */
    override fun get(key: String, secondaryKey: String?): T? =
        if (secondaryKey == null) {
            table.getItem(
                Key.builder()
                    .partitionValue(key)
                    .build()
            )
        } else {
            table.getItem(
                Key.builder()
                    .partitionValue(key)
                    .sortValue(secondaryKey)
                    .build()
            )
        }

    /**
     * Get an item from the table by any number of values
     * Less efficient than get(key), only use if you don't have the partitionKey value
     * @param queryArguments a map of attribute names to query and their values
     */
    override fun get(queryArguments: Map<String, Any>): T? {
        return table.scan(ScanEnhancedRequest.builder()
            .filterExpression(Expression.builder()
                .expression(queryArguments.keys.joinToString(" AND ") { "$it = :$it" })
                .expressionValues(queryArguments
                    .mapKeys { ":${it.key}" }
                    .mapValues { AttributeValue.builder().s(it.value.toString()).build() }
                )
                .build()
            )
            .build()
        ).items().firstOrNull()
    }

    override fun getAllForKeyAndSecondaryKeys(key: String, secondaryKeys: List<String>): List<T> {
        var readBatchBuilder = ReadBatch.builder(type.java)
            .mappedTableResource(table)
        secondaryKeys.forEach {
            readBatchBuilder = readBatchBuilder.addGetItem(Key.builder().partitionValue(key).sortValue(it).build())
        }
        return enhancedClient.batchGetItem {
                builder -> builder.addReadBatch(readBatchBuilder.build())
        }.resultsForTable(table).stream().toList()
    }

    override fun get(key: String, queryArguments: Map<String, Any>): T? =
        table.query(
            QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.keyEqualTo(
                    Key.builder()
                        .partitionValue(key)
                        .build()
                ))
                .filterExpression(Expression.builder()
                    .expression(queryArguments.keys.joinToString(" AND ") { "$it = :$it" })
                    .expressionValues(queryArguments
                        .mapKeys { ":${it.key}" }
                        .mapValues { AttributeValue.builder().s(it.value.toString()).build() }
                    )
                    .build()
                )
                .build()
        ).items().firstOrNull()

    override fun getAllForKey(key: String): List<T> =
        table.query(
            QueryConditional.keyEqualTo(
                Key.builder()
                    .partitionValue(key)
                    .build()
            )
        ).items().stream().toList()

    override fun delete(id: String) {
        table.deleteItem(Key.builder().partitionValue(id).build())
    }

    override fun create(item: T) {
        table.putItem(item)
    }

    override fun create(items: List<T>) {
        if (items.isEmpty()) return
        var writeBatchBuilder = WriteBatch.builder(type.java)
            .mappedTableResource(table)
        items.forEach { writeBatchBuilder = writeBatchBuilder.addPutItem(it) }
        enhancedClient.batchWriteItem(
            BatchWriteItemEnhancedRequest.builder()
                .addWriteBatch(writeBatchBuilder.build())
                .build()
        )
    }

    override fun update(item: T) {
        table.updateItem(item)
    }


    /**
     * Delete the table and recreate it
     */
    override fun createTable() {
        runCatching {
            table.deleteTable()
            client.waiter().waitUntilTableNotExists { builder -> builder.tableName(tableName) }
        }
        table.createTable()
        client.waiter().waitUntilTableExists { builder -> builder.tableName(tableName) }
        println("Created table $tableName")
    }

    /**
     * Enable TTL on the table
     * @param attributeName must be a number field of class T representing epoch time in seconds
     */
    override fun enableTimeToLive(attributeName: String) {
        println(client.updateTimeToLive { builder ->
            builder.tableName(tableName)
            builder.timeToLiveSpecification {
                it.attributeName(attributeName)
                it.enabled(true)
            }
        })
    }
}
