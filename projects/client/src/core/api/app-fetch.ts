
type ErrorResponse = {
	message: string | string[];
	statusCode: string;

}

export const appFetch = async <T = any>(url: string, options?: Parameters<typeof fetch>[1]) => {
	
	if (!url.startsWith('/')) url = `/${url}`;
	url = import.meta.env.VITE_SERVER_ENDPOINT + url;

	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${localStorage.getItem('__JWT__')}`,
			...options?.headers
		}
	})
	const data: T & ErrorResponse = await response.json()

	return data
}