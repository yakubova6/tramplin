import { useMemo } from 'react'
import Input from '../Input'
import Label from '../Label'
import './Autocomplete.scss'

function Autocomplete({
                          label,
                          required = false,
                          value,
                          onChange,
                          suggestions,
                          isOpen,
                          onOpenChange,
                          activeIndex,
                          onActiveIndexChange,
                          inputRef,
                          placeholder,
                          error,
                          onSelect,
                          getSuggestionValue = (item) => typeof item === 'string' ? item : item.name,
                          getSuggestionKey = (item) => typeof item === 'string' ? item : item.id,
                      }) {
    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (!isOpen && suggestions.length > 0) {
                onOpenChange(true)
            }
            if (suggestions.length > 0) {
                const newIndex = activeIndex + 1
                if (newIndex < suggestions.length) {
                    onActiveIndexChange(newIndex)
                } else {
                    onActiveIndexChange(0)
                }
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (!isOpen && suggestions.length > 0) {
                onOpenChange(true)
            }
            if (suggestions.length > 0) {
                const newIndex = activeIndex - 1
                if (newIndex >= 0) {
                    onActiveIndexChange(newIndex)
                } else {
                    onActiveIndexChange(suggestions.length - 1)
                }
            }
        } else if (event.key === 'Enter' && isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
            event.preventDefault()
            onSelect(suggestions[activeIndex])
            onOpenChange(false)
            onActiveIndexChange(-1)
        } else if (event.key === 'Escape') {
            onOpenChange(false)
            onActiveIndexChange(-1)
        }
    }

    const uniqueSuggestions = useMemo(() => {
        const seen = new Set()
        return suggestions.filter(item => {
            const name = getSuggestionValue(item)
            if (seen.has(name)) return false
            seen.add(name)
            return true
        })
    }, [suggestions, getSuggestionValue])

    return (
        <div className="autocomplete" ref={inputRef}>
            {label && (
                <Label>
                    {label}
                    {required && <span className="required-star"> *</span>}
                </Label>
            )}
            <div className="autocomplete__wrapper">
                <Input
                    value={value}
                    onFocus={() => {
                        if (uniqueSuggestions.length > 0) {
                            onOpenChange(true)
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => {
                        onChange(e.target.value)
                        onOpenChange(true)
                        onActiveIndexChange(-1)
                    }}
                    placeholder={placeholder}
                />
                {isOpen && uniqueSuggestions.length > 0 && (
                    <div className="autocomplete__list" role="listbox">
                        {uniqueSuggestions.map((item, index) => {
                            const displayName = getSuggestionValue(item)
                            return (
                                <button
                                    key={getSuggestionKey(item)}
                                    type="button"
                                    className={`autocomplete__item ${activeIndex === index ? 'is-active' : ''}`}
                                    onMouseEnter={() => onActiveIndexChange(index)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        onSelect(item)
                                        onOpenChange(false)
                                        onActiveIndexChange(-1)
                                    }}
                                    title={displayName}
                                >
                                    {displayName}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
            {error && <p className="field-error">{error}</p>}
        </div>
    )
}

export default Autocomplete