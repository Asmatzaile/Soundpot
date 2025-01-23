export const dispatchPointerEvent = (target, e) => {
    const clonedEvent = new PointerEvent(e.type, {
    bubbles: e.bubbles,
    cancelable: e.cancelable,
    composed: e.composed,
    details: e.detail,
    clientX: e.clientX,
    clientY: e.clientY,
    button: e.button,
    buttons: e.buttons,
    isPrimary: e.isPrimary,
    pointerId: e.pointerId,
    pointerType: e.pointerType,
    pressure: e.pressure,
    })
    target.dispatchEvent(clonedEvent);
}

export const getElementCenter = (element) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return {x: centerX, y: centerY}
}

export const isSelectorInPoint = (selector, {x, y}) => {
    const elems = document.elementsFromPoint(x, y) // thanks https://github.com/pmndrs/use-gesture/issues/88#issuecomment-1154734405
    return elems && elems.some(elem=>elem.matches(selector));
}
