import { Reactive, useObservable, useSelector } from '@legendapp/state/react';

import PasswordInput from './PasswordInput.tsx';

interface PasswordCheckerProps {
	isNewPassword?: boolean;
}

/**
 * Password checker component used to check the strength of a password
 * @param {boolean} props.isNewPassword - If the password is for a new account or a reset password
 * @returns {React.ReactNode} - The password checker component
 */
export default ({ isNewPassword = false }: PasswordCheckerProps) => {
	const password = useObservable('');
	const passwordConfirmation = useObservable('');

	const strength = useSelector(() => ({
		size: () => password.get().length >= 8,
		uppercase: () => /[A-Z]/.test(password.get()),
		lowercase: () => /[a-z]/.test(password.get()),
		number: () => /[0-9]/.test(password.get()),
		special: () => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password.get()),
		value: () => {
			let value = 0;
			if (strength.size()) value += 20;
			if (strength.uppercase()) value += 20;
			if (strength.lowercase()) value += 20;
			if (strength.number()) value += 20;
			if (strength.special()) value += 20;
			return value;
		},
		className: () => {
			if (strength.value() <= 20) return 'bg-red';
			if (strength.value() <= 40) return 'bg-orange-500';
			if (strength.value() <= 60) return 'bg-yellow-500';
			if (strength.value() <= 80) return 'bg-blue';
			return 'bg-green';
		},
	}));

	const progressBarClass = () => `${strength.className()} h-2.5 rounded-full transition-all duration-300`;
	const sizeCheck = () =>
		`transition-colors ${strength.size() ? 'text-green' : password.get() !== '' ? 'text-red' : ''}`;
	const uppercaseCheck = () =>
		`transition-colors ${strength.uppercase() ? 'text-green' : password.get() !== '' ? 'text-red' : ''}`;
	const lowercaseCheck = () =>
		`transition-colors ${strength.lowercase() ? 'text-green' : password.get() !== '' ? 'text-red' : ''}`;
	const numberCheck = () =>
		`transition-colors ${strength.number() ? 'text-green' : password.get() !== '' ? 'text-red' : ''}`;
	const specialCheck = () =>
		`transition-colors ${strength.special() ? 'text-green' : password.get() !== '' ? 'text-red' : ''}`;

	const checkPasswordConfirmation = () =>
		`${password.get() !== '' && passwordConfirmation.get() !== '' ? (password.get() !== passwordConfirmation.get() ? 'border-red focus:border-red' : 'border-green focus:border-green') : ''}`;

	return (
		<>
			<PasswordInput
				id='password'
				name='password'
				label={isNewPassword ? 'Nouveau mot de passe' : 'Mot de passe'}
				placeholder={isNewPassword ? 'Nouveau mot de passe' : 'Mot de passe'}
				autocomplete='new-password'
				onChange={e => {
					password.set(e.target.value);
				}}
			/>
			<PasswordInput
				label='Confirmer votre mot de passe'
				dynamicClassName={checkPasswordConfirmation}
				id='passwordConfirmation'
				name='passwordConfirmation'
				autocomplete='new-password'
				placeholder='Confirmer votre mot de passe'
				onChange={e => {
					passwordConfirmation.set(e.target.value);
				}}
			/>

			<div className='mt-4 w-full bg-blue-light rounded-full h-2.5'>
				<Reactive.div
					$className={progressBarClass}
					role='progressbar'
					$aria-valuenow={strength.value()}
					aria-valuemin={0}
					aria-valuemax={100}
					$style={() => ({ width: `${strength.value()}%` })}
				/>
			</div>

			<div className='form-group'>
				<p className='text-sm'>
					Votre mot de passe doit se composer au minimum de{' '}
					<Reactive.span $className={sizeCheck}>huit caractères</Reactive.span> et doit contenir au
					moins <Reactive.span $className={uppercaseCheck}>une majuscule</Reactive.span>,{' '}
					<Reactive.span $className={lowercaseCheck}>une minuscule</Reactive.span>,{' '}
					<Reactive.span $className={numberCheck}>un chiffre</Reactive.span> et{' '}
					<Reactive.span $className={specialCheck}>un caractère spécial</Reactive.span>.
				</p>
			</div>
		</>
	);
};
