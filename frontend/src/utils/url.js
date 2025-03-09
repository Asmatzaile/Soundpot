export const addParamsToUrl = (urlString, paramsObject) => {
    const url = new URL(urlString);
    url.search = new URLSearchParams({...Object.fromEntries(url.searchParams.entries()), ...paramsObject});
    return url.toString();    
}

export const getParamsFromUrl = urlString => {
    const url = new URL(urlString);
    return Object.fromEntries(url.searchParams.entries());
}
