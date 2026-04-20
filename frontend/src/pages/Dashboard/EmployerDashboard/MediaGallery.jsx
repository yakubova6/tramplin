import { useState, useRef, useEffect, useCallback } from 'react'
import { uploadOpportunityMedia, deleteOpportunityMedia } from '@/api/opportunities'
import { useToast } from '@/hooks/use-toast'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

function MediaGallery({ opportunityId, media = [], onMediaUpdate }) {
    const { toast } = useToast()
    const [uploading, setUploading] = useState(false)
    const [items, setItems] = useState([])
    const fileInputRef = useRef(null)

    const resetFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const truncateFileName = (name, maxLength = 18) => {
        if (!name) return 'файл'
        if (name.length <= maxLength) return name

        const lastDotIndex = name.lastIndexOf('.')

        if (lastDotIndex <= 0) {
            return `${name.slice(0, maxLength - 3)}...`
        }

        const ext = name.slice(lastDotIndex + 1)
        const nameWithoutExt = name.slice(0, lastDotIndex)
        const availableLength = Math.max(1, maxLength - 3 - ext.length)

        return `${nameWithoutExt.slice(0, availableLength)}...${ext}`
    }

    const createLocalPreview = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(file)
        })
    }

    const mapMediaItem = useCallback((item, previousItems = []) => {
        const attachmentId = item?.attachmentId ?? item?.id ?? null
        const fileId = item?.fileId ?? item?.file?.fileId ?? null
        const originalFileName = item?.originalFileName ?? item?.file?.originalFileName ?? ''
        const mediaType = item?.mediaType ?? item?.file?.mediaType ?? ''
        const downloadUrl = item?.downloadUrl ?? null

        const previousItem = previousItems.find((prevItem) => (
            (attachmentId && prevItem.attachmentId === attachmentId)
            || (fileId && prevItem.fileId === fileId)
            || (originalFileName && prevItem.originalFileName === originalFileName)
        ))

        return {
            id: attachmentId || fileId || `server_${originalFileName}_${Math.random()}`,
            attachmentId,
            originalFileName,
            mediaType,
            fileId,
            downloadUrl,
            isServer: true,
            isPending: false,
            previewUrl: previousItem?.previewUrl || null,
        }
    }, [])

    const mapMediaList = useCallback((mediaList, previousItems = []) => {
        return (Array.isArray(mediaList) ? mediaList : []).map((item) =>
            mapMediaItem(item, previousItems)
        )
    }, [mapMediaItem])

    useEffect(() => {
        setItems((prevItems) => mapMediaList(media, prevItems))
    }, [media, mapMediaList])

    const getImageUrl = (item) => {
        if (item.downloadUrl) return item.downloadUrl
        if (item.previewUrl) return item.previewUrl
        if (item.fileId) return `/api/files/${item.fileId}/download`
        return null
    }

    const handleUpload = async (files) => {
        if (!files || files.length === 0) return

        const fileArray = Array.from(files)

        for (const file of fileArray) {
            const isValidMime = ALLOWED_MIME_TYPES.includes(file.type)
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
            const isValidExtension = ALLOWED_EXTENSIONS.includes(fileExtension)

            if (!isValidMime && !isValidExtension) {
                toast({
                    title: 'Неподдерживаемый формат',
                    description: `${file.name}: поддерживаются только JPG, PNG и WEBP`,
                    variant: 'destructive',
                })
                resetFileInput()
                return
            }
        }

        setUploading(true)

        try {
            for (const file of fileArray) {
                const previewUrl = await createLocalPreview(file)
                const tempId = `temp_${Date.now()}_${Math.random()}`

                const tempItem = {
                    id: tempId,
                    attachmentId: null,
                    originalFileName: file.name,
                    mediaType: file.type,
                    fileId: null,
                    downloadUrl: null,
                    isServer: false,
                    isPending: true,
                    previewUrl,
                }

                setItems((prev) => [...prev, tempItem])

                try {
                    const updatedMedia = await uploadOpportunityMedia(opportunityId, file)

                    setItems((prev) => {
                        const withoutTemp = prev.filter((item) => item.id !== tempId)
                        const previousItems = [
                            ...withoutTemp,
                            {
                                attachmentId: null,
                                fileId: null,
                                originalFileName: file.name,
                                previewUrl,
                            },
                        ]

                        return mapMediaList(updatedMedia, previousItems)
                    })

                    onMediaUpdate?.(updatedMedia)

                    toast({
                        title: 'Файл загружен',
                        description: `${file.name} успешно добавлен`,
                    })
                } catch (error) {
                    setItems((prev) => prev.filter((item) => item.id !== tempId))

                    let errorMessage = error.message || 'Не удалось загрузить файл'

                    if (error.status === 400) {
                        errorMessage = 'Неподдерживаемый формат файла. Загружайте JPG, PNG или WEBP.'
                    } else if (error.status === 409) {
                        errorMessage = 'Нельзя изменять медиафайлы у публикации на модерации.'
                    } else if (error.status === 500) {
                        errorMessage = 'Ошибка сервера. Попробуйте позже.'
                    }

                    toast({
                        title: 'Ошибка загрузки',
                        description: errorMessage,
                        variant: 'destructive',
                    })
                }
            }
        } finally {
            setUploading(false)
            resetFileInput()
        }
    }

    const handleDelete = useCallback(async (item) => {
        const fileName = truncateFileName(item.originalFileName)

        if (!window.confirm(`Удалить файл "${fileName}"?`)) return

        if (!item.isServer || !item.attachmentId) {
            setItems((prev) => prev.filter((i) => i.id !== item.id))
            toast({
                title: 'Файл удалён',
                description: `${fileName} удалён`,
            })
            return
        }

        try {
            const previousItems = items.filter((prevItem) => prevItem.attachmentId !== item.attachmentId)
            const updatedMedia = await deleteOpportunityMedia(opportunityId, item.attachmentId)
            const mappedItems = mapMediaList(updatedMedia, previousItems)

            setItems(mappedItems)
            onMediaUpdate?.(updatedMedia)

            toast({
                title: 'Файл удалён',
                description: `${fileName} удалён из публикации`,
            })
        } catch (error) {
            toast({
                title: 'Ошибка удаления',
                description: error.message || 'Не удалось удалить файл',
                variant: 'destructive',
            })
        }
    }, [items, opportunityId, onMediaUpdate, toast, mapMediaList])

    const renderPreview = (item) => {
        const imageUrl = getImageUrl(item)
        const fileName = truncateFileName(item.originalFileName)
        const isImage = item.mediaType?.startsWith('image/')

        if (isImage && imageUrl) {
            return (
                <img
                    src={imageUrl}
                    alt={fileName}
                    className="media-gallery__preview-image"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none'
                    }}
                />
            )
        }

        return (
            <div className="media-gallery__file-preview">
                <svg
                    className="media-gallery__file-icon"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                >
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                </svg>
                <span className="media-gallery__file-name">{fileName}</span>
            </div>
        )
    }

    return (
        <div className="media-gallery">
            <div className="media-gallery__upload">
                <label className="media-gallery__upload-label">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleUpload(e.target.files)}
                        disabled={uploading}
                        className="media-gallery__upload-input"
                    />
                    <span className="media-gallery__upload-button">
                        {uploading ? 'Загрузка...' : '+ Добавить медиафайлы'}
                    </span>
                </label>

                <p className="media-gallery__hint">
                    Поддерживаются форматы: JPG, PNG, WEBP. Можно загрузить несколько файлов.
                </p>
            </div>

            {items.length > 0 && (
                <div className="media-gallery__grid">
                    {items.map((item) => (
                        <div key={item.id} className="media-gallery__item">
                            {renderPreview(item)}

                            <button
                                type="button"
                                className="media-gallery__delete"
                                onClick={() => handleDelete(item)}
                                aria-label="Удалить"
                                disabled={item.isPending}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default MediaGallery