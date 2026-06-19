import { Memo, Reactive, Show, useObservable } from '@legendapp/state/react';
import { type ActionError, actions } from 'astro:actions';
import { useEffect, useRef } from 'react';

/**
 * AvatarInput component
 * Wrapper around an input to change the avatar, with optimistic UI preview.
 * On success the preview URL is retained; on error it reverts to the previous avatar.
 * @param {React.ReactNode} props.children - The server-rendered avatar (Astro island child)
 * @returns {React.ReactNode} The AvatarInput component
 */
export default ({ children }: { children: React.ReactNode }) => {
	const isLoading = useObservable(false);
	const errorMessage = useObservable<ActionError | Error | null>(null);
	// Holds the object URL for the optimistic preview; null means show the server-rendered child.
	const optimisticUrl = useObservable<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Revoke stale object URLs when the component unmounts or when the URL changes.
	useEffect(() => {
		return () => {
			const url = optimisticUrl.peek();
			if (url) URL.revokeObjectURL(url);
		};
	}, [optimisticUrl]);

	const labelClass = () =>
		`btn fit tertiary relative ${isLoading.get() ? 'opacity-50 !pointer-events-none' : 'opacity-100'}`;

	const dotsClass = () =>
		`absolute inset-0 z-10 after:z-[-1] after:absolute after:inset-0 after:bg-black flex justify-center items-center space-x-2 transition-opacity after:transition-opacity ${isLoading.get() ? 'opacity-100 after:opacity-30' : 'opacity-0 after:opacity-0'}`;

	/**
	 * Handle the change event of the input and submit the form.
	 * Shows an optimistic preview immediately; rolls back on error.
	 */
	const handleChange = async () => {
		isLoading.set(true);
		errorMessage.set(null);

		const input = inputRef.current;
		if (!input || !input.files?.[0]) {
			isLoading.set(false);
			return;
		}

		const file = input.files[0];

		// Optimistically preview the selected file before the upload completes.
		const previousUrl = optimisticUrl.peek();
		const previewUrl = URL.createObjectURL(file);
		optimisticUrl.set(previewUrl);

		const formData = new FormData();
		formData.append('avatar', file);

		try {
			const response = await actions.user.updateAvatar(formData);

			if (response.error) {
				// Rollback: discard the optimistic preview and restore the previous state.
				URL.revokeObjectURL(previewUrl);
				optimisticUrl.set(previousUrl);
				errorMessage.set(response.error);
			} else {
				// Confirm: release the previous object URL (the new one is now the truth).
				if (previousUrl) URL.revokeObjectURL(previousUrl);
			}
		} catch (error) {
			URL.revokeObjectURL(previewUrl);
			optimisticUrl.set(previousUrl);
			errorMessage.set(error as ActionError | Error);
		} finally {
			isLoading.set(false);
		}
	};

	return (
		<div className='flex flex-wrap items-center gap-6'>
			<div className='relative overflow-hidden rounded-full'>
				{/* Show the optimistic preview when available, otherwise fall back to the server-rendered child. */}
				<Show if={optimisticUrl} else={children}>
					{() => (
						<img
							src={optimisticUrl.get() ?? ''}
							alt="Avatar de l'utilisateur"
							className='h-36 w-36 object-cover'
						/>
					)}
				</Show>
				<Reactive.span $className={dotsClass}>
					{[0, 0.175, 0.35].map((delay) => (
						<span
							key={`loading-dot-${delay}`}
							className='inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white transition-discrete duration-700'
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
					className='absolute inset-0 -z-10 opacity-0'
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
