package ru.itplanet.trampline.geo.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import ru.itplanet.trampline.geo.client.dadata.DadataAddressResponse
import ru.itplanet.trampline.geo.client.dadata.DadataAddressSuggestRequest

@FeignClient(
    name = "geo-dadata-address-client",
    url = "\${dadata.url}",
    configuration = [DadataFeignConfig::class],
)
interface DadataAddressClient {

    @PostMapping("/suggestions/api/4_1/rs/suggest/address")
    fun suggestAddress(
        @RequestBody request: DadataAddressSuggestRequest,
    ): DadataAddressResponse
}
