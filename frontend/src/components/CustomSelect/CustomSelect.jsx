import { useEffect, useRef, useState } from 'react'
import Label from '../Label'
import './CustomSelect.scss'

function CustomSelect({
                          label,
                          value,
                          onChange,
                          options,
                          placeholder = 'Выберите',
                          error,
                          required = false,
                      }) {
    const [isOpen, setIsOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const rootRef = useRef(null)

    const selected = options.find((o) => o.value === value)

    useEffect(() => {
        const onDocClick = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setIsOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (!isOpen) setIsOpen(true)
            setActiveIndex((prev) => (prev + 1) % options.length)
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (!isOpen) setIsOpen(true)
            setActiveIndex((prev) => (prev <= 0 ? options.length - 1 : prev - 1))
        } else if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
            event.preventDefault()
            onChange(options[activeIndex].value)
            setIsOpen(false)
        } else if (event.key === 'Escape') {
            setIsOpen(false)
        }
    }

    const displayText = selected?.label || placeholder
    const truncatedText = displayText.length > 40 ? displayText.slice(0, 37) + '...' : displayText

    return (
        <div className="custom-select" ref={rootRef}>
            {label && (
                <Label>
                    {label}
                    {required && <span className="required-star"> *</span>}
                </Label>
            )}
            <div className="custom-select__wrapper">
                <button
                    type="button"
                    className={`custom-select__button ${error ? 'is-error' : ''}`}
                    onClick={() => setIsOpen((v) => !v)}
                    onKeyDown={handleKeyDown}
                    aria-expanded={isOpen}
                    title={displayText}
                >
                    <span className="custom-select__text">{truncatedText}</span>
                    <span className={`custom-select__arrow ${isOpen ? 'is-open' : ''}`}>▾</span>
                </button>
                {isOpen && (
                    <div className="custom-select__menu" role="listbox">
                        {options.map((option, idx) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`custom-select__item ${
                                    value === option.value ? 'is-selected' : ''
                                } ${idx === activeIndex ? 'is-active' : ''}`}
                                onMouseEnter={() => setActiveIndex(idx)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onChange(option.value)
                                    setIsOpen(false)
                                }}
                                title={option.label}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {error && <p className="field-error">{error}</p>}
        </div>
    )
}

export default CustomSelect