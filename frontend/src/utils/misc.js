const textColorNames = ['text-red-400', 'text-orange-400', 'text-amber-400', 'text-yellow-400', 'text-lime-400', 'text-green-400', 'text-emerald-400', 'text-teal-400', 'text-cyan-400', 'text-sky-400', 'text-blue-400', 'text-indigo-400', 'text-violet-400', 'text-purple-400', 'text-fuchsia-400', 'text-pink-400', 'text-rose-400'];

export const getSoundColor = (soundName) => {
    if (soundName === undefined) return undefined;
    return textColorNames[getUnicodeSum(soundName)%textColorNames.length];
}

const getUnicodeSum = (string) => {
    return Array.from(string).reduce((sum, char) => sum + char.codePointAt(0), 0)
}

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
