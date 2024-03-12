import React from 'react';
import { Chain, Thunder, ZeusScalars } from './index';


export const scalars: any = ZeusScalars({
	timestamp: {
		decode: (e: unknown) => new Date(e as string),
		encode: (e: unknown) => {
			console.log('e: unknown = ', e, typeof e);

			if (e === '') {
				console.log('e === ""');

				return undefined;
			}
			return (e as Date)?.toISOString ? `"${(e as Date)?.toISOString()}"` : null;
		}
	},
	float8: {
		decode: (e: unknown) => parseFloat(e as string),
		encode: (e: unknown) => e as string
	},
	jsonb: {
		decode: (e: unknown) => JSON.parse(e as string),
		encode: (e: unknown) => removeQuotesFromKeys(JSON.stringify(e))
	}
});

const removeQuotesFromKeys = (stringifiedJson: string) => stringifiedJson.replace(/"([^"]+)":/g, '$1:');

// wait for the JWT to be set and stop after 10 seconds
const waitForJwt = new Promise<void>((resolve, reject) => {
	let count = 0;
	const interval = setInterval(() => {
		if (window.__JWT__) {
			clearInterval(interval);
			resolve();
		} else if (count >= 100) {
			clearInterval(interval);
			reject('JWT not set');
		}
		count++;
	}, 100);
});

export const chain = Thunder(async (query) => {
	if (!window.__JWT__)
		await waitForJwt;
	
	const response = await fetch(
		import.meta.env.VITE_HASURA_GQL_ENDPOINT,
		{
			body: JSON.stringify({ query }),
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${window.__JWT__}`,
			},
		},
	);

	if (!response.ok) {
		return new Promise((resolve, reject) => {
			response
				.text()
				.then((text) => {
					try {
						reject(JSON.parse(text));
					} catch (err) {
						reject(text);
					}
				})
				.catch(reject);
		});
	}

	const json = await response.json();

	return json.data;
});
