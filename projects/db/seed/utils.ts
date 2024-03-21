export const arrayOf = <T>(amout: number, fakeModelMaker: () => T) => {
	return new Array(amout).fill(0)
		.map(fakeModelMaker)
}
