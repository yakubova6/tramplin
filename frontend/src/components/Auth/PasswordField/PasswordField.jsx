import { useState } from 'react'
import Input from '../../Input'
import Label from '../../Label'
import eyeIcon from '../../../assets/icons/eye.svg'
import eyeOffIcon from '../../../assets/icons/eye-off.svg'
import './PasswordField.scss'

function PasswordField({
                           id = 'password',
                           name = 'password',
                           label = 'Пароль',
                           placeholder = 'Введите пароль',
                           value,
                           onChange,
                           required = false,
                       }) {
    const [isVisible, setIsVisible] = useState(false)

    return (
        <div className="password-field">
            <Label htmlFor={id}>{label}</Label>

            <div className="password-field__control">
                <Input
                    id={id}
                    name={name}
                    type={isVisible ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    required={required}
                    className="password-field__input"
                />

                <button
                    type="button"
                    className="password-field__toggle"
                    onClick={() => setIsVisible((prev) => !prev)}
                    aria-label={isVisible ? 'Скрыть пароль' : 'Показать пароль'}
                >
                    <img
                        src={isVisible ? eyeIcon : eyeOffIcon}
                        alt=""
                        aria-hidden="true"
                        className="password-field__toggle-icon"
                    />
                </button>
            </div>
        </div>
    )
}

export default PasswordField