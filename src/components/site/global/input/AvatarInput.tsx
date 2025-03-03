import { type ActionError, actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import { Memo, Reactive, Show, useObservable } from '@legendapp/state/react';
import { useRef } from 'react';

/**
 * AvatarInput component
 * Wrapper around an input to change the avatar
 * @param {React.ReactNode} props.children - The children of the component
 * @returns {React.ReactNode} The AvatarInput component
 */
export default ({ children }: { children: React.ReactNode }) => {
	const isLoading = useObservable(false);
	const errorMessage = useObservable<ActionError | Error | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const labelClass = () =>
		`btn fit tertiary relative ${isLoading.get() ? 'opacity-50 !pointer-events-none' : 'opacity-100'}`;

	const dotsClass = () =>
		`absolute inset-0 z-10 after:z-[-1] after:absolute after:inset-0 after:bg-black flex justify-center items-center space-x-2 transition-opacity after:transition-opacity ${isLoading.get() ? 'opacity-100 after:opacity-30' : 'opacity-0 after:opacity-0'}`;

	/**
	 * Handle the change event of the input and submit the form
	 */
	const handleChange = async () => {
		isLoading.set(true);

		const input = inputRef.current;
		if (!input || !input.files?.[0]) {
			isLoading.set(false);
			return;
		}

		try {
			const file = input.files[0];
			const formData = new FormData();
			formData.append('avatar', file);

			const response = await actions.user.updateAvatar(formData);

			if (response.error) errorMessage.set(response.error);
			else navigate(window.location.href);
		} catch (error) {
			errorMessage.set(error as ActionError | Error);
		} finally {
			isLoading.set(false);
		}
	};

	return (
		<div className='flex flex-wrap items-center gap-6'>
			<div className='relative rounded-full overflow-hidden'>
				{children}
				<Reactive.span $className={dotsClass}>
					{[0, 0.175, 0.35].map(delay => (
						<span
							key={`loading-dot-${delay}`}
							className='inline-block w-1.5 h-1.5 bg-white rounded-full animate-bounce duration-700 transition-discrete'
							style={{ animationDelay: `${delay}s` }}
						/>
					))}
				</Reactive.span>
			</div>

			<Reactive.label htmlFor='avatar' $className={labelClass}>
				<Memo>
					{() => (isLoading.get() ? 'En cours de chargement...' : 'Changer l’image de profil')}
				</Memo>
				<input
					type='file'
					id='avatar'
					name='avatar'
					className='opacity-0 absolute inset-0 -z-10'
					onChange={handleChange}
					ref={inputRef}
				/>
			</Reactive.label>
			<Show if={errorMessage}>
				{() => <p className='text-red text-sm'>{errorMessage.get()?.message}</p>}
			</Show>
		</div>
	);
};
