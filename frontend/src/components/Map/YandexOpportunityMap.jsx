import { useEffect, useMemo, useRef } from 'react'
import { OPPORTUNITY_LABELS } from '../../api/opportunities'

const YMAPS_API_KEY = 'd601eb63-a3ae-497f-b645-7370a96ef41c'

let ymapsScriptPromise = null

function loadYmaps() {
    if (window.ymaps) return Promise.resolve(window.ymaps)
    if (ymapsScriptPromise) return ymapsScriptPromise

    ymapsScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YMAPS_API_KEY}&lang=ru_RU`
        script.async = true
        script.onload = () => {
            if (!window.ymaps) {
                reject(new Error('Yandex Maps API не загрузился'))
                return
            }
            window.ymaps.ready(() => resolve(window.ymaps))
        }
        script.onerror = () => reject(new Error('Не удалось загрузить Yandex Maps API'))
        document.head.appendChild(script)
    })

    return ymapsScriptPromise
}

function formatMoney(from, to, currency) {
    if (from == null && to == null) return 'По договорённости'
    const values = []
    if (from != null) values.push(`от ${Number(from).toLocaleString('ru-RU')}`)
    if (to != null) values.push(`до ${Number(to).toLocaleString('ru-RU')}`)
    return `${values.join(' ')} ${currency || ''}`.trim()
}

function escapeHtml(value) {
    if (!value) return ''
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function markerSvg(color) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 1C9.268 1 3 7.268 3 15c0 11 14 28 14 28s14-17 14-28C31 7.268 24.732 1 17 1z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="17" cy="15" r="5" fill="#ffffff"/>
        </svg>
    `)}`
}

function buildBalloon(point) {
    const tags = (point.preview?.tags || [])
        .slice(0, 4)
        .map((tag) => `<span style="display:inline-block;background:#edf6f7;color:#365f65;padding:3px 8px;border-radius:8px;font-size:11px;margin:2px;">${escapeHtml(tag.name)}</span>`)
        .join('')

    const typeLabel = OPPORTUNITY_LABELS.type[point.type] || 'Возможность'
    return `
        <div style="max-width:300px;font-family:Manrope,Arial,sans-serif;">
          <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start;margin-bottom:6px;">
            <h4 style="margin:0;color:#10272b;font-size:15px;line-height:1.3;">${escapeHtml(point.preview?.title || point.title)}</h4>
            <span style="font-size:11px;color:#0f5f68;background:#dceff1;padding:2px 8px;border-radius:999px;">${escapeHtml(typeLabel)}</span>
          </div>
          <p style="margin:0 0 4px;color:#264a50;font-weight:700;">${escapeHtml(point.preview?.companyName || point.companyName)}</p>
          <p style="margin:0 0 6px;color:#547379;font-size:12px;">${escapeHtml(point.addressLine || point.cityName || 'Адрес не указан')}</p>
          <p style="margin:0 0 6px;color:#45666b;font-size:13px;line-height:1.45;">${escapeHtml(point.preview?.shortDescription || '')}</p>
          <p style="margin:0 0 6px;color:#10272b;font-size:13px;font-weight:700;">${escapeHtml(formatMoney(point.preview?.salaryFrom, point.preview?.salaryTo, point.preview?.salaryCurrency))}</p>
          <div>${tags}</div>
        </div>
    `
}

export default function YandexOpportunityMap({ points, favoriteCompanies, focusedOpportunityId, onOpenCard }) {
    const rootRef = useRef(null)
    const mapRef = useRef(null)
    const placemarksRef = useRef(new Map())
    const focusRetryRef = useRef(null)

    const center = useMemo(() => {
        const first = points.find((point) => point.latitude && point.longitude)
        if (!first) return [55.751244, 37.618423]
        return [first.latitude, first.longitude]
    }, [points])

    useEffect(() => {
        let isDisposed = false

        async function initMap() {
            const ymaps = await loadYmaps()
            if (isDisposed || !rootRef.current) return

            if (!mapRef.current) {
                mapRef.current = new ymaps.Map(rootRef.current, {
                    center,
                    zoom: 5,
                    controls: ['zoomControl', 'typeSelector', 'fullscreenControl'],
                })
            }

            const map = mapRef.current
            map.geoObjects.removeAll()
            placemarksRef.current.clear()

            points
                .filter((point) => point.latitude && point.longitude)
                .forEach((point) => {
                    const isFavorite = favoriteCompanies.has(point.companyName)
                    const placemark = new ymaps.Placemark(
                        [point.latitude, point.longitude],
                        {
                            balloonContentBody: buildBalloon(point),
                            iconCaption: `${point.companyName || ''} · ${point.title || ''}`.slice(0, 45),
                        },
                        {
                            iconLayout: 'default#imageWithContent',
                            iconImageHref: markerSvg(isFavorite ? '#f59f0a' : '#0f5f68'),
                            iconImageSize: [34, 44],
                            iconImageOffset: [-17, -44],
                            iconContentOffset: [0, 0],
                            iconCaptionMaxWidth: '220',
                        }
                    )

                    placemark.events.add('click', () => onOpenCard(point.id))
                    map.geoObjects.add(placemark)
                    placemarksRef.current.set(point.id, placemark)
                })

            // Автоподгоняем только когда фокус не задан.
            if (!focusedOpportunityId) {
                if (map.geoObjects.getLength() > 0) {
                    map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 40 })
                } else {
                    map.setCenter(center, 5)
                }
            }

            map.container.fitToViewport()
        }

        initMap().catch((error) => console.error('[YandexOpportunityMap] init error', error))

        return () => {
            isDisposed = true
            if (focusRetryRef.current) {
                clearTimeout(focusRetryRef.current)
            }
        }
    }, [center, favoriteCompanies, onOpenCard, points, focusedOpportunityId])

    useEffect(() => {
        if (!focusedOpportunityId || !mapRef.current) return

        const tryFocus = (attempt = 0) => {
            const map = mapRef.current
            const placemark = placemarksRef.current.get(focusedOpportunityId)

            if (!map || !placemark) {
                if (attempt < 8) {
                    focusRetryRef.current = setTimeout(() => tryFocus(attempt + 1), 120)
                }
                return
            }

            try {
                map.container.fitToViewport()
                const coords = placemark.geometry.getCoordinates()
                map.setCenter(coords, 14, { duration: 350, checkZoomRange: true })
                placemark.balloon.open()
            } catch (error) {
                console.error('[YandexOpportunityMap] focus error', error)
            }
        }

        if (focusRetryRef.current) clearTimeout(focusRetryRef.current)
        tryFocus()

        return () => {
            if (focusRetryRef.current) {
                clearTimeout(focusRetryRef.current)
            }
        }
    }, [focusedOpportunityId, points])

    return <div ref={rootRef} className="opportunities-page__map" />
}