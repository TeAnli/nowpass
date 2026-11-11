package com.nowpass.system.domain.dao

import com.nowpass.system.domain.model.UserOauth
import com.nowpass.system.domain.table.UserOauthTable
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

@Repository
class UserOauthDao {

    fun find(provider: String, providerUserId: String): UserOauth? =
        UserOauthTable.select(
            UserOauthTable.id,
            UserOauthTable.userId,
            UserOauthTable.provider,
            UserOauthTable.providerUserId,
            UserOauthTable.unionId,
            UserOauthTable.nickname,
            UserOauthTable.avatarUrl,
        )
            .where {
                (UserOauthTable.provider eq provider) and (UserOauthTable.providerUserId eq providerUserId)
            }
            .limit(1)
            .firstOrNull()
            ?.let { row ->
                UserOauth(
                    id = row[UserOauthTable.id],
                    userId = row[UserOauthTable.userId],
                    provider = row[UserOauthTable.provider],
                    providerUserId = row[UserOauthTable.providerUserId],
                    unionId = row[UserOauthTable.unionId],
                    nickname = row[UserOauthTable.nickname],
                    avatarUrl = row[UserOauthTable.avatarUrl],
                )
            }

    fun insert(
        userId: Long,
        provider: String,
        providerUserId: String,
        unionId: String?,
        nickname: String?,
        avatarUrl: String?,
    ): Long =
        UserOauthTable.insert {
            it[UserOauthTable.userId] = userId
            it[UserOauthTable.provider] = provider
            it[UserOauthTable.providerUserId] = providerUserId
            it[UserOauthTable.unionId] = unionId
            it[UserOauthTable.nickname] = nickname
            it[UserOauthTable.avatarUrl] = avatarUrl
            it[lastLoginAt] = OffsetDateTime.now()
            it[createTime] = OffsetDateTime.now()
        } get UserOauthTable.id

    fun touch(id: Long, nickname: String?, avatarUrl: String?): Int =
        UserOauthTable.update({ UserOauthTable.id eq id }) {
            it[UserOauthTable.nickname] = nickname
            it[UserOauthTable.avatarUrl] = avatarUrl
            it[lastLoginAt] = OffsetDateTime.now()
        }
}
