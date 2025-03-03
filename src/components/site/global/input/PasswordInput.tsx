import { Reactive, useObservable } from '@legendapp/state/react';

import eye_icon from '@assets/icons/eye.svg';
import eye_close_icon from '@assets/icons/eye_close.svg';

interface PasswordInputProps {
	id: string;
	label: string;
	placeholder: string;
	autocomplete: string;
	name: string;
	dynamicClassName?: () => string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	props?: React.ComponentProps<typeof Reactive.input>;
}

/**
 * Password input component used to input a password
 */
export default ({
	id,
	autocomplete,
	name,
	label,
	onChange,
	placeholder,
	dynamicClassName,
	props,
}: PasswordInputProps) => {
	const isPasswordVisible = useObservable(false);
	const typeToShow = () => (isPasswordVisible.get() ? 'text' : 'password');
	const imgToShow = () => (isPasswordVisible.get() ? eye_close_icon.src : eye_icon.src);

	return (
		<div className='form-group'>
			<label htmlFor={id}>{label} </label>
			<div className='relative'>
				<Reactive.input
					id={id}
					$type={typeToShow}
					autoComplete={autocomplete}
					placeholder={placeholder}
					name={name}
					onChange={onChange}
					$className={dynamicClassName}
					required
					{...props}
				/>
				<Reactive.img
					onClick={() => isPasswordVisible.toggle()}
					$src={imgToShow}
					alt='Voir le mot de passe'
					className='absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 cursor-pointer'
				/>
			</div>
		</div>
	);
};
