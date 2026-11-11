package com.nowpass.controller

import com.nowpass.common.response.PageResult
import com.nowpass.common.response.R
import com.nowpass.framework.video.VideoCategoryService
import com.nowpass.framework.video.VideoService
import com.nowpass.system.domain.model.VideoCategory
import com.nowpass.system.domain.model.VideoDetail
import com.nowpass.system.domain.model.VideoListItem
import com.nowpass.system.domain.model.VideoPlayUrl
import com.nowpass.system.domain.query.VideoPageQuery
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 用户端视频讲解接口。
 */
@Tag(name = "04. 视频讲解", description = "已发布视频的列表、详情与播放地址")
@RestController
@RequestMapping("/api/videos")
class VideoController(
    private val videoService: VideoService,
    private val videoCategoryService: VideoCategoryService,
) {

    @Operation(summary = "视频分类")
    @GetMapping("/categories")
    fun categories(): R<List<VideoCategory>> = R.ok(videoCategoryService.list())

    @Operation(summary = "视频列表")
    @GetMapping
    fun page(@ModelAttribute query: VideoPageQuery): R<PageResult<VideoListItem>> =
        R.ok(videoService.userPage(query))

    @Operation(summary = "已发布视频标签")
    @GetMapping("/tags")
    fun tags(): R<List<String>> = R.ok(videoService.publishedTags())

    @Operation(summary = "视频详情")
    @GetMapping("/{id}")
    fun detail(@PathVariable id: Long): R<VideoDetail> = R.ok(videoService.userDetail(id))

    @Operation(summary = "视频播放预签名地址")
    @GetMapping("/{id}/play")
    fun play(@PathVariable id: Long): R<VideoPlayUrl> = R.ok(VideoPlayUrl(videoService.playUrl(id)))
}
