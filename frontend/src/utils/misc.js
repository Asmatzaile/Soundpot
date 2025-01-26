const borderColorNames = ['border-red-400', 'border-orange-400', 'border-amber-400', 'border-yellow-400', 'border-lime-400', 'border-green-400', 'border-emerald-400', 'border-teal-400', 'border-cyan-400', 'border-sky-400', 'border-blue-400', 'border-indigo-400', 'border-violet-400', 'border-purple-400', 'border-fuchsia-400', 'border-pink-400', 'border-rose-400'];

export const getBorderColor = (soundName) => {
    if (soundName === undefined) return undefined;
    return borderColorNames[getUnicodeSum(soundName)%borderColorNames.length];
}

const getUnicodeSum = (string) => {
    return Array.from(string).reduce((sum, char) => sum + char.codePointAt(0), 0)
}
