package com.nowpass.system.domain.model

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime

data class VideoCommentItem(
    val id: Long,
    val videoId: Long,
    val userId: Long,
    val nickname: String,
    val content: String,
    val createTime: OffsetDateTime,
)

data class VideoCommentOwner(
    val videoId: Long,
    val userId: Long,
)

data class VideoCommentCommand(
    @field:NotBlank(message = "评论不能为空")
    @field:Size(max = 500, message = "评论不能超过 500 字")
    val content: String,
)

data class VideoDanmakuItem(
    val id: Long,
    val videoId: Long,
    val userId: Long,
    val nickname: String,
    val content: String,
    val timeMs: Int,
    val color: String,
    val mode: String,
    val createTime: OffsetDateTime,
)

data class VideoDanmakuCommand(
    @field:NotBlank(message = "弹幕不能为空")
    @field:Size(max = 60, message = "弹幕不能超过 60 字")
    val content: String,

    @field:Min(0, message = "弹幕时间不能为负数")
    @field:Max(10800000, message = "弹幕时间超出范围")
    val timeMs: Int,

    @field:Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "弹幕颜色必须是 #RRGGBB")
    val color: String? = null,

    @field:Pattern(regexp = "scroll|top|bottom", message = "弹幕位置只能是 scroll、top 或 bottom")
    val mode: String? = null,
)
