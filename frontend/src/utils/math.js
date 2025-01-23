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
