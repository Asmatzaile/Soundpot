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
