package com.nowpass.framework.config

import org.jetbrains.exposed.v1.core.DatabaseConfig
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.spring.transaction.SpringTransactionManager
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.annotation.EnableTransactionManagement
import javax.sql.DataSource

/**
 * Exposed 与 Spring 事务集成。
 *
 * 要点（来自 Exposed 1.6.0 源码行为）：
 * 1. `SpringTransactionManager` 的构造器内部会执行 `Database.connect(datasource = ...)`，
 *    因此**不需要**再单独声明 `Database` bean，也**不能**再声明 `DataSourceTransactionManager`，
 *    否则 `@Transactional` 可能选错事务管理器。
 * 2. `DatabaseConfig.useNestedTransactions = false`：本站点没有嵌套事务需求，
 *    保持与外层 Spring 事务一致，避免出现两个"保存点"语义。
 * 3. **不开启自动建表**：表结构由 Flyway 独占管理，Exposed 只读不写 DDL。
 */
@Configuration
@EnableTransactionManagement
class ExposedConfig {

    @Bean
    fun transactionManager(dataSource: DataSource): PlatformTransactionManager =
        SpringTransactionManager(
            dataSource = dataSource,
            databaseConfig = DatabaseConfig { useNestedTransactions = false },
            showSql = false,
        )

    /**
     * 显式暴露 `Database`，供确有需要的地方（如原生 SQL 辅助方法）引用；
     * 与 `SpringTransactionManager` 内部注册的是同一个 DataSource。
     */
    @Bean
    fun database(dataSource: DataSource): Database =
        Database.connect(
            datasource = dataSource,
            databaseConfig = DatabaseConfig { useNestedTransactions = false },
        )
}
