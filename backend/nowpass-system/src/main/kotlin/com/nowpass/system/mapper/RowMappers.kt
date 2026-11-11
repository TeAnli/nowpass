package com.nowpass.system.mapper

import com.nowpass.common.enums.UserStatus
import com.nowpass.system.domain.model.OperLogItem
import com.nowpass.system.domain.model.Question
import com.nowpass.system.domain.model.QuestionAnswer
import com.nowpass.system.domain.model.QuestionDetail
import com.nowpass.system.domain.model.QuestionListItem
import com.nowpass.system.domain.model.SysUser
import com.nowpass.system.domain.model.UserListItem
import com.nowpass.system.domain.table.QuestionCategoryTable
import com.nowpass.system.domain.table.QuestionTable
import com.nowpass.system.domain.table.SysOperLogTable
import com.nowpass.system.domain.table.SysUserTable
import org.jetbrains.exposed.v1.core.ResultRow

/**
 * ResultRow -> 领域模型的映射。
 */

fun ResultRow.toSysUser(roleKeys: List<String> = emptyList(), permissions: List<String> = emptyList()): SysUser =
    SysUser(
        id = this[SysUserTable.id],
        username = this[SysUserTable.username],
        password = this[SysUserTable.password],
        nickname = this[SysUserTable.nickname],
        email = this[SysUserTable.email],
        status = UserStatus.of(this[SysUserTable.status]),
        remark = this[SysUserTable.remark],
        createTime = this[SysUserTable.createTime],
        roleKeys = roleKeys,
        permissions = permissions,
    )

fun ResultRow.toUserListItem(roleKeys: List<String>): UserListItem =
    UserListItem(
        id = this[SysUserTable.id],
        username = this[SysUserTable.username],
        nickname = this[SysUserTable.nickname],
        email = this[SysUserTable.email],
        status = this[SysUserTable.status],
        roleKeys = roleKeys,
        createTime = this[SysUserTable.createTime],
    )

fun ResultRow.toQuestionListItem(): QuestionListItem =
    QuestionListItem(
        id = this[QuestionTable.id],
        categoryId = this[QuestionTable.categoryId],
        categoryName = this[QuestionCategoryTable.name],
        difficulty = this[QuestionTable.difficulty],
        title = this[QuestionTable.title],
        tags = this[QuestionTable.tags],
        viewCount = this[QuestionTable.viewCount],
        createTime = this[QuestionTable.createTime],
    )

fun ResultRow.toQuestionDetail(): QuestionDetail =
    QuestionDetail(
        id = this[QuestionTable.id],
        categoryId = this[QuestionTable.categoryId],
        categoryName = this[QuestionCategoryTable.name],
        difficulty = this[QuestionTable.difficulty],
        title = this[QuestionTable.title],
        contentMd = this[QuestionTable.contentMd],
        options = this[QuestionTable.optionJson],
        tags = this[QuestionTable.tags],
        createTime = this[QuestionTable.createTime],
    )

fun ResultRow.toQuestionAnswer(): QuestionAnswer =
    QuestionAnswer(
        id = this[QuestionTable.id],
        answerMd = this[QuestionTable.answerMd],
        answerKey = this[QuestionTable.answerKey],
    )

fun ResultRow.toQuestion(): Question =
    Question(
        id = this[QuestionTable.id],
        categoryId = this[QuestionTable.categoryId],
        categoryName = null,
        difficulty = this[QuestionTable.difficulty],
        title = this[QuestionTable.title],
        contentMd = this[QuestionTable.contentMd],
        answerMd = this[QuestionTable.answerMd],
        options = this[QuestionTable.optionJson],
        answerKey = this[QuestionTable.answerKey],
        tags = this[QuestionTable.tags],
        createBy = this[QuestionTable.createBy],
        createTime = this[QuestionTable.createTime],
        updateTime = this[QuestionTable.updateTime],
    )

fun ResultRow.toOperLogItem(): OperLogItem =
    OperLogItem(
        id = this[SysOperLogTable.id],
        title = this[SysOperLogTable.title],
        businessType = this[SysOperLogTable.businessType],
        requestMethod = this[SysOperLogTable.requestMethod],
        operName = this[SysOperLogTable.operName],
        operUrl = this[SysOperLogTable.operUrl],
        operIp = this[SysOperLogTable.operIp],
        status = this[SysOperLogTable.status],
        errorMsg = this[SysOperLogTable.errorMsg],
        costTime = this[SysOperLogTable.costTime],
        operTime = this[SysOperLogTable.operTime],
    )
