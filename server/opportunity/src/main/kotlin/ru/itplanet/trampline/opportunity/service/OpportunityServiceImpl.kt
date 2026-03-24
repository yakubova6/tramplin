package ru.itplanet.trampline.opportunity.service

import org.springframework.context.annotation.Primary
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.opportunity.converter.OpportunityConverter
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.dao.specification.OpportunitySpecification
import ru.itplanet.trampline.opportunity.exception.OpportunityNotFoundException
import ru.itplanet.trampline.opportunity.model.OpportunityCard
import ru.itplanet.trampline.opportunity.model.OpportunityListItem
import ru.itplanet.trampline.opportunity.model.OpportunityMapPoint
import ru.itplanet.trampline.opportunity.model.OpportunityPage
import ru.itplanet.trampline.opportunity.model.request.GetOpportunityListRequest
import ru.itplanet.trampline.opportunity.util.OffsetBasedPageRequest
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Primary
@Service
class OpportunityServiceImpl(
    private val opportunityDao: OpportunityDao,
    private val opportunityConverter: OpportunityConverter
) : OpportunityService {

    @Transactional(readOnly = true)
    override fun getPublicCatalog(request: GetOpportunityListRequest): OpportunityPage<OpportunityListItem> {
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val pageable = OffsetBasedPageRequest(
            limit = request.limit,
            offset = request.offset,
            sort = Sort.by(request.sortDirection.toSpring(), request.sortBy.property)
        )

        val page = opportunityDao.findAll(
            OpportunitySpecification.build(request, now),
            pageable
        )

        return OpportunityPage(
            items = page.content.map(opportunityConverter::toListItem),
            limit = request.limit,
            offset = request.offset,
            total = page.totalElements
        )
    }

    @Transactional(readOnly = true)
    override fun getPublicMap(request: GetOpportunityListRequest): OpportunityPage<OpportunityMapPoint> {
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val pageable = OffsetBasedPageRequest(
            limit = request.limit,
            offset = request.offset,
            sort = Sort.by(request.sortDirection.toSpring(), request.sortBy.property)
        )

        val page = opportunityDao.findAll(
            OpportunitySpecification.build(request, now),
            pageable
        )

        return OpportunityPage(
            items = page.content.map(opportunityConverter::toMapPoint),
            limit = request.limit,
            offset = request.offset,
            total = page.totalElements
        )
    }

    @Transactional(readOnly = true)
    override fun getPublicOpportunity(id: Long): OpportunityCard {
        val now = OffsetDateTime.now(ZoneOffset.UTC)

        val dto = opportunityDao.findOne(
            OpportunitySpecification.publicById(id, now)
        ).orElseThrow { OpportunityNotFoundException(id) }

        return opportunityConverter.toCard(dto)
    }
}
