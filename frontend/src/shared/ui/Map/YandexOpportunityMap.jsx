import { useEffect, useMemo, useRef, useState } from 'react'
import { OPPORTUNITY_LABELS } from '@/shared/api/opportunities'
import './YandexOpportunityMap.scss'

const YMAPS_API_KEY = import.meta.env.VITE_YMAPS_API_KEY

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
    if (!value && value !== 0) return ''

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
    const preview = point.preview || {}
    const tags = (preview.tags || [])
        .slice(0, 4)
        .map(
            (tag) => `
                <span class="yandex-opportunity-map__tag">
                    ${escapeHtml(tag.name)}
                </span>
            `
        )
        .join('')

    const title = preview.title || point.title
    const companyName = preview.companyName || point.companyName
    const typeLabel = OPPORTUNITY_LABELS.type[point.type] || 'Возможность'
    const rawWorkFormat =
        preview.workFormat ||
        point.workFormat ||
        preview.format ||
        point.format ||
        ''

    const formatLabel =
        OPPORTUNITY_LABELS.workFormat[rawWorkFormat] ||
        rawWorkFormat ||
        'Формат не указан'
    const salary = formatMoney(preview.salaryFrom, preview.salaryTo, preview.salaryCurrency)

    return `
        <div class="yandex-opportunity-map__popup yandex-opportunity-map__popup--balloon">
            <div class="yandex-opportunity-map__header">
                <h4 class="yandex-opportunity-map__title">
                    ${escapeHtml(title)}
                </h4>

                <span class="yandex-opportunity-map__badge yandex-opportunity-map__badge--type">
                    ${escapeHtml(typeLabel)}
                </span>
            </div>

            <p class="yandex-opportunity-map__company">
                ${escapeHtml(companyName)}
            </p>

            <div class="yandex-opportunity-map__badges">
                <span class="yandex-opportunity-map__badge">
                    ${escapeHtml(formatLabel)}
                </span>

                <span class="yandex-opportunity-map__badge yandex-opportunity-map__badge--salary">
                    ${escapeHtml(salary)}
                </span>
            </div>

            <p class="yandex-opportunity-map__address">
                ${escapeHtml(point.addressLine || point.cityName || 'Адрес не указан')}
            </p>

            <p class="yandex-opportunity-map__description">
                ${escapeHtml(preview.shortDescription || '')}
            </p>

            ${tags ? `<div class="yandex-opportunity-map__tags">${tags}</div>` : ''}
        </div>
    `
}

function buildHint(point) {
    const preview = point.preview || {}
    const tags = (preview.tags || [])
        .slice(0, 3)
        .map(
            (tag) => `
                <span class="yandex-opportunity-map__tag yandex-opportunity-map__tag--hint">
                    ${escapeHtml(tag.name)}
                </span>
            `
        )
        .join('')

    const title = preview.title || point.title
    const companyName = preview.companyName || point.companyName
    const typeLabel = OPPORTUNITY_LABELS.type[point.type] || 'Возможность'
    const rawWorkFormat =
        preview.workFormat ||
        point.workFormat ||
        preview.format ||
        point.format ||
        ''

    const formatLabel =
        OPPORTUNITY_LABELS.workFormat[rawWorkFormat] ||
        rawWorkFormat ||
        'Формат не указан'
    const salary = formatMoney(preview.salaryFrom, preview.salaryTo, preview.salaryCurrency)

    return `
        <div class="yandex-opportunity-map__popup yandex-opportunity-map__popup--hint">
            <div class="yandex-opportunity-map__header">
                <h4 class="yandex-opportunity-map__title">
                    ${escapeHtml(title)}
                </h4>

                <span class="yandex-opportunity-map__badge yandex-opportunity-map__badge--type">
                    ${escapeHtml(typeLabel)}
                </span>
            </div>

            <p class="yandex-opportunity-map__company">
                ${escapeHtml(companyName)}
            </p>

            <div class="yandex-opportunity-map__badges">
                <span class="yandex-opportunity-map__badge">
                    ${escapeHtml(formatLabel)}
                </span>

                <span class="yandex-opportunity-map__badge yandex-opportunity-map__badge--salary">
                    ${escapeHtml(salary)}
                </span>
            </div>

            ${tags ? `<div class="yandex-opportunity-map__tags">${tags}</div>` : ''}
        </div>
    `
}

export default function YandexOpportunityMap({
                                                 points,
                                                 favoriteCompanies,
                                                 focusedOpportunityId,
                                                 onOpenCard,
                                                 onCenterChange,
                                             }) {
    const rootRef = useRef(null)
    const mapRef = useRef(null)
    const ymapsRef = useRef(null)
    const placemarksRef = useRef(new Map())
    const focusRetryRef = useRef(null)
    const resizeObserverRef = useRef(null)
    const suppressCenterEventRef = useRef(false)
    const lastPointsSignatureRef = useRef('')
    const onOpenCardRef = useRef(onOpenCard)
    const onCenterChangeRef = useRef(onCenterChange)
    const didInitialFitRef = useRef(false)
    const [isTouchMode, setIsTouchMode] = useState(false)
    const [isMapReady, setIsMapReady] = useState(false)

    const center = useMemo(() => {
        const first = points.find((point) => point.latitude && point.longitude)
        if (!first) return [55.751244, 37.618423]
        return [first.latitude, first.longitude]
    }, [points])

    const pointsSignature = useMemo(() => {
        return points
            .filter((point) => point.latitude && point.longitude)
            .map((point) => `${point.id}:${point.latitude}:${point.longitude}`)
            .join('|')
    }, [points])

    const favoriteCompaniesSignature = useMemo(() => {
        return Array.from(favoriteCompanies).sort().join('|')
    }, [favoriteCompanies])

    useEffect(() => {
        onOpenCardRef.current = onOpenCard
        onCenterChangeRef.current = onCenterChange
    }, [onOpenCard, onCenterChange])

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined

        const mediaQuery = window.matchMedia('(hover: none), (pointer: coarse)')
        const updateTouchMode = () => setIsTouchMode(mediaQuery.matches)

        updateTouchMode()

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', updateTouchMode)
            return () => mediaQuery.removeEventListener('change', updateTouchMode)
        }

        mediaQuery.addListener(updateTouchMode)
        return () => mediaQuery.removeListener(updateTouchMode)
    }, [])

    useEffect(() => {
        let isDisposed = false

        async function initMap() {
            const ymaps = await loadYmaps()
            if (isDisposed || !rootRef.current) return
            ymapsRef.current = ymaps

            if (!mapRef.current) {
                mapRef.current = new ymaps.Map(rootRef.current, {
                    center,
                    zoom: 5,
                    controls: ['zoomControl', 'typeSelector', 'fullscreenControl'],
                })
            }
            setIsMapReady(true)

            const map = mapRef.current

            requestAnimationFrame(() => {
                map.container.fitToViewport()
            })

            if (!map.__centerChangeBound) {
                map.events.add('actionend', () => {
                    if (suppressCenterEventRef.current) return
                    if (!onCenterChangeRef.current) return

                    const currentCenter = map.getCenter()
                    if (!currentCenter || currentCenter.length < 2) return

                    onCenterChangeRef.current({
                        lat: currentCenter[0],
                        lng: currentCenter[1],
                    })
                })

                map.__centerChangeBound = true
            }
        }

        initMap().catch((error) =>
            console.error('[YandexOpportunityMap] init error', error)
        )

        return () => {
            isDisposed = true
            if (focusRetryRef.current) {
                clearTimeout(focusRetryRef.current)
            }
        }
    }, [center])

    useEffect(() => {
        const root = rootRef.current
        const map = mapRef.current
        if (!root || !map || typeof ResizeObserver === 'undefined') return

        const handleResize = () => {
            requestAnimationFrame(() => {
                map.container.fitToViewport()
            })
        }

        const observer = new ResizeObserver(() => {
            handleResize()
        })

        observer.observe(root)
        resizeObserverRef.current = observer

        return () => {
            observer.disconnect()
            resizeObserverRef.current = null
        }
    }, [isMapReady])

    useEffect(() => {
        const ymaps = ymapsRef.current
        const map = mapRef.current
        if (!isMapReady || !ymaps || !map) return

        map.geoObjects.removeAll()
        placemarksRef.current.clear()

        points
            .filter((point) => point.latitude && point.longitude)
            .forEach((point) => {
                const isFavorite = favoriteCompanies.has(point.companyName)
                const placemarkState = isTouchMode
                    ? {}
                    : {
                        balloonContentBody: buildBalloon(point),
                        hintContent: buildHint(point),
                    }

                const placemark = new ymaps.Placemark(
                    [point.latitude, point.longitude],
                    placemarkState,
                    {
                        iconLayout: 'default#imageWithContent',
                        iconImageHref: markerSvg(isFavorite ? '#f59f0a' : '#0f5f68'),
                        iconImageSize: [34, 44],
                        iconImageOffset: [-17, -44],
                        hasBalloon: !isTouchMode,
                        openBalloonOnClick: !isTouchMode,
                        hintOpenTimeout: isTouchMode ? 0 : 80,
                        hintCloseTimeout: 0,
                        hintFitPane: !isTouchMode,
                        hintOffset: [18, -12],
                        balloonMaxWidth: 340,
                        balloonPanelMaxMapArea: 0,
                        balloonAutoPan: !isTouchMode,
                        balloonAutoPanDuration: 300,
                        balloonAutoPanCheckZoomRange: true,
                        balloonAutoPanMargin: [40, 40, 40, 40],
                        balloonAutoPanUseMapMargin: true,
                        hideIconOnBalloonOpen: false,
                    }
                )

                placemark.events.add('click', () => {
                    onOpenCardRef.current?.(point.id)
                })

                map.geoObjects.add(placemark)
                placemarksRef.current.set(point.id, placemark)
            })

        const pointsChanged = lastPointsSignatureRef.current !== pointsSignature

        if (!focusedOpportunityId && (pointsChanged || !didInitialFitRef.current)) {
            if (map.geoObjects.getLength() > 0) {
                suppressCenterEventRef.current = true
                map.setBounds(map.geoObjects.getBounds(), {
                    checkZoomRange: true,
                    zoomMargin: 40,
                })

                setTimeout(() => {
                    suppressCenterEventRef.current = false
                }, 300)
            } else if (!didInitialFitRef.current) {
                suppressCenterEventRef.current = true
                map.setCenter(center, 5)

                setTimeout(() => {
                    suppressCenterEventRef.current = false
                }, 300)
            }

            didInitialFitRef.current = true
            lastPointsSignatureRef.current = pointsSignature
        }

        map.container.fitToViewport()
    }, [center, favoriteCompanies, favoriteCompaniesSignature, focusedOpportunityId, isMapReady, isTouchMode, points, pointsSignature])

    useEffect(() => {
        if (!focusedOpportunityId || !mapRef.current) return

        const tryFocus = (attempt = 0) => {
            const map = mapRef.current
            const placemark = placemarksRef.current.get(focusedOpportunityId)

            if (!map || !placemark) {
                if (attempt < 8) {
                    focusRetryRef.current = setTimeout(
                        () => tryFocus(attempt + 1),
                        120
                    )
                }
                return
            }

            try {
                map.container.fitToViewport()
                const coords = placemark.geometry.getCoordinates()

                suppressCenterEventRef.current = true
                map.setCenter(coords, 14, { duration: 350, checkZoomRange: true })

                setTimeout(() => {
                    suppressCenterEventRef.current = false
                }, 400)

                if (!isTouchMode) {
                    placemark.balloon.open()
                }
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
    }, [focusedOpportunityId, isTouchMode, points])

    return <div ref={rootRef} className="opportunities-page__map" />
}
