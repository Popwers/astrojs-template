import { prepareAvatar } from '@data/imageCompression';
import { AVATAR_INPUT_ACCEPT } from '@data/userOptions';
import { cn } from '@lib/utils';
import { type ActionError, actions } from 'astro:actions';
import { useEffect, useRef, useState } from 'react';

type AvatarStatus = 'idle' | 'preparing' | 'uploading';

const LOADING_DOT_CLASSES = ['delay-bounce-0', 'delay-bounce-1', 'delay-bounce-2'] as const;

/**
 * AvatarInput component
 * Wrapper around an input to change the avatar, with optimistic UI preview.
 * Compresses (and HEIC-decodes) the file client-side before uploading.
 * On success the preview URL is retained; on error it reverts to the previous avatar.
 * @param props.children - The server-rendered avatar (Astro island child)
 * @returns The AvatarInput component
 */
export default ({ children }: { children: React.ReactNode }) => {
	const [status, setStatus] = useState<AvatarStatus>('idle');
	const [errorMessage, setErrorMessage] = useState<ActionError | Error | null>(null);
	// Holds the file behind the optimistic preview; null means show the server-rendered child.
	const [previewFile, setPreviewFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const isPreparing = status === 'preparing';
	const isBusy = status !== 'idle';

	// The object URL lives and dies with the file it previews: React revokes it on change and unmount.
	useEffect(() => {
		if (!previewFile) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(previewFile);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [previewFile]);

	const labelClass = cn(
		'btn relative fit tertiary',
		isBusy ? 'pointer-events-none opacity-50' : 'opacity-100',
	);

	const dotsClass = cn(
		'absolute inset-0 z-10 flex items-center justify-center space-x-2 transition-opacity after:absolute after:inset-0 after:-z-10 after:bg-black after:transition-opacity',
		isBusy ? 'opacity-100 after:opacity-30' : 'opacity-0 after:opacity-0',
	);

	/**
	 * Handle the change event of the input.
	 * Phase 1 — decode + compress (may take a moment for HEIC originals).
	 * Phase 2 — upload the prepared file with an optimistic preview; rolls back on error.
	 */
	const handleChange = async () => {
		const input = inputRef.current;
		if (!input || !input.files?.[0]) return;

		const rawFile = input.files[0];
		setErrorMessage(null);

		// Phase 1: decode HEIC and compress. The control is disabled but no preview yet.
		setStatus('preparing');
		const { file, error: prepareError } = await prepareAvatar(rawFile);

		if (!file || prepareError) {
			setStatus('idle');
			setErrorMessage(new Error(prepareError ?? 'Erreur lors de la préparation du fichier.'));
			return;
		}

		// Phase 2: upload the prepared file with an optimistic preview.
		setStatus('uploading');

		const previousFile = previewFile;
		setPreviewFile(file);

		const formData = new FormData();
		formData.append('avatar', file);

		try {
			const response = await actions.user.updateAvatar(formData);

			if (response.error) {
				// Rollback: restore the previous preview.
				setPreviewFile(previousFile);
				setErrorMessage(response.error);
			}
		} catch (error) {
			setPreviewFile(previousFile);
			setErrorMessage(error instanceof Error ? error : new Error(String(error)));
		} finally {
			setStatus('idle');
		}
	};

	return (
		<div className='flex flex-wrap items-center gap-6'>
			<div className='relative overflow-hidden rounded-full'>
				{/* Show the optimistic preview when available, otherwise fall back to the server-rendered child. */}
				{previewUrl ? (
					<img
						src={previewUrl}
						alt="Avatar de l'utilisateur"
						className='h-36 w-36 object-cover'
						width={144}
						height={144}
						decoding='async'
					/>
				) : (
					children
				)}
				<span className={dotsClass}>
					{LOADING_DOT_CLASSES.map((delayClass) => (
						<span
							key={`loading-dot-${delayClass}`}
							className={cn(
								'inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white transition-discrete duration-700',
								delayClass,
							)}
						/>
					))}
				</span>
			</div>

			<label htmlFor='avatar' className={labelClass}>
				{isPreparing ? (
					<span className='flex items-center gap-2'>
						<span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
						Préparation...
					</span>
				) : isBusy ? (
					'En cours de chargement...'
				) : (
					'Changer l’image de profil'
				)}
				<input
					type='file'
					id='avatar'
					name='avatar'
					aria-label='Changer l’image de profil'
					accept={AVATAR_INPUT_ACCEPT}
					className='absolute inset-0 -z-10 opacity-0'
					onChange={handleChange}
					ref={inputRef}
				/>
			</label>
			{errorMessage && <p className='text-red text-sm'>{errorMessage.message}</p>}
		</div>
	);
};
