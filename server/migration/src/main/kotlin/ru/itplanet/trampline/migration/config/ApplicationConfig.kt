package ru.itplanet.trampline.migration.config

data class ApplicationConfig(
    var datasource: Datasource? = null
) {
    data class Datasource(
        var url: String = "",
        var username: String = "",
        var password: String = ""
    )
}
