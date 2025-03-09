// https://www.jeffreythompson.org/collision-detection/circle-circle.php
export const doCirclesCollide = (c1x, c1y, c1r, c2x, c2y, c2r) => {
const dx = c2x - c1x;
const dy = c2y - c1y;
const d = Math.sqrt(dx*dx + dy*dy);
return d <= c1r + c2r;
}

export const isCircleInCircle = (c1x, c1y, c1r, c2x, c2y, c2r) => {
const dx = c2x - c1x;
const dy = c2y - c1y;
const d = Math.sqrt(dx*dx + dy*dy);
return d < Math.abs(c2r-c1r);
}

export const resampleArray = (array, newLength) => {
    const sliceStarts = euclidAbsolute(newLength, array.length);
    const slices = sliceStarts.map((sliceStart, index) => {
        const sliceData = array.slice(sliceStart, sliceStarts[index+1]??array.length);
        return Math.max(...sliceData.map(Math.abs));
    })
    return slices;
}

export const subgroupArray = (array, groupLen=1) => {
    return array.reduce((acc, cur, i) =>  i % groupLen === 0 ? [...acc, [cur]] : [...acc.slice(0, -1), [...acc[acc.length - 1], cur]], [])
}

const euclidAbsolute = (pulses, steps) => {
    if (pulses > steps) throw new Error(`More pulses (${pulses}) than steps (${steps})!`);

    const bjorklundArray = Array(steps);
	let lastTruncated = 0;
	for (let i = 1; i <= steps; i++) {
		const truncatedValue = Math.floor((i * pulses)/steps);
		const bjorklundValue = truncatedValue - lastTruncated;
		lastTruncated = truncatedValue;

		const index = (i==steps) ? 0 : i;	// puts the last element first
		bjorklundArray[index] = bjorklundValue;
	}

    return bjorklundArray.map((value, index)=>value == 1 ? value*index : undefined).filter(item=>item!==undefined);
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const randInt = (max, min=0) => Math.floor(Math.random() * (max - min)) + min;
