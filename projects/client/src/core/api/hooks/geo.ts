import { useQuery } from "@tanstack/react-query";


export const useAddressesToGeoLocations = (addresses?: string[]) => {

	
	const promises = addresses?.map(address => 
		fetch(`https://api.geoapify.com/v1/geocode/search?text=${address}&apiKey=${import.meta.env.VITE_GEOAPIFY_API_KEY}`)
			.then(res => res.json())
	);

	return useQuery<Array<GeoApiResult>>({
		enabled: !!addresses,
		queryKey: [`geo-subjects-${addresses!.join('-')}`],
		queryFn: () => Promise.all(promises!),
	});
};

type GeoApiResult = {
  type: string
  features: Array<{
    type: string
    properties: {
      datasource: {
        sourcename: string
        attribution: string
        license: string
        url: string
      }
      name?: string
      country?: string
      country_code?: string
      state?: string
      county?: string
      city?: string
      postcode?: string
      district?: string
      street?: string
      lon: number
      lat: number
      result_type: string
      formatted: string
      address_line1: string
      address_line2: string
      timezone: {
        name: string
        offset_STD: string
        offset_STD_seconds: number
        offset_DST: string
        offset_DST_seconds: number
        abbreviation_STD: string
        abbreviation_DST: string
      }
      plus_code: string
      plus_code_short?: string
      rank: {
        importance?: number
        popularity: number
        confidence: number
        confidence_city_level: number
        confidence_street_level?: number
        match_type: string
      }
      place_id: string
      suburb?: string
    }
    geometry: {
      type: string
      coordinates: Array<number>
    }
    bbox: Array<number>
  }>
  query: {
    text: string
    parsed: {
      housenumber: string
      street: string
      city: string
      expected_type: string
    }
  }
}
