package ru.itplanet.trampline.opportunity.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.opportunity.service.TagService

@RestController
@RequestMapping("/internal/tags")
class InternalTagController(
    private val tagService: TagService,
) {

    @GetMapping
    fun getActiveTagsByIds(
        @RequestParam ids: List<Long>,
    ): List<Tag> {
        return tagService.getActiveTagsByIds(ids)
    }
}
