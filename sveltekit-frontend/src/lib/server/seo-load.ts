export async function withSeoTimeout<T>(task: Promise<T>, fallback: T, timeoutMs = 5000): Promise<T> {
	let timeout: ReturnType<typeof setTimeout>;
	const timeoutPromise = new Promise<T>((resolve) => {
		timeout = setTimeout(() => resolve(fallback), timeoutMs);
	});

	try {
		return await Promise.race([task, timeoutPromise]);
	} finally {
		clearTimeout(timeout!);
	}
}
